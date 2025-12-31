import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import { ProjectConfig, EngineInstallation, BuildRecord } from '../shared/types';

export class BuildExecutor {
  private currentProcess: ChildProcessWithoutNullStreams | null = null;
  private currentBuildId: string | null = null;

  constructor(
    private onLog: (buildId: string, log: string) => void,
    private onComplete: (buildId: string, success: boolean) => void
  ) {}

  async startBuild(
    buildId: string,
    project: ProjectConfig,
    engine: EngineInstallation
  ): Promise<void> {
    if (this.currentProcess) {
      throw new Error('A build is already in progress');
    }

    this.currentBuildId = buildId;

    const runatPath = path.join(
      engine.path,
      'Engine',
      'Build',
      'BatchFiles',
      'RunUAT.bat'
    );

    const args = [
      'BuildPlugin',
      '-Rocket',
      `-Plugin="${project.pluginPath}"`,
      `-TargetPlatforms=${project.targetPlatforms.join('+')}`,
      `-Package="${project.outputPath}"`,
    ];

    this.onLog(buildId, `Starting build: ${project.name}\n`);
    this.onLog(buildId, `Engine: ${engine.version} (${engine.path})\n`);
    this.onLog(buildId, `Platforms: ${project.targetPlatforms.join(', ')}\n`);
    this.onLog(buildId, `Output: ${project.outputPath}\n`);
    this.onLog(buildId, `\n${'='.repeat(80)}\n\n`);

    this.currentProcess = spawn(`"${runatPath}"`, args, {
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

      this.onComplete(buildId, success);
      this.currentProcess = null;
      this.currentBuildId = null;
    });

    this.currentProcess.on('error', (error: Error) => {
      this.onLog(buildId, `\n[FATAL ERROR] ${error.message}\n`);
      this.onComplete(buildId, false);
      this.currentProcess = null;
      this.currentBuildId = null;
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