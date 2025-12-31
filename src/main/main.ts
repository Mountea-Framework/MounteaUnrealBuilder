import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AppConfig, BuildRecord } from '../shared/types';
import { scanEngines, validateEngine } from './scanner';
import { BuildExecutor } from './builder';

let mainWindow: BrowserWindow | null = null;
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

const buildExecutor = new BuildExecutor(
  (buildId, log) => {
    if (mainWindow) {
      mainWindow.webContents.send('build-log', buildId, log);
    }
  },
  async (buildId, success) => {
    if (mainWindow) {
      mainWindow.webContents.send('build-complete', buildId, success);
    }
    
    try {
      const config = await loadConfig();
      const build = config.buildHistory.find(b => b.id === buildId);
      if (build) {
        build.status = success ? 'success' : 'failed';
        build.endTime = new Date().toISOString();
        await saveConfigInternal(config);
      }

      processNextBuild();
    } catch (error) {
      console.error('Failed to update build status:', error);
    }
  }
);

async function processNextBuild() {
  if (buildExecutor.isBuilding()) return;

  try {
    const config = await loadConfig();
    const nextBuild = config.buildHistory.find(b => b.status === 'queued');
    
    if (!nextBuild) return;

    const project = config.projects.find(p => p.id === nextBuild.projectId);
    const engine = config.engines.find(e => e.id === project?.engineId);

    if (!project || !engine) {
      nextBuild.status = 'failed';
      nextBuild.endTime = new Date().toISOString();
      await saveConfigInternal(config);
      return;
    }

    nextBuild.status = 'building';
    nextBuild.startTime = new Date().toISOString();
    await saveConfigInternal(config);

    if (mainWindow) {
      mainWindow.webContents.send('build-started', nextBuild.id);
    }

    await buildExecutor.startBuild(nextBuild.id, project, engine);
  } catch (error) {
    console.error('Failed to process next build:', error);
  }
}

async function loadConfig(): Promise<AppConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      engines: [],
      projects: [],
      buildHistory: [],
    };
  }
}

async function saveConfigInternal(config: AppConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

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

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
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
  return await loadConfig();
});

ipcMain.handle('save-config', async (_event, config: AppConfig) => {
  await saveConfigInternal(config);
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

ipcMain.handle('scan-engines', async () => {
  return await scanEngines();
});

ipcMain.handle('select-file', async (_event, filters?: { name: string; extensions: string[] }[]) => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [],
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('start-build', async (_event, projectId: string) => {
  try {
    const config = await loadConfig();
    
    const buildRecord: BuildRecord = {
      id: crypto.randomUUID(),
      projectId,
      status: 'queued',
      startTime: new Date().toISOString(),
      log: '',
    };

    config.buildHistory.push(buildRecord);
    await saveConfigInternal(config);

    processNextBuild();

    return buildRecord.id;
  } catch (error) {
    console.error('Failed to start build:', error);
    throw error;
  }
});

ipcMain.handle('cancel-build', async () => {
  buildExecutor.cancelBuild();
});