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
  const [showManual, setShowManual] = useState(false);
  const [manualProject, setManualProject] = useState('');
  const [manualTask, setManualTask] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualHours, setManualHours] = useState('1');
  const [manualMinutes, setManualMinutes] = useState('0');
  const [manualError, setManualError] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

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

  async function submitManual() {
    setManualError('');
    if (!manualProject) {
      setManualError('Select a project');
      return;
    }
    const hours = parseInt(manualHours, 10) || 0;
    const minutes = parseInt(manualMinutes, 10) || 0;
    const durationSeconds = hours * 3600 + minutes * 60;
    if (durationSeconds < 60) {
      setManualError('Enter at least 1 minute of time');
      return;
    }
    setManualSaving(true);
    try {
      await window.tracktime.createManualEntry({
        projectUuid: manualProject,
        durationSeconds,
        taskTitle: manualTask || undefined,
        notes: manualNotes || undefined,
        workedAt: manualDate,
      });
      setManualTask('');
      setManualNotes('');
      setManualHours('1');
      setManualMinutes('0');
      setShowManual(false);
      refresh();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Could not save entry');
    } finally {
      setManualSaving(false);
    }
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

      {!active && (
        <section className="timer-card manual-entry-card">
          <header className="manual-header">
            <div>
              <h2>Log time manually</h2>
              <p className="muted">Forgot to start the timer? Add time spent on a task.</p>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowManual((v) => !v)}
            >
              {showManual ? 'Cancel' : 'Add manual entry'}
            </button>
          </header>
          {showManual && (
            <div className="timer-start">
              <label>
                Project
                <select value={manualProject} onChange={(e) => setManualProject(e.target.value)}>
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
                  value={manualTask}
                  onChange={(e) => setManualTask(e.target.value)}
                  placeholder="What did you work on?"
                />
              </label>
              <label>
                Date worked
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </label>
              <div className="duration-row">
                <label>
                  Hours
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                  />
                </label>
                <label>
                  Minutes
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Notes (optional)
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={2}
                  placeholder="Summary of work…"
                />
              </label>
              {manualError && <p className="error">{manualError}</p>}
              <button
                type="button"
                className="btn primary"
                onClick={submitManual}
                disabled={manualSaving}
              >
                {manualSaving ? 'Saving…' : 'Save manual entry'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
