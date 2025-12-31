export interface EngineInstallation {
  id: string;
  version: string;
  path: string;
  type: 'launcher' | 'source';
  validated: boolean;
}

export interface ProjectConfig {
  id: string;
  name: string;
  pluginPath: string;
  engineId: string;
  targetPlatforms: string[];
  outputPath: string;
}

export interface BuildRecord {
  id: string;
  projectId: string;
  status: 'queued' | 'building' | 'success' | 'failed';
  startTime: string;
  endTime?: string;
  log: string;
}

export interface AppConfig {
  engines: EngineInstallation[];
  projects: ProjectConfig[];
  buildHistory: BuildRecord[];
}

export interface IPC {
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<void>;
  scanEngines: () => Promise<EngineInstallation[]>;
  validateEnginePath: (path: string) => Promise<boolean>;
  startBuild: (projectId: string) => Promise<string>;
  cancelBuild: () => Promise<void>;
  onBuildLog: (callback: (buildId: string, log: string) => void) => void;
  onBuildComplete: (callback: (buildId: string, success: boolean) => void) => void;
  onBuildStarted: (callback: (buildId: string) => void) => void;
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  exportLogs: (buildId: string, log: string) => Promise<void>;
  openFolder: (folderPath: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IPC;
  }
}