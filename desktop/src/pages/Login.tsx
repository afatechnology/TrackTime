import { FormEvent, useEffect, useState } from 'react';
import type { User } from '../types';

type Props = {
  onLogin: (user: User) => void;
};

export default function Login({ onLogin }: Props) {
  const [apiUrl, setApiUrl] = useState('http://tracktime.test/api/v1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.tracktime.getConfig().then((c) => {
      if (c.api_base_url) setApiUrl(c.api_base_url);
    });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const base = apiUrl.replace(/\/$/, '');
    try {
      await window.tracktime.setConfig({ api_base_url: base });
      const body = { email, password, device_name: `TrackTime-${navigator.platform}` };
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || data.errors?.email?.[0] || 'Authentication failed';
        throw new Error(msg);
      }
      await window.tracktime.saveSession(data.token, data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <span className="brand-icon">⏱</span>
          <h1>TrackTime</h1>
          <p>Project time tracking that syncs to your server</p>
        </div>
        <form onSubmit={submit}>
          <label>
            API URL
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-server.com/api/v1"
            />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Please wait…' : 'Sign in'}
          </button>
        </form>
        <p className="hint">Accounts are created by an administrator. Demo: demo@tracktime.app / password</p>
      </div>
    </div>
  );
}
