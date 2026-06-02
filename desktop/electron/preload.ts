import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  setConfig: (patch: Record<string, string | null>) => ipcRenderer.invoke('app:set-config', patch),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  saveSession: (token: string, user: object) => ipcRenderer.invoke('auth:save-session', token, user),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
  listProjects: (includeArchived?: boolean) => ipcRenderer.invoke('projects:list', includeArchived),
  createProject: (data: object) => ipcRenderer.invoke('projects:create', data),
  updateProject: (uuid: string, data: object) => ipcRenderer.invoke('projects:update', uuid, data),
  deleteProject: (uuid: string) => ipcRenderer.invoke('projects:delete', uuid),
  getActiveTimer: () => ipcRenderer.invoke('timer:active'),
  startTimer: (projectUuid: string, taskTitle?: string) =>
    ipcRenderer.invoke('timer:start', projectUuid, taskTitle),
  pauseTimer: (entryUuid: string) => ipcRenderer.invoke('timer:pause', entryUuid),
  resumeTimer: (entryUuid: string) => ipcRenderer.invoke('timer:resume', entryUuid),
  finishTimer: (entryUuid: string, notes?: string) =>
    ipcRenderer.invoke('timer:finish', entryUuid, notes),
  updateEntryNotes: (entryUuid: string, notes: string, taskTitle?: string) =>
    ipcRenderer.invoke('timer:update-notes', entryUuid, notes, taskTitle),
  createManualEntry: (data: {
    projectUuid: string;
    durationSeconds: number;
    taskTitle?: string;
    notes?: string;
    workedAt?: string;
  }) => ipcRenderer.invoke('timer:manual', data),
  listEntries: (filters: object) => ipcRenderer.invoke('entries:list', filters),
  updateEntry: (uuid: string, data: object) => ipcRenderer.invoke('entries:update', uuid, data),
  deleteEntry: (uuid: string) => ipcRenderer.invoke('entries:delete', uuid),
  onSyncCompleted: (callback: (result: { ok: boolean; message?: string; manual?: boolean }) => void) => {
    const listener = (_: unknown, result: { ok: boolean; message?: string; manual?: boolean }) =>
      callback(result);
    ipcRenderer.on('sync:completed', listener);
    return () => ipcRenderer.removeListener('sync:completed', listener);
  },
  reportSummary: (period: string, from?: string, to?: string) =>
    ipcRenderer.invoke('reports:summary', period, from, to),
  sync: () => ipcRenderer.invoke('sync:run'),
};

contextBridge.exposeInMainWorld('tracktime', api);

export type TrackTimeApi = typeof api;
