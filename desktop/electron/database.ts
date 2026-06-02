import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export type ProjectRow = {
  uuid: string;
  name: string;
  description: string | null;
  color: string;
  is_archived: number;
  client_name: string | null;
  hourly_rate: number | null;
  server_id: number | null;
  synced_at: string | null;
  updated_at: string;
  deleted_at: string | null;
};

export type TimeEntryRow = {
  uuid: string;
  project_uuid: string;
  started_at: string;
  ended_at: string | null;
  status: 'running' | 'paused' | 'completed';
  notes: string | null;
  task_title: string | null;
  server_id: number | null;
  synced_at: string | null;
  updated_at: string;
  deleted_at: string | null;
};

export class TrackTimeDatabase {
  private db: Database.Database;

  constructor(userDataPath: string) {
    const path = `${userDataPath}/tracktime.db`;
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS projects (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3b82f6',
        is_archived INTEGER DEFAULT 0,
        client_name TEXT,
        hourly_rate REAL,
        server_id INTEGER,
        synced_at TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        uuid TEXT PRIMARY KEY,
        project_uuid TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        task_title TEXT,
        server_id INTEGER,
        synced_at TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (project_uuid) REFERENCES projects(uuid)
      );
      CREATE TABLE IF NOT EXISTS time_segments (
        uuid TEXT PRIMARY KEY,
        entry_uuid TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        FOREIGN KEY (entry_uuid) REFERENCES time_entries(uuid)
      );
    `);

    const apiUrl = this.getConfig().api_base_url;
    if (!apiUrl) {
      this.setConfig({ api_base_url: 'http://localhost:8000/api/v1' });
    }
  }

  getConfig(): Record<string, string | null> {
    const rows = this.db.prepare('SELECT key, value FROM config').all() as {
      key: string;
      value: string | null;
    }[];
    const out: Record<string, string | null> = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  }

  setConfig(patch: Record<string, string | null>) {
    const stmt = this.db.prepare(
      'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    const tx = this.db.transaction((entries: [string, string | null][]) => {
      for (const [k, v] of entries) stmt.run(k, v);
    });
    tx(Object.entries(patch));
  }

  listProjects(includeArchived = false): ProjectRow[] {
    const sql = includeArchived
      ? 'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY name'
      : 'SELECT * FROM projects WHERE deleted_at IS NULL AND is_archived = 0 ORDER BY name';
    return this.db.prepare(sql).all() as ProjectRow[];
  }

  createProject(data: {
    name: string;
    description?: string;
    color?: string;
    client_name?: string;
    hourly_rate?: number;
  }): ProjectRow {
    const now = new Date().toISOString();
    const row: ProjectRow = {
      uuid: uuidv4(),
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? '#3b82f6',
      is_archived: 0,
      client_name: data.client_name ?? null,
      hourly_rate: data.hourly_rate ?? null,
      server_id: null,
      synced_at: null,
      updated_at: now,
      deleted_at: null,
    };
    this.db
      .prepare(
        `INSERT INTO projects (uuid, name, description, color, is_archived, client_name, hourly_rate, server_id, synced_at, updated_at, deleted_at)
         VALUES (@uuid, @name, @description, @color, @is_archived, @client_name, @hourly_rate, @server_id, @synced_at, @updated_at, @deleted_at)`,
      )
      .run(row);
    return row;
  }

  updateProject(uuid: string, data: Partial<ProjectRow>): ProjectRow {
    const existing = this.db.prepare('SELECT * FROM projects WHERE uuid = ?').get(uuid) as ProjectRow;
    if (!existing) throw new Error('Project not found');
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      synced_at: null,
    };
    this.db
      .prepare(
        `UPDATE projects SET name=@name, description=@description, color=@color, is_archived=@is_archived,
         client_name=@client_name, hourly_rate=@hourly_rate, updated_at=@updated_at, synced_at=NULL WHERE uuid=@uuid`,
      )
      .run(updated);
    return updated;
  }

  deleteProject(uuid: string) {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE projects SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE uuid = ?')
      .run(now, now, uuid);
  }

  getActiveEntry() {
    const entry = this.db
      .prepare(
        `SELECT e.*, p.name as project_name, p.color as project_color
         FROM time_entries e JOIN projects p ON p.uuid = e.project_uuid
         WHERE e.deleted_at IS NULL AND e.status IN ('running', 'paused')
         ORDER BY e.started_at DESC LIMIT 1`,
      )
      .get() as TimeEntryRow & { project_name: string; project_color: string };
    if (!entry) return null;
    const segments = this.db
      .prepare('SELECT * FROM time_segments WHERE entry_uuid = ? ORDER BY started_at')
      .all(entry.uuid);
    return { ...entry, segments, total_seconds: this.entrySeconds(entry.uuid) };
  }

  startTimer(projectUuid: string, taskTitle?: string) {
    const active = this.getActiveEntry();
    if (active) throw new Error('Active timer already exists');

    const now = new Date().toISOString();
    const entryUuid = uuidv4();
    this.db
      .prepare(
        `INSERT INTO time_entries (uuid, project_uuid, started_at, ended_at, status, notes, task_title, server_id, synced_at, updated_at, deleted_at)
         VALUES (?, ?, ?, NULL, 'running', NULL, ?, NULL, NULL, ?, NULL)`,
      )
      .run(entryUuid, projectUuid, now, taskTitle ?? null, now);
    this.db
      .prepare('INSERT INTO time_segments (uuid, entry_uuid, started_at, ended_at) VALUES (?, ?, ?, NULL)')
      .run(uuidv4(), entryUuid, now);
    return this.getActiveEntry();
  }

  pauseTimer(entryUuid: string) {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'UPDATE time_segments SET ended_at = ? WHERE entry_uuid = ? AND ended_at IS NULL',
      )
      .run(now, entryUuid);
    this.db
      .prepare("UPDATE time_entries SET status = 'paused', updated_at = ?, synced_at = NULL WHERE uuid = ?")
      .run(now, entryUuid);
    return this.getActiveEntry();
  }

  resumeTimer(entryUuid: string) {
    const now = new Date().toISOString();
    this.db
      .prepare('INSERT INTO time_segments (uuid, entry_uuid, started_at, ended_at) VALUES (?, ?, ?, NULL)')
      .run(uuidv4(), entryUuid, now);
    this.db
      .prepare("UPDATE time_entries SET status = 'running', updated_at = ?, synced_at = NULL WHERE uuid = ?")
      .run(now, entryUuid);
    return this.getActiveEntry();
  }

  createManualEntry(data: {
    projectUuid: string;
    durationSeconds: number;
    taskTitle?: string;
    notes?: string;
    workedAt?: string;
  }) {
    const active = this.getActiveEntry();
    if (active) throw new Error('Finish or stop the active timer before adding manual time');

    if (data.durationSeconds < 60) {
      throw new Error('Duration must be at least 1 minute');
    }

    const workedDate = data.workedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const endedAt = new Date(`${workedDate}T17:00:00`);
    const startedAt = new Date(endedAt.getTime() - data.durationSeconds * 1000);
    const now = new Date().toISOString();
    const entryUuid = uuidv4();

    this.db
      .prepare(
        `INSERT INTO time_entries (uuid, project_uuid, started_at, ended_at, status, notes, task_title, server_id, synced_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, NULL, NULL, ?, NULL)`,
      )
      .run(
        entryUuid,
        data.projectUuid,
        startedAt.toISOString(),
        endedAt.toISOString(),
        data.notes ?? null,
        data.taskTitle ?? null,
        now,
      );
    this.db
      .prepare('INSERT INTO time_segments (uuid, entry_uuid, started_at, ended_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), entryUuid, startedAt.toISOString(), endedAt.toISOString());

    return this.listEntries({ limit: 1 })[0];
  }

  finishTimer(entryUuid: string, notes?: string) {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'UPDATE time_segments SET ended_at = ? WHERE entry_uuid = ? AND ended_at IS NULL',
      )
      .run(now, entryUuid);
    this.db
      .prepare(
        "UPDATE time_entries SET status = 'completed', ended_at = ?, notes = COALESCE(?, notes), updated_at = ?, synced_at = NULL WHERE uuid = ?",
      )
      .run(now, notes ?? null, now, entryUuid);
    return null;
  }

  updateEntryNotes(entryUuid: string, notes: string, taskTitle?: string) {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'UPDATE time_entries SET notes = ?, task_title = COALESCE(?, task_title), updated_at = ?, synced_at = NULL WHERE uuid = ?',
      )
      .run(notes, taskTitle ?? null, now, entryUuid);
  }

  updateEntry(
    entryUuid: string,
    data: {
      project_uuid?: string;
      task_title?: string | null;
      notes?: string | null;
      started_at?: string;
      ended_at?: string;
      duration_seconds?: number;
    },
  ) {
    const entry = this.db
      .prepare('SELECT * FROM time_entries WHERE uuid = ? AND deleted_at IS NULL')
      .get(entryUuid) as TimeEntryRow | undefined;
    if (!entry) throw new Error('Entry not found');
    if (entry.status === 'running' || entry.status === 'paused') {
      throw new Error('Finish the active timer before editing this entry');
    }

    const now = new Date().toISOString();
    let startedAt = data.started_at ?? entry.started_at;
    let endedAt = data.ended_at ?? entry.ended_at;

    if (data.duration_seconds !== undefined) {
      if (data.duration_seconds < 60) throw new Error('Duration must be at least 1 minute');
      const end = endedAt ? new Date(endedAt) : new Date(startedAt);
      startedAt = new Date(end.getTime() - data.duration_seconds * 1000).toISOString();
      endedAt = end.toISOString();
    }

    if (!endedAt) throw new Error('Completed entries must have an end time');

    this.db
      .prepare(
        `UPDATE time_entries SET project_uuid = COALESCE(?, project_uuid),
         task_title = COALESCE(?, task_title), notes = COALESCE(?, notes),
         started_at = ?, ended_at = ?, updated_at = ?, synced_at = NULL WHERE uuid = ?`,
      )
      .run(
        data.project_uuid ?? null,
        data.task_title ?? null,
        data.notes ?? null,
        startedAt,
        endedAt,
        now,
        entryUuid,
      );

    this.db.prepare('DELETE FROM time_segments WHERE entry_uuid = ?').run(entryUuid);
    this.db
      .prepare('INSERT INTO time_segments (uuid, entry_uuid, started_at, ended_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), entryUuid, startedAt, endedAt);

    return this.listEntries({ limit: 500 }).find((e) => e.uuid === entryUuid);
  }

  deleteEntry(entryUuid: string) {
    const entry = this.db
      .prepare('SELECT status FROM time_entries WHERE uuid = ?')
      .get(entryUuid) as { status: string } | undefined;
    if (!entry) throw new Error('Entry not found');
    if (entry.status === 'running' || entry.status === 'paused') {
      throw new Error('Stop the active timer before deleting this entry');
    }
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE time_entries SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE uuid = ?')
      .run(now, now, entryUuid);
  }

  listEntries(filters: { from?: string; to?: string; project_uuid?: string; limit?: number }) {
    let sql = `SELECT e.*, p.name as project_name, p.color as project_color
      FROM time_entries e JOIN projects p ON p.uuid = e.project_uuid
      WHERE e.deleted_at IS NULL AND e.status = 'completed'`;
    const params: unknown[] = [];
    if (filters.project_uuid) {
      sql += ' AND e.project_uuid = ?';
      params.push(filters.project_uuid);
    }
    if (filters.from) {
      sql += ' AND date(e.started_at) >= date(?)';
      params.push(filters.from);
    }
    if (filters.to) {
      sql += ' AND date(e.started_at) <= date(?)';
      params.push(filters.to);
    }
    sql += ' ORDER BY e.started_at DESC LIMIT ?';
    params.push(filters.limit ?? 200);
    const entries = this.db.prepare(sql).all(...params) as (TimeEntryRow & {
      project_name: string;
      project_color: string;
    })[];
    return entries.map((e) => ({ ...e, total_seconds: this.entrySeconds(e.uuid) }));
  }

  reportSummary(period: string, from?: string, to?: string) {
    const range = this.resolveRange(period, from, to);
    const entries = this.listEntries({ from: range.from, to: range.to, limit: 500 });
    const totalSeconds = entries.reduce((s, e) => s + (e.total_seconds ?? 0), 0);
    const byProject: Record<string, { name: string; color: string; seconds: number; count: number }> = {};
    const byDay: Record<string, { seconds: number; count: number }> = {};

    for (const e of entries) {
      const sec = e.total_seconds ?? 0;
      if (!byProject[e.project_uuid]) {
        byProject[e.project_uuid] = {
          name: e.project_name,
          color: e.project_color,
          seconds: 0,
          count: 0,
        };
      }
      byProject[e.project_uuid].seconds += sec;
      byProject[e.project_uuid].count += 1;
      const day = e.started_at.slice(0, 10);
      if (!byDay[day]) byDay[day] = { seconds: 0, count: 0 };
      byDay[day].seconds += sec;
      byDay[day].count += 1;
    }

    return {
      period,
      from: range.from,
      to: range.to,
      total_seconds: totalSeconds,
      by_project: Object.entries(byProject).map(([uuid, v]) => ({ project_uuid: uuid, ...v })),
      by_day: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
      entries,
    };
  }

  entrySeconds(entryUuid: string): number {
    const segments = this.db
      .prepare('SELECT started_at, ended_at FROM time_segments WHERE entry_uuid = ?')
      .all(entryUuid) as { started_at: string; ended_at: string | null }[];
    const entry = this.db
      .prepare('SELECT status FROM time_entries WHERE uuid = ?')
      .get(entryUuid) as { status: string } | undefined;
    let total = 0;
    const now = Date.now();
    for (const s of segments) {
      const start = new Date(s.started_at).getTime();
      const end = s.ended_at
        ? new Date(s.ended_at).getTime()
        : entry?.status === 'running'
          ? now
          : start;
      total += Math.max(0, Math.floor((end - start) / 1000));
    }
    return total;
  }

  getUnsyncedPayload() {
    const projects = this.db
      .prepare('SELECT * FROM projects WHERE synced_at IS NULL OR deleted_at IS NOT NULL')
      .all();
    const entries = this.db
      .prepare('SELECT * FROM time_entries WHERE synced_at IS NULL OR deleted_at IS NOT NULL')
      .all() as TimeEntryRow[];
    const time_entries = entries.map((e) => ({
      ...e,
      segments: this.db
        .prepare('SELECT * FROM time_segments WHERE entry_uuid = ?')
        .all(e.uuid),
    }));
    return { projects, time_entries };
  }

  markSynced(serverTime: string) {
    const now = serverTime;
    this.db.prepare('UPDATE projects SET synced_at = ? WHERE synced_at IS NULL').run(now);
    this.db.prepare('UPDATE time_entries SET synced_at = ? WHERE synced_at IS NULL').run(now);
  }

  applyServerPull(projects: unknown[], timeEntries: unknown[]) {
    // Simplified: merge by uuid handled in sync service
    return { projects, timeEntries };
  }

  private resolveRange(period: string, from?: string, to?: string) {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (period === 'custom' && from && to) return { from, to };
    if (period === 'day') return { from: iso(today), to: iso(today) };
    if (period === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: iso(start), to: iso(end) };
    }
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
}
