import React from 'react';
import { AppConfig } from '../../shared/types';

interface Props {
  config: AppConfig;
}

const BuildQueue: React.FC<Props> = ({ config }) => {
  const activeBuild = config.buildHistory.find(b => b.status === 'building');
  const queuedBuilds = config.buildHistory.filter(b => b.status === 'queued');
  const completedBuilds = config.buildHistory
    .filter(b => b.status === 'success' || b.status === 'failed')
    .slice(0, 10);

  if (!activeBuild && queuedBuilds.length === 0 && completedBuilds.length === 0) {
    return (
      <div className="page build-queue">
        <header className="page-header">
          <h2>Build Queue</h2>
        </header>
        <div className="empty-state">
          <div className="empty-icon">⏱️</div>
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
      </header>

      {activeBuild && (
        <div className="section">
          <h3>Active Build</h3>
          <div className="build-item active">
            <div className="build-status">
              <span className="spinner small"></span>
              Building
            </div>
            <div className="build-info">
              <h4>{config.projects.find(p => p.id === activeBuild.projectId)?.name}</h4>
              <p>Started: {new Date(activeBuild.startTime).toLocaleTimeString()}</p>
            </div>
            <button className="btn btn-danger">Cancel</button>
          </div>
        </div>
      )}

      {queuedBuilds.length > 0 && (
        <div className="section">
          <h3>Queued ({queuedBuilds.length})</h3>
          {queuedBuilds.map(build => (
            <div key={build.id} className="build-item queued">
              <div className="build-status">⏳ Queued</div>
              <div className="build-info">
                <h4>{config.projects.find(p => p.id === build.projectId)?.name}</h4>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedBuilds.length > 0 && (
        <div className="section">
          <h3>History</h3>
          {completedBuilds.map(build => (
            <div key={build.id} className={`build-item ${build.status}`}>
              <div className="build-status">
                {build.status === 'success' ? '✓ Success' : '✗ Failed'}
              </div>
              <div className="build-info">
                <h4>{config.projects.find(p => p.id === build.projectId)?.name}</h4>
                <p>
                  {new Date(build.startTime).toLocaleString()}
                  {build.endTime && ` • ${Math.round((new Date(build.endTime).getTime() - new Date(build.startTime).getTime()) / 1000)}s`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuildQueue;
