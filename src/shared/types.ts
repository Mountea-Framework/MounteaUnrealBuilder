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
  projectType: 'plugin' | 'project';
  engineId: string;
  targetPlatforms: string[];
  targetConfig?: 'Development' | 'Shipping';
  outputPath: string;
  defaultProfileId?: string;
}

export type BuildStage = 'queued' | 'setup' | 'editor' | 'development' | 'shipping' | 'cook' | 'build' | 'stage' | 'package' | 'complete';

export interface BuildRecord {
  id: string;
  projectId: string;
  status: 'queued' | 'building' | 'success' | 'failed';
  currentStage?: BuildStage;
  startTime: string;
  endTime?: string;
  log: string;
  platforms?: string[];
}

export interface UserSettings {
  showNotifications: boolean;
  autoOpenBuildQueue: boolean;
  maxHistoryBuilds: number;
  minimizeToTray: boolean;
}

export interface BuildProfile {
  id: string;
  name: string;
  platforms: string[];
  description?: string;
}

export interface BuildAnalytics {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  averageBuildTime: number;
  lastBuildTime?: number;
  platformStats: Record<string, { total: number; successful: number; avgTime: number }>;
}

export interface AppConfig {
  engines: EngineInstallation[];
  projects: ProjectConfig[];
  buildHistory: BuildRecord[];
  settings: UserSettings;
  profiles: BuildProfile[];
  analytics: BuildAnalytics;
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