import React, { useState } from 'react';
import { AppConfig, ProjectConfig } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const PLATFORMS = [
  { id: 'Win64', label: 'Windows 64-bit' },
  { id: 'Linux', label: 'Linux' },
  { id: 'Mac', label: 'macOS' },
  { id: 'Android', label: 'Android' },
  { id: 'IOS', label: 'iOS' },
];

const Dashboard: React.FC<Props> = ({ config, saveConfig }) => {
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    pluginPath: '',
    engineId: '',
    targetPlatforms: ['Win64'],
    outputPath: '',
  });

  const handleBuild = async (projectId: string) => {
    try {
      await window.electronAPI.startBuild(projectId);
    } catch (error) {
      alert('Failed to start build: ' + (error as Error).message);
    }
  };

  const startAddProject = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      pluginPath: '',
      engineId: config.engines[0]?.id || '',
      targetPlatforms: ['Win64'],
      outputPath: '',
    });
    setShowProjectForm(true);
  };

  const startEditProject = (project: ProjectConfig) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      pluginPath: project.pluginPath,
      engineId: project.engineId,
      targetPlatforms: project.targetPlatforms,
      outputPath: project.outputPath,
    });
    setShowProjectForm(true);
  };

  const handleSelectPlugin = async () => {
    const filePath = await window.electronAPI.selectFile([
      { name: 'Unreal Plugin', extensions: ['uplugin'] },
    ]);

    if (filePath) {
      setFormData(prev => ({
        ...prev,
        pluginPath: filePath,
        name: prev.name || filePath.split(/[\\/]/).pop()?.replace('.uplugin', '') || '',
      }));
    }
  };

  const handleSelectOutput = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      setFormData(prev => ({ ...prev, outputPath: folderPath }));
    }
  };

  const togglePlatform = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platformId)
        ? prev.targetPlatforms.filter(p => p !== platformId)
        : [...prev.targetPlatforms, platformId],
    }));
  };

  const handleSaveProject = async () => {
    if (!formData.name.trim() || !formData.pluginPath || !formData.outputPath || formData.targetPlatforms.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const projectData: ProjectConfig = {
      id: editingProject?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      pluginPath: formData.pluginPath,
      engineId: formData.engineId,
      targetPlatforms: formData.targetPlatforms,
      outputPath: formData.outputPath,
    };

    const updatedProjects = editingProject
      ? config.projects.map(p => (p.id === editingProject.id ? projectData : p))
      : [...config.projects, projectData];

    await saveConfig({ ...config, projects: updatedProjects });
    setShowProjectForm(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    const updatedConfig = {
      ...config,
      projects: config.projects.filter(p => p.id !== projectId),
      buildHistory: config.buildHistory.filter(b => b.projectId !== projectId),
    };

    await saveConfig(updatedConfig);
  };

  const getEngineVersion = (engineId: string) => {
    const engine = config.engines.find(e => e.id === engineId);
    return engine ? engine.version : 'Unknown';
  };

  if (config.engines.length === 0) {
    return (
      <div className="page dashboard">
        <header className="page-header">
          <h2>Dashboard</h2>
        </header>
        <div className="empty-state">
          <div className="empty-icon">⚙️</div>
          <h3>No Engines Configured</h3>
          <p>Configure at least one Unreal Engine installation before adding projects</p>
        </div>
      </div>
    );
  }

  if (config.projects.length === 0 && !showProjectForm) {
    return (
      <div className="page dashboard">
        <header className="page-header">
          <h2>Dashboard</h2>
        </header>
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Projects Yet</h3>
          <p>Get started by adding your first plugin project</p>
          <button className="btn btn-primary" onClick={startAddProject}>
            + Add Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <header className="page-header">
        <h2>Projects</h2>
        <button className="btn btn-primary" onClick={startAddProject}>
          + Add Project
        </button>
      </header>

      {showProjectForm && (
        <div className="project-form">
          <h3>{editingProject ? 'Edit Project' : 'Add New Project'}</h3>

          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Awesome Plugin"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label>Plugin File (.uplugin) *</label>
            <div className="input-with-button">
              <input
                type="text"
                value={formData.pluginPath}
                readOnly
                placeholder="Select .uplugin file"
                className="text-input"
              />
              <button className="btn btn-secondary" onClick={handleSelectPlugin}>
                Browse
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Engine Version *</label>
            <select
              value={formData.engineId}
              onChange={(e) => setFormData(prev => ({ ...prev, engineId: e.target.value }))}
              className="select-input"
            >
              {config.engines.map(engine => (
                <option key={engine.id} value={engine.id}>
                  Unreal Engine {engine.version}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Target Platforms *</label>
            <div className="checkbox-group">
              {PLATFORMS.map(platform => (
                <label key={platform.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.targetPlatforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                  />
                  <span>{platform.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Output Directory *</label>
            <div className="input-with-button">
              <input
                type="text"
                value={formData.outputPath}
                readOnly
                placeholder="Select output folder"
                className="text-input"
              />
              <button className="btn btn-secondary" onClick={handleSelectOutput}>
                Browse
              </button>
            </div>
          </div>

          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={() => setShowProjectForm(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveProject}>
              {editingProject ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </div>
      )}

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
              <div className="info-row">
                <span className="label">Output:</span>
                <span className="value">{project.outputPath.split(/[\\/]/).pop()}</span>
              </div>
            </div>
            <div className="project-actions">
              <button
                className="btn btn-secondary"
                onClick={() => startEditProject(project)}
              >
                Edit
              </button>
              <button
                className="btn btn-text"
                onClick={() => handleDeleteProject(project.id)}
              >
                Delete
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleBuild(project.id)}
              >
                Build
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;