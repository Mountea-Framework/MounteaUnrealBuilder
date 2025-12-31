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
  const [selectedProfiles, setSelectedProfiles] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    pluginPath: '',
    engineId: '',
    targetPlatforms: ['Win64'],
    outputPath: '',
    defaultProfileId: '',
  });

  const handleBuild = async (projectId: string) => {
    try {
      await window.electronAPI.startBuild(projectId);
    } catch (error) {
      alert('Failed to start build: ' + (error as Error).message);
    }
  };

  const handleBuildWithProfile = async (projectId: string, profileId: string) => {
    const profile = config.profiles.find(p => p.id === profileId);
    const project = config.projects.find(p => p.id === projectId);
    
    if (!profile || !project) return;

    const tempProject = {
      ...project,
      targetPlatforms: profile.platforms,
    };

    await saveConfig({
      ...config,
      projects: config.projects.map(p => p.id === projectId ? tempProject : p),
    });

    await handleBuild(projectId);
  };

  const handleOpenOutputFolder = async (outputPath: string) => {
    await window.electronAPI.openFolder(outputPath);
  };

  const startAddProject = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      pluginPath: '',
      engineId: config.engines[0]?.id || '',
      targetPlatforms: ['Win64'],
      outputPath: '',
      defaultProfileId: '',
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
      defaultProfileId: project.defaultProfileId || '',
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
      defaultProfileId: formData.defaultProfileId || undefined,
    };

    const updatedProjects = editingProject
      ? config.projects.map(p => (p.id === editingProject.id ? projectData : p))
      : [...config.projects, projectData];

    await saveConfig({
      ...config,
      projects: updatedProjects,
    });

    setShowProjectForm(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This will also remove its build history.')) {
      return;
    }

    await saveConfig({
      ...config,
      projects: config.projects.filter(p => p.id !== projectId),
      buildHistory: config.buildHistory.filter(b => b.projectId !== projectId),
    });
  };

  const getEngineName = (engineId: string) => {
    const engine = config.engines.find(e => e.id === engineId);
    return engine ? `Unreal Engine ${engine.version}` : 'Unknown Engine';
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Projects</h2>
        <button className="btn btn-primary" onClick={startAddProject}>
          <span className="material-symbols-outlined">add</span>
          New Project
        </button>
      </header>

      <div className="page-content">
        {config.projects.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>
              folder_open
            </span>
            <h3>No Projects Yet</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={startAddProject}>
              <span className="material-symbols-outlined">add</span>
              Add Project
            </button>
          </div>
        )}

        {config.projects.length > 0 && (
          <div className="project-grid">
            {config.projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <div className="project-info">
                    <h3>{project.name}</h3>
                    <span className="project-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                        extension
                      </span>
                      {getEngineName(project.engineId)}
                    </span>
                  </div>
                </div>

                <div className="project-details">
                  <div className="project-detail">
                    <span className="material-symbols-outlined">description</span>
                    <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem' }}>
                      {project.pluginPath.split(/[\\/]/).pop()}
                    </span>
                  </div>
                  <div className="project-detail">
                    <span className="material-symbols-outlined">folder</span>
                    <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.outputPath}
                    </span>
                  </div>
                  <div className="project-detail">
                    <span className="material-symbols-outlined">devices</span>
                    <div className="project-platforms">
                      {project.targetPlatforms.map(platform => (
                        <span key={platform} className="platform-chip">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="project-actions">
                  {config.profiles.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                      <select
                        className="select-input"
                        value={selectedProfiles[project.id] || project.defaultProfileId || ''}
                        onChange={(e) => setSelectedProfiles({ ...selectedProfiles, [project.id]: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        <option value="">Custom Platforms</option>
                        {config.profiles.map(profile => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name} ({profile.platforms.join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button className="btn btn-secondary" onClick={() => startEditProject(project)}>
                    <span className="material-symbols-outlined">edit</span>
                    Edit
                  </button>
                  <button
                    className="btn btn-text"
                    onClick={() =>handleOpenOutputFolder(`${project.outputPath}/${project.name}`)}
                    title="Open output folder"
                  >
                    <span className="material-symbols-outlined">folder_open</span>
                    Output
                  </button>
                  <button className="btn btn-text" onClick={() => handleDeleteProject(project.id)}>
                    <span className="material-symbols-outlined">delete</span>
                    Delete
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      const profileId = selectedProfiles[project.id] || project.defaultProfileId;
                      if (profileId) {
                        handleBuildWithProfile(project.id, profileId);
                      } else {
                        handleBuild(project.id);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                    Build
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showProjectForm && (
        <div className="form-modal">
          <div className="form-container">
            <div className="form-header">
              <h3>
                <span className="material-symbols-outlined">
                  {editingProject ? 'edit' : 'add'}
                </span>
                {editingProject ? 'Edit Project' : 'New Project'}
              </h3>
              <button className="btn btn-text" onClick={() => setShowProjectForm(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="form-body">
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Plugin"
                />
              </div>

              <div className="form-group">
                <label>Plugin File (.uplugin) *</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.pluginPath}
                    readOnly
                    placeholder="Select .uplugin file"
                    style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-secondary" onClick={handleSelectPlugin}>
                    <span className="material-symbols-outlined">folder_open</span>
                    Browse
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Engine Version *</label>
                <select
                  className="select-input"
                  value={formData.engineId}
                  onChange={(e) => setFormData({ ...formData, engineId: e.target.value })}
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

              {config.profiles.length > 0 && (
                <div className="form-group">
                  <label>Default Build Profile</label>
                  <select
                    className="select-input"
                    value={formData.defaultProfileId}
                    onChange={(e) => setFormData({ ...formData, defaultProfileId: e.target.value })}
                  >
                    <option value="">None (use custom platforms above)</option>
                    {config.profiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name} - {profile.platforms.join(', ')}
                      </option>
                    ))}
                  </select>
                  <p className="help-text">
                    Set a default profile to quickly build with preset platforms
                  </p>
                </div>
              )}

              <div className="form-group">
                <label>Output Directory *</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.outputPath}
                    readOnly
                    placeholder="Select output directory"
                    style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-secondary" onClick={handleSelectOutput}>
                    <span className="material-symbols-outlined">folder_open</span>
                    Browse
                  </button>
                </div>
              </div>
            </div>

            <div className="form-footer">
              <button className="btn btn-secondary" onClick={() => setShowProjectForm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveProject}>
                <span className="material-symbols-outlined">save</span>
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;