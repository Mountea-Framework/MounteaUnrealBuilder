import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/types';

const api: IPC = {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  scanEngines: () => ipcRenderer.invoke('scan-engines'),
  validateEnginePath: (path) => ipcRenderer.invoke('validate-engine-path', path),
  startBuild: (projectId) => ipcRenderer.invoke('start-build', projectId),
  onBuildLog: (callback) => {
    ipcRenderer.on('build-log', (_event, data) => callback(data));
  },
  onBuildComplete: (callback) => {
    ipcRenderer.on('build-complete', (_event, success) => callback(success));
  },
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
};

contextBridge.exposeInMainWorld('electronAPI', api);