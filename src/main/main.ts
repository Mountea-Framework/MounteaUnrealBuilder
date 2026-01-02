import { app, BrowserWindow, ipcMain, dialog, Notification, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { AppConfig, BuildRecord } from '../shared/types';
import { scanEngines, validateEngine } from './scanner';
import { BuildExecutor } from './builder';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const buildLogs = new Map<string, string>();

const buildExecutor = new BuildExecutor(
  (buildId, log) => {
    buildLogs.set(buildId, (buildLogs.get(buildId) || '') + log);
    
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
        build.log = buildLogs.get(buildId) || '';
        
        const buildTime = new Date(build.endTime).getTime() - new Date(build.startTime).getTime();
        const buildTimeSeconds = Math.round(buildTime / 1000);
        
        config.analytics.totalBuilds++;
        if (success) {
          config.analytics.successfulBuilds++;
        } else {
          config.analytics.failedBuilds++;
        }
        
        const totalTime = (config.analytics.averageBuildTime * (config.analytics.totalBuilds - 1)) + buildTimeSeconds;
        config.analytics.averageBuildTime = Math.round(totalTime / config.analytics.totalBuilds);
        config.analytics.lastBuildTime = buildTimeSeconds;
        
        if (build.platforms) {
          build.platforms.forEach(platform => {
            if (!config.analytics.platformStats[platform]) {
              config.analytics.platformStats[platform] = { total: 0, successful: 0, avgTime: 0 };
            }
            const stats = config.analytics.platformStats[platform];
            stats.total++;
            if (success) stats.successful++;
            const platformTotalTime = (stats.avgTime * (stats.total - 1)) + buildTimeSeconds;
            stats.avgTime = Math.round(platformTotalTime / stats.total);
          });
        }
        
        const project = config.projects.find(p => p.id === build.projectId);
        if (project && config.settings.showNotifications) {
          const notification = new Notification({
            title: success ? '✓ Build Successful' : '✗ Build Failed',
            body: `${project.name} - ${success ? 'Ready to use!' : 'Check logs for details'}`,
            silent: false,
          });
          notification.show();
        }
      }
      
      await saveConfigInternal(config);
      
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

    const profile = project.defaultProfileId 
      ? config.profiles.find(p => p.id === project.defaultProfileId)
      : undefined;

    await buildExecutor.startBuild(nextBuild.id, project, engine, profile);
  } catch (error) {
    console.error('Failed to process next build:', error);
  }
}

async function loadConfig(): Promise<AppConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(data);
    
    if (!config.engines || !config.projects || !config.buildHistory) {
      console.error('Invalid config structure, using defaults');
      return {
        engines: [],
        projects: [],
        buildHistory: [],
        settings: {
          showNotifications: true,
          autoOpenBuildQueue: true,
          maxHistoryBuilds: 20,
          minimizeToTray: false,
        },
        profiles: [
          {
            id: crypto.randomUUID(),
            name: 'Quick Test',
            profileType: 'plugin',
            platforms: ['Win64'],
            description: 'Fast build for Windows only',
          },
          {
            id: crypto.randomUUID(),
            name: 'Desktop',
            profileType: 'plugin',
            platforms: ['Win64', 'Linux', 'Mac'],
            description: 'All desktop platforms',
          },
          {
            id: crypto.randomUUID(),
            name: 'Full Release',
            profileType: 'plugin',
            platforms: ['Win64', 'Linux', 'Mac', 'Android', 'IOS'],
            description: 'All supported platforms',
          },
        ],
        analytics: {
          totalBuilds: 0,
          successfulBuilds: 0,
          failedBuilds: 0,
          averageBuildTime: 0,
          platformStats: {},
        },
      };
    }
    
    if (!config.settings) {
      config.settings = {
        showNotifications: true,
        autoOpenBuildQueue: true,
        maxHistoryBuilds: 20,
        minimizeToTray: false,
      };
    }
    
    if (!config.analytics) {
      config.analytics = {
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        averageBuildTime: 0,
        platformStats: {},
      };
    }
    
    if (!config.profiles) {
      config.profiles = [
        {
          id: crypto.randomUUID(),
          name: 'Quick Test',
          profileType: 'plugin',
          platforms: ['Win64'],
          description: 'Fast build for Windows only',
        },
        {
          id: crypto.randomUUID(),
          name: 'Desktop',
          profileType: 'plugin',
          platforms: ['Win64', 'Linux', 'Mac'],
          description: 'All desktop platforms',
        },
        {
          id: crypto.randomUUID(),
          name: 'Full Release',
          profileType: 'plugin',
          platforms: ['Win64', 'Linux', 'Mac', 'Android', 'IOS'],
          description: 'All supported platforms',
        },
      ];
    }
    
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('Config file not found, creating new one');
    } else {
      console.error('Failed to load config:', error);
    }
    
    return {
      engines: [],
      projects: [],
      buildHistory: [],
      settings: {
        showNotifications: true,
        autoOpenBuildQueue: true,
        maxHistoryBuilds: 20,
        minimizeToTray: false,
      },
      profiles: [
        {
          id: crypto.randomUUID(),
          name: 'Quick Test',
          profileType: 'plugin',
          platforms: ['Win64'],
          description: 'Fast build for Windows only',
        },
        {
          id: crypto.randomUUID(),
          name: 'Desktop',
          profileType: 'plugin',
          platforms: ['Win64', 'Linux', 'Mac'],
          description: 'All desktop platforms',
        },
        {
          id: crypto.randomUUID(),
          name: 'Full Release',
          profileType: 'plugin',
          platforms: ['Win64', 'Linux', 'Mac', 'Android', 'IOS'],
          description: 'All supported platforms',
        },
      ],
      analytics: {
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        averageBuildTime: 0,
        platformStats: {},
      },
    };
  }
}

async function saveConfigInternal(config: AppConfig): Promise<void> {
  try {
    const limit = config.settings.maxHistoryBuilds;
    if (limit > 0) {
      const completedBuilds = config.buildHistory.filter(
        b => b.status === 'success' || b.status === 'failed'
      ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      const activeBuilds = config.buildHistory.filter(
        b => b.status === 'building' || b.status === 'queued'
      );
      
      config.buildHistory = [
        ...activeBuilds,
        ...completedBuilds.slice(0, limit)
      ];
    }
    
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    const configJson = JSON.stringify(config, null, 2);
    
    const tempPath = CONFIG_PATH + '.tmp';
    await fs.writeFile(tempPath, configJson, 'utf-8');
    
    try {
      await fs.rename(tempPath, CONFIG_PATH);
    } catch (renameError) {
      await fs.unlink(tempPath).catch(() => {});
      throw renameError;
    }
  } catch (error) {
    console.error('Failed to save config:', error);
    throw error;
  }
}

const createTray = async () => {
  const config = await loadConfig();
  
  if (!config.settings.minimizeToTray) {
    return;
  }

  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let icon: Electron.NativeImage;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Unreal Builder',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Unreal Builder');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
};

const createWindow = () => {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let windowIcon: Electron.NativeImage;
  
  try {
    windowIcon = nativeImage.createFromPath(iconPath);
    if (windowIcon.isEmpty()) {
      windowIcon = nativeImage.createEmpty();
    }
  } catch (error) {
    windowIcon = nativeImage.createEmpty();
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a1a',
    show: false,
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', async (event) => {
    const config = await loadConfig();
    
    if (config.settings.minimizeToTray && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  createTray();
};

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  console.log('Config path:', CONFIG_PATH);
  createWindow();
});

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
  return await validateEngine(enginePath);
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
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    const buildRecord: BuildRecord = {
      id: crypto.randomUUID(),
      projectId,
      status: 'queued',
      startTime: new Date().toISOString(),
      log: '',
      platforms: project.targetPlatforms,
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

ipcMain.handle('export-logs', async (_event, buildId: string, log: string) => {
  if (!mainWindow) return;
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `build-log-${buildId}.txt`,
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  });
  
  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, log, 'utf-8');
  }
});

ipcMain.handle('open-folder', async (_event, folderPath: string) => {
  const { shell } = require('electron');
  await shell.openPath(folderPath);
});