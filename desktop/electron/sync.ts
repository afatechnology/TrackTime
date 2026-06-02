import axios, { type AxiosInstance } from 'axios';
import type { TrackTimeDatabase } from './database';

export class SyncService {
  private client: AxiosInstance;

  constructor(
    private getBaseUrl: () => string,
    private getToken: () => string | null | undefined,
  ) {
    this.client = axios.create({ timeout: 30000 });
  }

  setToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common.Authorization;
    }
  }

  async sync(db: TrackTimeDatabase) {
    const base = this.getBaseUrl().replace(/\/$/, '');
    const token = this.getToken();
    if (!token) return { ok: false, message: 'Not logged in' };

    this.setToken(token);
    const config = db.getConfig();
    const since = config.last_sync_at ?? undefined;

    const payload = db.getUnsyncedPayload();
    const projects = payload.projects as Record<string, unknown>[];
    const timeEntries = payload.time_entries as Record<string, unknown>[];
    const pushBody = {
      projects: projects.map((p) => ({
        uuid: p.uuid,
        name: p.name,
        description: p.description,
        color: p.color,
        is_archived: Boolean(p.is_archived),
        client_name: p.client_name,
        hourly_rate: p.hourly_rate,
        deleted_at: p.deleted_at,
      })),
      time_entries: timeEntries.map((e) => ({
        uuid: e.uuid,
        project_uuid: e.project_uuid,
        started_at: e.started_at,
        ended_at: e.ended_at,
        status: e.status,
        notes: e.notes,
        task_title: e.task_title,
        deleted_at: e.deleted_at,
        segments: (e.segments as Record<string, unknown>[]).map((s) => ({
          uuid: s.uuid,
          started_at: s.started_at,
          ended_at: s.ended_at,
        })),
      })),
    };

    if (pushBody.projects.length || pushBody.time_entries.length) {
      await this.client.post(`${base}/sync/push`, pushBody);
    }

    const pullRes = await this.client.get(`${base}/sync/pull`, {
      params: since ? { since } : {},
    });

    this.mergePull(db, pullRes.data);
    const serverTime = pullRes.data.server_time as string;
    db.markSynced(serverTime);
    db.setConfig({ last_sync_at: serverTime });

    return { ok: true, message: 'Synced successfully', server_time: serverTime };
  }

  private mergePull(db: TrackTimeDatabase, data: { projects?: unknown[]; time_entries?: unknown[] }) {
    const database = db as unknown as {
      db: import('better-sqlite3').Database;
    };
    const sqlDb = database.db;

    for (const p of data.projects ?? []) {
      const row = p as Record<string, unknown>;
      const existing = sqlDb
        .prepare('SELECT updated_at FROM projects WHERE uuid = ?')
        .get(row.uuid as string) as { updated_at: string } | undefined;
      const remoteUpdated = (row.updated_at as string) ?? '';
      if (existing && existing.updated_at > remoteUpdated) continue;

      sqlDb
        .prepare(
          `INSERT INTO projects (uuid, name, description, color, is_archived, client_name, hourly_rate, server_id, synced_at, updated_at, deleted_at)
           VALUES (@uuid, @name, @description, @color, @is_archived, @client_name, @hourly_rate, @id, @synced_at, @updated_at, @deleted_at)
           ON CONFLICT(uuid) DO UPDATE SET
             name=excluded.name, description=excluded.description, color=excluded.color,
             is_archived=excluded.is_archived, client_name=excluded.client_name, hourly_rate=excluded.hourly_rate,
             server_id=excluded.server_id, synced_at=excluded.synced_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
        )
        .run({
          uuid: row.uuid,
          name: row.name,
          description: row.description ?? null,
          color: row.color ?? '#3b82f6',
          is_archived: row.is_archived ? 1 : 0,
          client_name: row.client_name ?? null,
          hourly_rate: row.hourly_rate ?? null,
          id: row.id,
          synced_at: new Date().toISOString(),
          updated_at: row.updated_at,
          deleted_at: row.deleted_at ?? null,
        });
    }

    for (const e of data.time_entries ?? []) {
      const row = e as Record<string, unknown>;
      const project = sqlDb
        .prepare('SELECT uuid FROM projects WHERE server_id = ? OR uuid = ?')
        .get(row.project_id, row.project_uuid ?? '') as { uuid: string } | undefined;
      const projectUuid =
        project?.uuid ??
        (sqlDb.prepare('SELECT uuid FROM projects WHERE server_id = ?').get(row.project_id) as
          | { uuid: string }
          | undefined)?.uuid;
      if (!projectUuid && row.project) {
        const proj = row.project as Record<string, unknown>;
        sqlDb
          .prepare(
            `INSERT OR IGNORE INTO projects (uuid, name, description, color, is_archived, client_name, hourly_rate, server_id, synced_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NULL)`,
          )
          .run(
            proj.uuid,
            proj.name,
            proj.description,
            proj.color ?? '#3b82f6',
            proj.client_name,
            proj.hourly_rate,
            proj.id,
            new Date().toISOString(),
            proj.updated_at,
          );
      }
      const resolvedProject = sqlDb
        .prepare('SELECT uuid FROM projects WHERE server_id = ?')
        .get(row.project_id) as { uuid: string } | undefined;
      if (!resolvedProject) continue;

      sqlDb
        .prepare(
          `INSERT INTO time_entries (uuid, project_uuid, started_at, ended_at, status, notes, task_title, server_id, synced_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(uuid) DO UPDATE SET
             project_uuid=excluded.project_uuid, started_at=excluded.started_at, ended_at=excluded.ended_at,
             status=excluded.status, notes=excluded.notes, task_title=excluded.task_title,
             server_id=excluded.server_id, synced_at=excluded.synced_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
        )
        .run(
          row.uuid,
          resolvedProject.uuid,
          row.started_at,
          row.ended_at,
          row.status,
          row.notes,
          row.task_title,
          row.id,
          new Date().toISOString(),
          row.updated_at,
          row.deleted_at ?? null,
        );

      for (const s of (row.segments as Record<string, unknown>[]) ?? []) {
        sqlDb
          .prepare(
            `INSERT INTO time_segments (uuid, entry_uuid, started_at, ended_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(uuid) DO UPDATE SET started_at=excluded.started_at, ended_at=excluded.ended_at`,
          )
          .run(s.uuid, row.uuid, s.started_at, s.ended_at);
      }
    }
  }

  async login(baseUrl: string, email: string, password: string) {
    const base = baseUrl.replace(/\/$/, '');
    const res = await this.client.post(`${base}/auth/login`, {
      email,
      password,
      device_name: `TrackTime-${process.platform}`,
    });
    return res.data as { token: string; user: { id: number; name: string; email: string } };
  }

  async register(baseUrl: string, name: string, email: string, password: string) {
    const base = baseUrl.replace(/\/$/, '');
    const res = await this.client.post(`${base}/auth/register`, {
      name,
      email,
      password,
      password_confirmation: password,
      device_name: `TrackTime-${process.platform}`,
    });
    return res.data as { token: string; user: { id: number; name: string; email: string } };
  }
}
