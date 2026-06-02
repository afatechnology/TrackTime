import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { User } from '../types';

type Props = {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
};

export default function Layout({ user, onLogout, children }: Props) {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    window.tracktime.getConfig().then((c) => setLastSync(c.last_sync_at ?? null));
    const unsub = window.tracktime.onSyncCompleted?.((result) => {
      setSyncing(false);
      if (result.ok) {
        window.tracktime.getConfig().then((c) => setLastSync(c.last_sync_at ?? null));
      } else if (result.manual) {
        alert(result.message ?? 'Sync failed');
      }
    });
    return () => unsub?.();
  }, []);

  async function handleLogout() {
    await window.tracktime.clearSession();
    onLogout();
  }

  async function handleSync() {
    setSyncing(true);
    const result = await window.tracktime.sync();
    setSyncing(false);
    if (!result.ok) alert(result.message);
    else {
      const c = await window.tracktime.getConfig();
      setLastSync(c.last_sync_at ?? null);
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand compact">
          <span>⏱</span> TrackTime
        </div>
        <nav>
          <NavLink to="/" end>
            Timer
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/time-log">Time log</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="btn ghost" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          {lastSync && (
            <p className="muted small">Synced {new Date(lastSync).toLocaleString()}</p>
          )}
          <p className="user-name">{user.name}</p>
          <button type="button" className="link" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
