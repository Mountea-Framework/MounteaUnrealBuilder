import React, { useState, useEffect, useRef } from 'react';
import { AppConfig } from '../../shared/types';

interface Props {
  config: AppConfig;
}

const BuildQueue: React.FC<Props> = ({ config }) => {
  const [buildLogs, setBuildLogs] = useState<Record<string, string>>({});
  const [expandedBuild, setExpandedBuild] = useState<string | null>(null);
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
      setBuildLogs(prev => ({
        ...prev,
        [buildId]: (prev[buildId] || '') + log,
      }));
    };

    const handleBuildComplete = (buildId: string, success: boolean) => {
      console.log(`Build ${buildId} completed: ${success ? 'success' : 'failed'}`);
    };

    const handleBuildStarted = (buildId: string) => {
      setExpandedBuild(buildId);
    };

    window.electronAPI.onBuildLog(handleBuildLog);
    window.electronAPI.onBuildComplete(handleBuildComplete);
    window.electronAPI.onBuildStarted(handleBuildStarted);
  }, []);

  useEffect(() => {
    if (expandedBuild && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildLogs, expandedBuild]);

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
    
    const updatedConfig = {
      ...config,
      buildHistory: config.buildHistory.filter(b => b.status === 'building' || b.status === 'queued'),
    };
    
    await window.electronAPI.saveConfig(updatedConfig);
  };

  const handleOpenOutputFolder = async (projectId: string) => {
    const project = config.projects.find(p => p.id === projectId);
    if (project) {
      await window.electronAPI.openFolder(project.outputPath);
    }
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
    
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

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
            <h3>Active Build</h3>
            <div className="build-item active">
              <div className="build-status">
                <div className="spinner small"></div>
                Building
              </div>
              <div className="build-info">
                <h4>{getProjectName(activeBuild.projectId)}</h4>
                <p>Started: {new Date(activeBuild.startTime).toLocaleTimeString()} • {formatDuration(activeBuild.startTime)}</p>
              </div>
              <button className="btn btn-danger" onClick={handleCancelBuild}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
            </div>

            {activeBuild && (
              <div className="build-log-container">
                <div className="build-log-header">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>terminal</span>
                  <span>Build Log</span>
                </div>
                <pre className="build-log">
                  {buildLogs[activeBuild.id] || 'Initializing build...\n'}
                  <div ref={logEndRef} />
                </pre>
              </div>
            )}
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