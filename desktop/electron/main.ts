import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TrackTimeDatabase } from './database';
import { SyncService } from './sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let db: TrackTimeDatabase;
let syncService: SyncService;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'TrackTime',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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
  ipcMain.handle('projects:create', (_e, data: { name: string; description?: string; color?: string; client_name?: string; hourly_rate?: number }) => db.createProject(data));
  ipcMain.handle('projects:update', (_e, uuid: string, data: object) =>
    db.updateProject(uuid, data),
  );
  ipcMain.handle('projects:delete', (_e, uuid: string) => db.deleteProject(uuid));

  ipcMain.handle('timer:active', () => db.getActiveEntry());
  ipcMain.handle('timer:start', (_e, projectUuid: string, taskTitle?: string) =>
    db.startTimer(projectUuid, taskTitle),
  );
  ipcMain.handle('timer:pause', (_e, entryUuid: string) => db.pauseTimer(entryUuid));
  ipcMain.handle('timer:resume', (_e, entryUuid: string) => db.resumeTimer(entryUuid));
  ipcMain.handle('timer:finish', (_e, entryUuid: string, notes?: string) =>
    db.finishTimer(entryUuid, notes),
  );
  ipcMain.handle('timer:update-notes', (_e, entryUuid: string, notes: string, taskTitle?: string) =>
    db.updateEntryNotes(entryUuid, notes, taskTitle),
  );
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
    ) => db.createManualEntry(data),
  );

  ipcMain.handle('entries:list', (_e, filters: object) => db.listEntries(filters));
  ipcMain.handle('reports:summary', (_e, period: string, from?: string, to?: string) =>
    db.reportSummary(period, from, to),
  );

  ipcMain.handle('sync:run', async () => {
    const config = db.getConfig();
    if (!config.api_base_url || !config.api_token) {
      return { ok: false, message: 'Not configured or not logged in' };
    }
    return syncService.sync(db);
  });
}

app.whenReady().then(() => {
  db = new TrackTimeDatabase(app.getPath('userData'));
  syncService = new SyncService(() => db.getConfig().api_base_url ?? '', () => db.getConfig().api_token);
  nativeTheme.themeSource = 'dark';
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
