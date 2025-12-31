import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EngineInstallation } from '../shared/types';

const execAsync = promisify(exec);

export async function scanEngines(): Promise<EngineInstallation[]> {
  const engines: EngineInstallation[] = [];
  const foundPaths = new Set<string>();

  await scanRegistry(engines, foundPaths);
  await scanCommonPaths(engines, foundPaths);

  return engines;
}

async function scanRegistry(engines: EngineInstallation[], foundPaths: Set<string>) {
  if (process.platform !== 'win32') return;

  try {
    const { stdout } = await execAsync(
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\EpicGames\\Unreal Engine" /s',
      { timeout: 5000 }
    );

    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/InstallLocation\s+REG_SZ\s+(.+)/);
      if (match) {
        const enginePath = match[1].trim();
        if (!foundPaths.has(enginePath) && await validateEngine(enginePath)) {
          foundPaths.add(enginePath);
          engines.push(await createEngineInfo(enginePath, 'launcher'));
        }
      }
    }
  } catch (error) {
    console.log('Registry scan failed (normal if no Launcher installs):', error);
  }
}

async function scanCommonPaths(engines: EngineInstallation[], foundPaths: Set<string>) {
  const drives = ['C:', 'D:', 'E:'];
  const commonBases = [
    'Program Files\\Epic Games',
    'Epic Games',
    'UnrealEngine',
  ];

  for (const drive of drives) {
    for (const base of commonBases) {
      const searchPath = path.join(drive, base);
      try {
        const dirs = await fs.readdir(searchPath);
        for (const dir of dirs) {
          if (dir.startsWith('UE_') || dir.startsWith('UnrealEngine-')) {
            const enginePath = path.join(searchPath, dir);
            if (!foundPaths.has(enginePath) && await validateEngine(enginePath)) {
              foundPaths.add(enginePath);
              engines.push(await createEngineInfo(enginePath, 'launcher'));
            }
          }
        }
      } catch {
        // Path doesn't exist, skip
      }
    }
  }
}

export async function validateEngine(enginePath: string): Promise<boolean> {
  try {
    const runatPath = path.join(enginePath, 'Engine', 'Build', 'BatchFiles', 'RunUAT.bat');
    await fs.access(runatPath);
    return true;
  } catch {
    return false;
  }
}

async function createEngineInfo(
  enginePath: string, 
  type: 'launcher' | 'source'
): Promise<EngineInstallation> {
  const version = await detectVersion(enginePath);
  
  return {
    id: crypto.randomUUID(),
    version,
    path: enginePath,
    type,
    validated: true,
  };
}

async function detectVersion(enginePath: string): Promise<string> {
  try {
    const buildVersionPath = path.join(enginePath, 'Engine', 'Build', 'Build.version');
    const content = await fs.readFile(buildVersionPath, 'utf-8');
    const versionData = JSON.parse(content);
    const major = versionData.MajorVersion || 5;
    const minor = versionData.MinorVersion || 0;
    return `${major}.${minor}`;
  } catch {
    const match = enginePath.match(/UE[_-](\d+)\.(\d+)/i);
    if (match) {
      return `${match[1]}.${match[2]}`;
    }
    return 'Unknown';
  }
}