import { NavLink } from 'react-router-dom';
import type { User } from '../types';

type Props = {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
};

export default function Layout({ user, onLogout, children }: Props) {
  async function handleLogout() {
    await window.tracktime.clearSession();
    onLogout();
  }

  async function handleSync() {
    const result = await window.tracktime.sync();
    if (!result.ok) alert(result.message);
    else alert('Sync completed');
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
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="btn ghost" onClick={handleSync}>
            Sync now
          </button>
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
