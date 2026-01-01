import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, BuildStage } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const BUILD_STAGES: BuildStage[] = ['setup', 'editor', 'development', 'shipping'];

const STAGE_LABELS = {
  setup: 'Setup',
  editor: 'Editor',
  development: 'Development',
  shipping: 'Shipping',
  queued: 'Queued',
  complete: 'Complete',
};

const BuildQueue: React.FC<Props> = ({ config, saveConfig }) => {
  const [buildLogs, setBuildLogs] = useState<Record<string, string>>({});
  const [expandedBuild, setExpandedBuild] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const logsFromConfig: Record<string, string> = {};
    config.buildHistory.forEach(build => {
      if (build.log) {
        logsFromConfig[build.id] = build.log;
      }
    });
    setBuildLogs(logsFromConfig);
  }, [config]);

  useEffect(() => {
    const handleBuildLog = (buildId: string, log: string) => {
      setBuildLogs(prev => {
        const updatedLog = (prev[buildId] || '') + log;
        
        if (buildId === activeBuildId) {
          const detectedStage = getCurrentStageIndex(updatedLog);
          if (detectedStage > currentStageIndex) {
            setCurrentStageIndex(detectedStage);
          }
        }
        
        return {
          ...prev,
          [buildId]: updatedLog,
        };
      });
    };

    const handleBuildComplete = (buildId: string, success: boolean) => {
      if (buildId === activeBuildId) {
        setCurrentStageIndex(-1);
        setActiveBuildId(null);
      }
    };

    const handleBuildStarted = (buildId: string) => {
      setExpandedBuild(buildId);
      setElapsedTime(0);
      setCurrentStageIndex(-1);
      setActiveBuildId(buildId);
    };

    window.electronAPI.onBuildLog(handleBuildLog);
    window.electronAPI.onBuildComplete(handleBuildComplete);
    window.electronAPI.onBuildStarted(handleBuildStarted);
  }, [activeBuildId, currentStageIndex]);

  useEffect(() => {
    if (autoScroll && expandedBuild && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildLogs, expandedBuild, autoScroll]);

  useEffect(() => {
    const activeBuild = config.buildHistory.find(b => b.status === 'building');
    
    if (!activeBuild) {
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(activeBuild.startTime).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [config.buildHistory]);

  const handleCancelBuild = async () => {
    if (confirm('Cancel the current build?')) {
      await window.electronAPI.cancelBuild();
    }
  };

  const handleExportLogs = async (buildId: string) => {
    const log = buildLogs[buildId];
    if (log) {
      await window.electronAPI.exportLogs(buildId, log);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all build history? This cannot be undone.')) return;
    
    await saveConfig({
      ...config,
      buildHistory: config.buildHistory.filter(b => b.status === 'building' || b.status === 'queued'),
    });
  };

  const handleOpenOutputFolder = async (projectId: string) => {
    const project = config.projects.find(p => p.id === projectId);
    if (project) {
      const outPath = `${project.outputPath}/${project.name}`;
      await window.electronAPI.openFolder(outPath);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCurrentStageIndex = (log: string): number => {
    const logLower = log.toLowerCase();
    
    if (logLower.includes('building unrealgame') && logLower.includes('shipping')) return 3;
    if (logLower.includes('manifest-unrealgame-win64-shipping')) return 3;
    if (logLower.includes('uba-unrealgame-win64-shipping')) return 3;
    
    if (logLower.includes('building unrealgame') && logLower.includes('development')) return 2;
    if (logLower.includes('manifest-unrealgame-win64-development')) return 2;
    if (logLower.includes('uba-unrealgame-win64-development')) return 2;
    
    if (logLower.includes('building unrealeditor')) return 1;
    if (logLower.includes('manifest-unrealeditor-win64-development')) return 1;
    if (logLower.includes('uba-unrealeditor-win64-development')) return 1;
    
    if (logLower.includes('running automationtool') || logLower.includes('runuat')) return 0;
    if (logLower.includes('initializing script modules')) return 0;
    
    return -1;
  };

  const activeBuild = config.buildHistory.find(b => b.status === 'building');
  const queuedBuilds = config.buildHistory.filter(b => b.status === 'queued');
  const completedBuilds = config.buildHistory
    .filter(b => b.status === 'success' || b.status === 'failed')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 20);

  const getProjectName = (projectId: string) => {
    return config.projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    return formatTime(duration);
  };
  
  useEffect(() => {
    if (activeBuild && activeBuild.id !== activeBuildId) {
      setActiveBuildId(activeBuild.id);
      setCurrentStageIndex(-1);
      
      const currentLog = buildLogs[activeBuild.id] || '';
      if (currentLog) {
        const detectedStage = getCurrentStageIndex(currentLog);
        if (detectedStage >= 0) {
          setCurrentStageIndex(detectedStage);
        }
      }
    } else if (!activeBuild && activeBuildId) {
      setActiveBuildId(null);
      setCurrentStageIndex(-1);
    }
  }, [activeBuild, activeBuildId, buildLogs]);

  if (!activeBuild && queuedBuilds.length === 0 && completedBuilds.length === 0) {
    return (
      <div className="page build-queue">
        <header className="page-header">
          <h2>Build Queue</h2>
        </header>
        <div className="empty-state">
          <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>
            pending_actions
          </span>
          <h3>No Builds Yet</h3>
          <p>Build history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page build-queue">
      <header className="page-header">
        <h2>Build Queue</h2>
        {completedBuilds.length > 0 && (
          <button className="btn btn-secondary" onClick={handleClearHistory}>
            <span className="material-symbols-outlined">delete_sweep</span>
            Clear History
          </button>
        )}
      </header>

      <div className="page-content">
        {activeBuild && (
          <div className="section">
            <div className="build-pipeline-container">
              <div className="build-stats-row">
                <div className="build-stat-card">
                  <span className="material-symbols-outlined">schedule</span>
                  <div>
                    <div className="stat-label">Time Elapsed</div>
                    <div className="stat-value">{formatTime(elapsedTime)}</div>
                  </div>
                </div>
              </div>

              <div className="pipeline-section">
                <div className="pipeline-header">
                  <h3>Build Progress</h3>
                  <div className="pipeline-status">
                    {currentStageIndex >= 0 && currentStageIndex < BUILD_STAGES.length && (
                      <span className="pipeline-status">
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                          sync
                        </span>
                        {currentStageIndex === 0 && 'Initializing...'}
                        {currentStageIndex === 1 && 'Building Editor...'}
                        {currentStageIndex === 2 && 'Building Development...'}
                        {currentStageIndex === 3 && 'Building Shipping...'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="build-pipeline">
                  {BUILD_STAGES.map((stage, index) => {
                    const isComplete = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const isUpcoming = index > currentStageIndex;

                    return (
                      <React.Fragment key={stage}>
                        <div className={`pipeline-stage ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}>
                          <div className="pipeline-stage-icon">
                            {isComplete ? (
                              <span className="material-symbols-outlined">check_circle</span>
                            ) : isCurrent ? (
                              <div className="spinner small"></div>
                            ) : (
                              <div className="pipeline-stage-dot"></div>
                            )}
                          </div>
                          <div className="pipeline-stage-label">{STAGE_LABELS[stage]}</div>
                        </div>
                        {index < BUILD_STAGES.length - 1 && (
                          <div className={`pipeline-connector ${isComplete ? 'complete' : ''}`}></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="build-log-panel">
                <div className="build-log-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>terminal</span>
                    <span>Output Log</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      Auto-scroll
                    </label>
                    <button className="btn btn-text" onClick={() => handleExportLogs(activeBuild.id)} title="Export logs">
                      <span className="material-symbols-outlined">download</span>
                    </button>
                    <button className="btn btn-danger" onClick={handleCancelBuild}>
                      <span className="material-symbols-outlined">close</span>
                      Cancel Build
                    </button>
                  </div>
                </div>
                <pre className="build-log">
                  {buildLogs[activeBuild.id] || 'Initializing build...\n'}
                  <div ref={logEndRef} />
                </pre>
              </div>
            </div>
          </div>
        )}

        {queuedBuilds.length > 0 && (
          <div className="section">
            <h3>Queued ({queuedBuilds.length})</h3>
            {queuedBuilds.map(build => (
              <div key={build.id} className="build-item queued">
                <div className="build-status">
                  <span className="material-symbols-outlined">schedule</span>
                  Queued
                </div>
                <div className="build-info">
                  <h4>{getProjectName(build.projectId)}</h4>
                  {build.platforms && (
                    <div className="project-platforms" style={{ marginTop: '0.25rem' }}>
                      {build.platforms.map(platform => (
                        <span key={platform} className="platform-chip">
                          {platform}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {completedBuilds.length > 0 && (
          <div className="section">
            <h3>History</h3>
            {completedBuilds.map(build => (
              <div key={build.id}>
                <div className={`build-item ${build.status} ${expandedBuild === build.id ? 'expanded' : ''}`}>
                  <div 
                    className="build-item-clickable"
                    onClick={() => setExpandedBuild(expandedBuild === build.id ? null : build.id)}
                  >
                    <div className="build-status">
                      <span className="material-symbols-outlined">
                        {build.status === 'success' ? 'check_circle' : 'error'}
                      </span>
                      {build.status === 'success' ? 'Success' : 'Failed'}
                    </div>
                    <div className="build-info">
                      <h4>{getProjectName(build.projectId)}</h4>
                      <p>
                        {new Date(build.startTime).toLocaleString()}
                        {build.endTime && ` • ${formatDuration(build.startTime, build.endTime)}`}
                      </p>
                      {build.platforms && (
                        <div className="project-platforms" style={{ marginTop: '0.25rem' }}>
                          {build.platforms.map(platform => (
                            <span key={platform} className="platform-chip">
                              {platform}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="material-symbols-outlined expand-icon">
                      chevron_right
                    </span>
                  </div>
                  <div className="build-actions">
                    <button 
                      className="btn btn-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOutputFolder(build.projectId);
                      }}
                      title="Open output folder"
                    >
                      <span className="material-symbols-outlined">folder_open</span>
                    </button>
                    <button 
                      className="btn btn-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportLogs(build.id);
                      }}
                      title="Export logs"
                    >
                      <span className="material-symbols-outlined">download</span>
                    </button>
                  </div>
                </div>

                {expandedBuild === build.id && (
                  <div className="build-log-container">
                    <div className="build-log-header">
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>terminal</span>
                      <span>Build Log</span>
                    </div>
                    <pre className="build-log">
                      {buildLogs[build.id] || 'No logs available. Build may have failed before generating output.'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildQueue;