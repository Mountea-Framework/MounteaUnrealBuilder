import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import { ProjectConfig, EngineInstallation, BuildRecord } from '../shared/types';

function getUATScriptName(): string {
  switch (process.platform) {
    case 'win32':
      return 'RunUAT.bat';
    case 'darwin':
      return 'RunUAT.sh';
    case 'linux':
      return 'RunUAT.sh';
    default:
      return 'RunUAT.sh';
  }
}

export class BuildExecutor {
  private currentProcess: ChildProcessWithoutNullStreams | null = null;
  private currentBuildId: string | null = null;

  constructor(
    private onLog: (buildId: string, log: string) => void,
    private onComplete: (buildId: string, success: boolean) => void
  ) {}

  private executeScript(
    buildId: string,
    scriptPath: string,
    scriptType: 'pre' | 'post',
    env: Record<string, string>
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.onLog(buildId, `\n${'='.repeat(80)}\n`);
      this.onLog(buildId, `[${scriptType.toUpperCase()}-BUILD SCRIPT] Running: ${scriptPath}\n`);
      
      const startTime = Date.now();
      const scriptProcess = spawn(scriptPath, [], {
        shell: true,
        env: { ...process.env, ...env },
        cwd: path.dirname(scriptPath),
      });

      scriptProcess.stdout.on('data', (data: Buffer) => {
        this.onLog(buildId, data.toString());
      });

      scriptProcess.stderr.on('data', (data: Buffer) => {
        this.onLog(buildId, `[ERROR] ${data.toString()}`);
      });

      scriptProcess.on('close', (code: number) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        if (code === 0) {
          this.onLog(buildId, `[${scriptType.toUpperCase()}-BUILD SCRIPT] Completed successfully in ${duration}s\n`);
          this.onLog(buildId, `${'='.repeat(80)}\n\n`);
          resolve(true);
        } else {
          this.onLog(buildId, `[${scriptType.toUpperCase()}-BUILD SCRIPT] Failed with exit code ${code}\n`);
          this.onLog(buildId, `${'='.repeat(80)}\n\n`);
          resolve(false);
        }
      });

      scriptProcess.on('error', (error: Error) => {
        this.onLog(buildId, `[${scriptType.toUpperCase()}-BUILD SCRIPT ERROR] ${error.message}\n`);
        this.onLog(buildId, `${'='.repeat(80)}\n\n`);
        resolve(false);
      });
    });
  }

  async startBuild(
    buildId: string,
    project: ProjectConfig,
    engine: EngineInstallation,
    profile?: any
  ): Promise<void> {
    if (this.currentProcess) {
      throw new Error('A build is already in progress');
    }

    this.currentBuildId = buildId;

    const outPath = path.join(project.outputPath, project.name);
    const projectDir = path.dirname(project.pluginPath);
    
    const scriptEnv = {
      PROJECT_NAME: project.name,
      PROJECT_PATH: project.pluginPath,
      PROJECT_DIR: projectDir,
      OUTPUT_PATH: outPath,
      ENGINE_VERSION: engine.version,
      ENGINE_PATH: engine.path,
      TARGET_PLATFORMS: project.targetPlatforms.join(','),
      BUILD_CONFIG: project.targetConfig || '',
      PROJECT_TYPE: project.projectType || 'plugin',
    };

    const preBuildScript = profile?.preBuildScript;
    const postBuildScript = profile?.postBuildScript;

    this.onLog(buildId, `Starting build: ${project.name}\n`);
    this.onLog(buildId, `Engine: ${engine.version} (${engine.path})\n`);
    this.onLog(buildId, `Type: ${project.projectType === 'project' ? 'Project' : 'Plugin'}\n`);
    if (project.projectType === 'project') {
      this.onLog(buildId, `Platform: ${project.targetPlatforms[0]}\n`);
      this.onLog(buildId, `Config: ${project.targetConfig || 'Development'}\n`);
    } else {
      this.onLog(buildId, `Platforms: ${project.targetPlatforms.join(', ')}\n`);
    }
    this.onLog(buildId, `Output: ${outPath}\n`);
    
    if (preBuildScript) {
      const preScriptSuccess = await this.executeScript(buildId, preBuildScript, 'pre', scriptEnv);
      if (!preScriptSuccess) {
        this.onLog(buildId, '\n✗ Pre-build script failed. Build aborted.\n');
        this.onComplete(buildId, false);
        this.currentBuildId = null;
        return;
      }
    } else {
      this.onLog(buildId, `\n${'='.repeat(80)}\n\n`);
    }

    const mainBuildSuccess = await this.runMainBuild(buildId, project, engine, outPath);
    
    if (!mainBuildSuccess) {
      this.onComplete(buildId, false);
      this.currentProcess = null;
      this.currentBuildId = null;
      return;
    }

    if (postBuildScript) {
      const postScriptSuccess = await this.executeScript(buildId, postBuildScript, 'post', scriptEnv);
      if (!postScriptSuccess) {
        this.onLog(buildId, '\n⚠ Post-build script failed, but main build succeeded.\n');
      }
    }

    this.onComplete(buildId, true);
    this.currentProcess = null;
    this.currentBuildId = null;
  }

  private runMainBuild(
    buildId: string,
    project: ProjectConfig,
    engine: EngineInstallation,
    outPath: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const scriptName = getUATScriptName();
      const runatPath = path.join(
        engine.path,
        'Engine',
        'Build',
        'BatchFiles',
        scriptName
      );

      let args: string[];
      
      if (project.projectType === 'project') {
        const platform = project.targetPlatforms[0];
        const config = project.targetConfig || 'Development';
        
        args = [
          'BuildCookRun',
          `-project="${project.pluginPath}"`,
          `-platform=${platform}`,
          `-clientconfig=${config}`,
          '-cook',
          '-build',
          '-stage',
          '-pak',
          '-archive',
          `-archivedirectory="${outPath}"`,
          '-noP4',
        ];
      } else {
        args = [
          'BuildPlugin',
          '-Rocket',
          `-Plugin="${project.pluginPath}"`,
          `-TargetPlatforms=${project.targetPlatforms.join('+')}`,
          `-Package="${outPath}"`,
        ];
      }

      const spawnCommand = `"${runatPath}"`;
      
      this.currentProcess = spawn(spawnCommand, args, {
        shell: true,
        cwd: engine.path,
        env: {
          ...process.env,
          UE_BuildRoot: engine.path,
        },
      });

      this.currentProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        this.onLog(buildId, text);
      });

      this.currentProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        this.onLog(buildId, `[ERROR] ${text}`);
      });

      this.currentProcess.on('close', (code: number) => {
        const success = code === 0;
        
        this.onLog(
          buildId,
          `\n${'='.repeat(80)}\n`
        );
        this.onLog(
          buildId,
          success
            ? '✓ Build completed successfully!\n'
            : `✗ Build failed with exit code ${code}\n`
        );

        resolve(success);
      });

      this.currentProcess.on('error', (error: Error) => {
        this.onLog(buildId, `\n[FATAL ERROR] ${error.message}\n`);
        resolve(false);
      });
    });
  }

  cancelBuild(): void {
    if (this.currentProcess && this.currentBuildId) {
      this.onLog(this.currentBuildId, '\n[BUILD CANCELLED BY USER]\n');
      this.currentProcess.kill('SIGTERM');
      this.onComplete(this.currentBuildId, false);
      this.currentProcess = null;
      this.currentBuildId = null;
    }
  }

  isBuilding(): boolean {
    return this.currentProcess !== null;
  }

  getCurrentBuildId(): string | null {
    return this.currentBuildId;
  }
}