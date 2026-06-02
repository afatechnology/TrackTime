import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TrackTimeDatabase } from './database';
import { SyncService } from './sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let db: TrackTimeDatabase;
let syncService: SyncService;
let isQuitting = false;
let syncDebounce: ReturnType<typeof setTimeout> | null = null;
let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

const isDev = !app.isPackaged;
const AUTO_SYNC_MS = 5 * 60 * 1000;

function scheduleSync() {
  if (syncDebounce) clearTimeout(syncDebounce);
  syncDebounce = setTimeout(() => void runSync(false), 3000);
}

async function runSync(manual: boolean) {
  const config = db.getConfig();
  if (!config.api_base_url || !config.api_token) {
    return { ok: false, message: 'Not configured or not logged in' };
  }
  try {
    const result = await syncService.sync(db);
    mainWindow?.webContents.send('sync:completed', { ...result, manual });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    if (manual) {
      return { ok: false, message };
    }
    return { ok: false, message };
  }
}

function startAutoSync() {
  if (autoSyncInterval) clearInterval(autoSyncInterval);
  autoSyncInterval = setInterval(() => void runSync(false), AUTO_SYNC_MS);
}

async function confirmClose(win: BrowserWindow): Promise<boolean> {
  const active = db.getActiveEntry();
  if (!active) return true;

  const statusLabel = active.status === 'running' ? 'running' : 'paused';
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Quit anyway', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: 'Timer active',
    message: `You have a ${statusLabel} timer for "${active.project_name}".`,
    detail: 'Quit TrackTime anyway? Your session is saved locally and will sync when you return.',
  });

  return response === 0;
}

function setupWindowCloseGuard(win: BrowserWindow) {
  win.on('close', (event) => {
    if (isQuitting) return;
    const active = db.getActiveEntry();
    if (!active) return;

    event.preventDefault();
    void confirmClose(win).then((ok) => {
      if (ok) {
        isQuitting = true;
        win.destroy();
        app.quit();
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'TrackTime',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setupWindowCloseGuard(mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('app:get-config', () => db.getConfig());
  ipcMain.handle('app:set-config', (_e, patch: Record<string, string | null>) => {
    db.setConfig(patch);
    return db.getConfig();
  });

  ipcMain.handle('auth:save-session', (_e, token: string, user: object) => {
    db.setConfig({ api_token: token, user_json: JSON.stringify(user) });
    syncService.setToken(token);
    scheduleSync();
    return true;
  });

  ipcMain.handle('auth:clear-session', () => {
    db.setConfig({ api_token: null, user_json: null });
    syncService.setToken(null);
    return true;
  });

  ipcMain.handle('auth:get-session', () => {
    const config = db.getConfig();
    if (!config.api_token || !config.user_json) return null;
    return { token: config.api_token, user: JSON.parse(config.user_json) };
  });

  ipcMain.handle('projects:list', (_e, includeArchived?: boolean) =>
    db.listProjects(includeArchived),
  );
  ipcMain.handle('projects:create', (_e, data: { name: string; description?: string; color?: string; client_name?: string; hourly_rate?: number }) => {
    const row = db.createProject(data);
    scheduleSync();
    return row;
  });
  ipcMain.handle('projects:update', (_e, uuid: string, data: object) => {
    const row = db.updateProject(uuid, data);
    scheduleSync();
    return row;
  });
  ipcMain.handle('projects:delete', (_e, uuid: string) => {
    db.deleteProject(uuid);
    scheduleSync();
  });

  ipcMain.handle('timer:active', () => db.getActiveEntry());
  ipcMain.handle('timer:start', (_e, projectUuid: string, taskTitle?: string) => {
    const row = db.startTimer(projectUuid, taskTitle);
    scheduleSync();
    return row;
  });
  ipcMain.handle('timer:pause', (_e, entryUuid: string) => {
    const row = db.pauseTimer(entryUuid);
    scheduleSync();
    return row;
  });
  ipcMain.handle('timer:resume', (_e, entryUuid: string) => {
    const row = db.resumeTimer(entryUuid);
    scheduleSync();
    return row;
  });
  ipcMain.handle('timer:finish', (_e, entryUuid: string, notes?: string) => {
    const row = db.finishTimer(entryUuid, notes);
    scheduleSync();
    return row;
  });
  ipcMain.handle('timer:update-notes', (_e, entryUuid: string, notes: string, taskTitle?: string) => {
    db.updateEntryNotes(entryUuid, notes, taskTitle);
    scheduleSync();
  });
  ipcMain.handle(
    'timer:manual',
    (
      _e,
      data: {
        projectUuid: string;
        durationSeconds: number;
        taskTitle?: string;
        notes?: string;
        workedAt?: string;
      },
    ) => {
      const row = db.createManualEntry(data);
      scheduleSync();
      return row;
    },
  );

  ipcMain.handle('entries:list', (_e, filters: object) => db.listEntries(filters));
  ipcMain.handle('entries:update', (_e, uuid: string, data: object) => {
    const row = db.updateEntry(uuid, data as Parameters<TrackTimeDatabase['updateEntry']>[1]);
    scheduleSync();
    return row;
  });
  ipcMain.handle('entries:delete', (_e, uuid: string) => {
    db.deleteEntry(uuid);
    scheduleSync();
  });

  ipcMain.handle('reports:summary', (_e, period: string, from?: string, to?: string) =>
    db.reportSummary(period, from, to),
  );

  ipcMain.handle('sync:run', async () => runSync(true));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  db = new TrackTimeDatabase(app.getPath('userData'));
  syncService = new SyncService(() => db.getConfig().api_base_url ?? '', () => db.getConfig().api_token);
  const config = db.getConfig();
  if (config.api_token) syncService.setToken(config.api_token);

  nativeTheme.themeSource = 'dark';
  registerIpc();
  createWindow();
  startAutoSync();
  scheduleSync();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (event) => {
  if (isQuitting) return;
  const active = db?.getActiveEntry();
  if (!active) return;

  event.preventDefault();
  const win = mainWindow ?? BrowserWindow.getFocusedWindow();
  if (!win) {
    isQuitting = true;
    app.quit();
    return;
  }
  void confirmClose(win).then((ok) => {
    if (ok) {
      isQuitting = true;
      app.quit();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    app.quit();
  }
});
