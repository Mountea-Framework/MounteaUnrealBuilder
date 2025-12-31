import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AppConfig } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a1a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('get-config', async () => {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data) as AppConfig;
  } catch (error) {
    const defaultConfig: AppConfig = {
      engines: [],
      projects: [],
      buildHistory: [],
    };
    return defaultConfig;
  }
});

ipcMain.handle('save-config', async (_event, config: AppConfig) => {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
});

ipcMain.handle('validate-engine-path', async (_event, enginePath: string) => {
  try {
    const runatPath = path.join(enginePath, 'Engine', 'Build', 'BatchFiles', 'RunUAT.bat');
    await fs.access(runatPath);
    return true;
  } catch {
    return false;
  }
});
