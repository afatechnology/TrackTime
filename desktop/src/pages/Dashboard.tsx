import { useCallback, useEffect, useState } from 'react';
import type { ActiveTimer, Project } from '../types';
import { formatDuration } from '../utils';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const refresh = useCallback(async () => {
    const [projs, timer] = await Promise.all([
      window.tracktime.listProjects(),
      window.tracktime.getActiveTimer(),
    ]);
    setProjects(projs as Project[]);
    const t = timer as ActiveTimer | null;
    setActive(t);
    setElapsed(t?.total_seconds ?? 0);
    if (t) {
      setNotes(t.notes ?? '');
      setTaskTitle(t.task_title ?? '');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active || active.status !== 'running') {
      setElapsed(active?.total_seconds ?? 0);
      return;
    }
    const id = setInterval(async () => {
      const t = await window.tracktime.getActiveTimer();
      if (t) setElapsed((t as ActiveTimer).total_seconds);
    }, 1000);
    return () => clearInterval(id);
  }, [active?.uuid, active?.status, active?.total_seconds]);

  async function start() {
    if (!selectedProject) return;
    await window.tracktime.startTimer(selectedProject, taskTitle || undefined);
    refresh();
  }

  async function pause() {
    if (!active) return;
    await window.tracktime.pauseTimer(active.uuid);
    refresh();
  }

  async function resume() {
    if (!active) return;
    await window.tracktime.resumeTimer(active.uuid);
    refresh();
  }

  async function finish() {
    if (!active) return;
    await window.tracktime.finishTimer(active.uuid, notes || undefined);
    setNotes('');
    setTaskTitle('');
    refresh();
  }

  async function saveNotes() {
    if (!active) return;
    await window.tracktime.updateEntryNotes(active.uuid, notes, taskTitle || undefined);
  }

  return (
    <div className="page dashboard">
      <header>
        <h1>Timer</h1>
        <p>Start tracking when you begin work. Pause for breaks, finish when done.</p>
      </header>

      <section className="timer-card">
        <div
          className="timer-display"
          style={{ '--accent': active?.project_color ?? '#3b82f6' } as React.CSSProperties}
        >
          <span className="time">{formatDuration(elapsed)}</span>
          {active ? (
            <p className="project-label">
              <span className="dot" /> {active.project_name}
              <span className={`badge ${active.status}`}>{active.status}</span>
            </p>
          ) : (
            <p className="muted">No active session</p>
          )}
        </div>

        {!active ? (
          <div className="timer-start">
            <label>
              Project
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Task (optional)
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="What are you working on?"
              />
            </label>
            <button type="button" className="btn primary large" onClick={start} disabled={!selectedProject}>
              Start timer
            </button>
          </div>
        ) : (
          <div className="timer-controls">
            <label>
              Task
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onBlur={saveNotes} />
            </label>
            <label>
              Notes — what did you accomplish?
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={3}
                placeholder="Brief summary of work in this session…"
              />
            </label>
            <div className="btn-row">
              {active.status === 'running' ? (
                <button type="button" className="btn secondary" onClick={pause}>
                  Pause
                </button>
              ) : (
                <button type="button" className="btn secondary" onClick={resume}>
                  Resume
                </button>
              )}
              <button type="button" className="btn primary" onClick={finish}>
                Finish
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
