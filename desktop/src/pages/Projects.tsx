import { FormEvent, useEffect, useState } from 'react';
import type { Project } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState('');

  async function load() {
    const list = await window.tracktime.listProjects(true);
    setProjects(list as Project[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await window.tracktime.createProject({
      name,
      description: description || undefined,
      color,
      client_name: client || undefined,
    });
    setName('');
    setClient('');
    setDescription('');
    setShowForm(false);
    load();
  }

  async function archive(uuid: string, archived: boolean) {
    await window.tracktime.updateProject(uuid, { is_archived: archived ? 1 : 0 });
    load();
  }

  async function remove(uuid: string) {
    if (!confirm('Delete this project? Time entries will remain on the server.')) return;
    await window.tracktime.deleteProject(uuid);
    load();
  }

  return (
    <div className="page">
      <header className="row">
        <div>
          <h1>Projects</h1>
          <p>Organize work by client or initiative.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New project'}
        </button>
      </header>

      {showForm && (
        <form className="card form-card" onSubmit={create}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Client
            <input value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <label>
            Color
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={color === c ? 'active' : ''}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </label>
          <button type="submit" className="btn primary">
            Create
          </button>
        </form>
      )}

      <ul className="project-list">
        {projects.map((p) => (
          <li key={p.uuid} className="card project-item" style={{ borderLeftColor: p.color }}>
            <div>
              <strong>{p.name}</strong>
              {p.client_name && <span className="muted"> · {p.client_name}</span>}
              {p.description && <p className="muted small">{p.description}</p>}
              {p.is_archived ? <span className="badge archived">Archived</span> : null}
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost"
                onClick={() => archive(p.uuid, !p.is_archived)}
              >
                {p.is_archived ? 'Restore' : 'Archive'}
              </button>
              <button type="button" className="btn ghost danger" onClick={() => remove(p.uuid)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
