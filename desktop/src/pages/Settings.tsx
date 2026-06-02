import { FormEvent, useEffect, useState } from 'react';
import type { User } from '../types';

type Props = { user: User };

export default function Settings({ user }: Props) {
  const [apiUrl, setApiUrl] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.tracktime.getConfig().then((c) => {
      setApiUrl(c.api_base_url ?? '');
      setLastSync(c.last_sync_at ?? null);
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    await window.tracktime.setConfig({ api_base_url: apiUrl.replace(/\/$/, '') });
    setMessage('Settings saved');
    setTimeout(() => setMessage(''), 3000);
  }

  async function syncNow() {
    const result = await window.tracktime.sync();
    setMessage(result.message ?? (result.ok ? 'Synced' : 'Sync failed'));
    const c = await window.tracktime.getConfig();
    setLastSync(c.last_sync_at ?? null);
  }

  return (
    <div className="page">
      <header>
        <h1>Settings</h1>
        <p>API connection and sync preferences.</p>
      </header>

      <form className="card form-card" onSubmit={save}>
        <p>
          Signed in as <strong>{user.name}</strong> ({user.email})
        </p>
        <label>
          API base URL
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://your-server.com/api/v1"
          />
        </label>
        <p className="hint">
          Point this to your Laravel API. Sync runs automatically every 5 minutes and after changes.
          Use Sync now if you were offline.
        </p>
        <div className="btn-row">
          <button type="submit" className="btn primary">
            Save
          </button>
          <button type="button" className="btn secondary" onClick={syncNow}>
            Sync now
          </button>
        </div>
        {lastSync && <p className="muted small">Last sync: {new Date(lastSync).toLocaleString()}</p>}
        {message && <p className="success">{message}</p>}
      </form>

      <section className="card">
        <h2>Features</h2>
        <ul className="feature-list">
          <li>Start / pause / finish timers with break support</li>
          <li>Per-session task title and work notes</li>
          <li>Offline-first SQLite storage with cloud sync</li>
          <li>Daily, weekly, monthly, and custom reports</li>
          <li>Optional hourly rate per project (for billing)</li>
        </ul>
      </section>
    </div>
  );
}
