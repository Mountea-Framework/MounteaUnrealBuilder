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
  startBuild: (projectId: string) => Promise<void>;
  onBuildLog: (callback: (data: string) => void) => void;
  onBuildComplete: (callback: (success: boolean) => void) => void;
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: IPC;
  }
}