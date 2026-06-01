import { useEffect, useState } from 'react';
import { formatDuration, formatHours } from '../utils';

type Report = {
  period: string;
  from: string;
  to: string;
  total_seconds: number;
  by_project: { project_uuid: string; name: string; color: string; seconds: number; count: number }[];
  by_day: { date: string; seconds: number; count: number }[];
  entries: {
    uuid: string;
    project_name: string;
    project_color: string;
    started_at: string;
    ended_at: string | null;
    task_title: string | null;
    notes: string | null;
    total_seconds: number;
  }[];
};

const PERIODS = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
];

export default function Reports() {
  const [period, setPeriod] = useState('week');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const data = await window.tracktime.reportSummary(
        period,
        period === 'custom' ? from : undefined,
        period === 'custom' ? to : undefined,
      );
      setReport(data as Report);
    })();
  }, [period, from, to]);

  return (
    <div className="page">
      <header>
        <h1>Reports</h1>
        <p>See where your time went — daily, weekly, monthly, or a custom range.</p>
      </header>

      <div className="period-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={period === p.id ? 'active' : ''}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="custom-range card">
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}

      {report && (
        <>
          <section className="stats-row">
            <div className="stat card">
              <span className="stat-value">{formatHours(report.total_seconds)}h</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat card">
              <span className="stat-value">{report.entries.length}</span>
              <span className="stat-label">Sessions</span>
            </div>
            <div className="stat card">
              <span className="stat-value">{report.by_project.length}</span>
              <span className="stat-label">Projects</span>
            </div>
          </section>

          <section className="card">
            <h2>By project</h2>
            <ul className="bar-list">
              {report.by_project.map((p) => (
                <li key={p.project_uuid}>
                  <div className="bar-label">
                    <span className="dot" style={{ background: p.color }} />
                    {p.name}
                    <span className="muted">{formatDuration(p.seconds)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${report.total_seconds ? (p.seconds / report.total_seconds) * 100 : 0}%`,
                        background: p.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Recent sessions</h2>
            <ul className="entry-list">
              {report.entries.map((e) => (
                <li key={e.uuid}>
                  <div className="entry-head">
                    <span className="dot" style={{ background: e.project_color }} />
                    <strong>{e.project_name}</strong>
                    <span className="muted">{formatDuration(e.total_seconds)}</span>
                  </div>
                  <p className="small muted">
                    {new Date(e.started_at).toLocaleString()} —{' '}
                    {e.ended_at ? new Date(e.ended_at).toLocaleString() : '—'}
                  </p>
                  {e.task_title && <p>{e.task_title}</p>}
                  {e.notes && <p className="notes">{e.notes}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
