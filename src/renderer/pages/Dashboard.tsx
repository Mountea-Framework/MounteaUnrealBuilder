import React, { useState } from 'react';
import { AppConfig, ProjectConfig } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const Dashboard: React.FC<Props> = ({ config, saveConfig }) => {
  const [showAddProject, setShowAddProject] = useState(false);

  const getEngineVersion = (engineId: string) => {
    const engine = config.engines.find(e => e.id === engineId);
    return engine ? engine.version : 'Unknown';
  };

  if (config.projects.length === 0) {
    return (
      <div className="page dashboard">
        <header className="page-header">
          <h2>Dashboard</h2>
        </header>
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Projects Yet</h3>
          <p>Get started by adding your first plugin project</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddProject(true)}
          >
            Add Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <header className="page-header">
        <h2>Projects</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddProject(true)}
        >
          + Add Project
        </button>
      </header>

      <div className="project-grid">
        {config.projects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <h3>{project.name}</h3>
              <span className="engine-badge">UE {getEngineVersion(project.engineId)}</span>
            </div>
            <div className="project-info">
              <div className="info-row">
                <span className="label">Plugin:</span>
                <span className="value">{project.pluginPath.split(/[\\/]/).pop()}</span>
              </div>
              <div className="info-row">
                <span className="label">Platforms:</span>
                <span className="value">{project.targetPlatforms.join(', ')}</span>
              </div>
            </div>
            <div className="project-actions">
              <button className="btn btn-secondary">Edit</button>
              <button className="btn btn-primary">Build</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
