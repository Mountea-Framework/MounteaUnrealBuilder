import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/types';

const api: IPC = {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  scanEngines: () => ipcRenderer.invoke('scan-engines'),
  validateEnginePath: (path) => ipcRenderer.invoke('validate-engine-path', path),
  startBuild: (projectId) => ipcRenderer.invoke('start-build', projectId),
  cancelBuild: () => ipcRenderer.invoke('cancel-build'),
  onBuildLog: (callback) => {
    ipcRenderer.on('build-log', (_event, buildId, log) => callback(buildId, log));
  },
  onBuildComplete: (callback) => {
    ipcRenderer.on('build-complete', (_event, buildId, success) => callback(buildId, success));
  },
  onBuildStarted: (callback) => {
    ipcRenderer.on('build-started', (_event, buildId) => callback(buildId));
  },
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  exportLogs: (buildId, log) => ipcRenderer.invoke('export-logs', buildId, log),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
};

contextBridge.exposeInMainWorld('electronAPI', api);