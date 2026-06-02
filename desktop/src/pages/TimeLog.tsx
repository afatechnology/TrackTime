import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { Project, TimeEntry } from '../types';
import { formatDuration } from '../utils';

type EditState = {
  uuid: string;
  project_uuid: string;
  task_title: string;
  notes: string;
  date: string;
  hours: string;
  minutes: string;
};

export default function TimeLog() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    const [list, projs] = await Promise.all([
      window.tracktime.listEntries({ from, to, limit: 300 }),
      window.tracktime.listProjects(),
    ]);
    setEntries(list as TimeEntry[]);
    setProjects(projs as Project[]);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(entry: TimeEntry) {
    const end = entry.ended_at ? new Date(entry.ended_at) : new Date(entry.started_at);
    const total = entry.total_seconds ?? 0;
    setEditing({
      uuid: entry.uuid,
      project_uuid: entry.project_uuid,
      task_title: entry.task_title ?? '',
      notes: entry.notes ?? '',
      date: end.toISOString().slice(0, 10),
      hours: String(Math.floor(total / 3600)),
      minutes: String(Math.floor((total % 3600) / 60)),
    });
    setError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const hours = parseInt(editing.hours, 10) || 0;
    const minutes = parseInt(editing.minutes, 10) || 0;
    const durationSeconds = hours * 3600 + minutes * 60;
    if (durationSeconds < 60) {
      setError('Duration must be at least 1 minute');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const workedDate = editing.date;
      const endedAt = new Date(`${workedDate}T17:00:00`);
      const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
      await window.tracktime.updateEntry(editing.uuid, {
        project_uuid: editing.project_uuid,
        task_title: editing.task_title || null,
        notes: editing.notes || null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save entry');
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(uuid: string) {
    if (!confirm('Delete this time entry? This will sync to the server on next sync.')) return;
    try {
      await window.tracktime.deleteEntry(uuid);
      setEditing(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete entry');
    }
  }

  return (
    <div className="page">
      <header>
        <h1>Time log</h1>
        <p>View and edit completed sessions. Changes sync automatically.</p>
      </header>

      <form
        className="card filters-inline"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" className="btn secondary">
          Refresh
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="muted">No completed entries in this range.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Task</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.uuid}>
                  <td>{new Date(entry.started_at).toLocaleDateString()}</td>
                  <td>
                    <span className="dot" style={{ background: entry.project_color }} />{' '}
                    {entry.project_name}
                  </td>
                  <td>{entry.task_title || '—'}</td>
                  <td>{formatDuration(entry.total_seconds ?? 0)}</td>
                  <td>
                    <button type="button" className="btn ghost small" onClick={() => openEdit(entry)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal card" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h2>Edit entry</h2>
            <label>
              Project
              <select
                value={editing.project_uuid}
                onChange={(e) => setEditing({ ...editing, project_uuid: e.target.value })}
                required
              >
                {projects.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Task title
              <input
                value={editing.task_title}
                onChange={(e) => setEditing({ ...editing, task_title: e.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                rows={2}
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </label>
            <label>
              Date worked
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
              />
            </label>
            <div className="duration-row">
              <label>
                Hours
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={editing.hours}
                  onChange={(e) => setEditing({ ...editing, hours: e.target.value })}
                />
              </label>
              <label>
                Minutes
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={editing.minutes}
                  onChange={(e) => setEditing({ ...editing, minutes: e.target.value })}
                />
              </label>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="btn-row">
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => removeEntry(editing.uuid)}
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
