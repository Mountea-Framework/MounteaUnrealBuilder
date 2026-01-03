import React, { useState } from 'react';
import { AppConfig, BuildProfile } from '../../shared/types';

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

const Profiles: React.FC<Props> = ({ config, saveConfig }) => {
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BuildProfile | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    profileType: 'plugin' as 'plugin' | 'project',
    platforms: ['Win64'],
    targetConfig: 'Development' as 'Development' | 'Shipping',
    description: '',
    preBuildScript: '',
    postBuildScript: '',
    customVariables: [] as { name: string; value: string }[],
  });

  const startAddProfile = () => {
    setEditingProfile(null);
    setShowAdvanced(false);
    setFormData({
      name: '',
      profileType: 'plugin',
      platforms: ['Win64'],
      targetConfig: 'Development',
      description: '',
      preBuildScript: '',
      postBuildScript: '',
      customVariables: [],
    });
    setShowProfileForm(true);
  };

  const startEditProfile = (profile: BuildProfile) => {
    setEditingProfile(profile);
    const hasAdvanced = !!(profile.preBuildScript || profile.postBuildScript || (profile.customVariables && profile.customVariables.length > 0));
    setShowAdvanced(hasAdvanced);
    setFormData({
      name: profile.name,
      profileType: profile.profileType || 'plugin',
      platforms: profile.platforms,
      targetConfig: profile.targetConfig || 'Development',
      description: profile.description || '',
      preBuildScript: profile.preBuildScript || '',
      postBuildScript: profile.postBuildScript || '',
      customVariables: profile.customVariables || [],
    });
    setShowProfileForm(true);
  };

  const togglePlatform = (platformId: string) => {
    setFormData(prev => {
      if (prev.profileType === 'project') {
        return { ...prev, platforms: [platformId] };
      }
      
      return {
        ...prev,
        platforms: prev.platforms.includes(platformId)
          ? prev.platforms.filter(p => p !== platformId)
          : [...prev.platforms, platformId],
      };
    });
  };

  const handleSelectPreBuildScript = async () => {
    const filePath = await window.electronAPI.selectFile([
      { name: 'Script Files', extensions: ['bat', 'cmd', 'ps1', 'sh', 'bash'] },
      { name: 'All Files', extensions: ['*'] },
    ]);
    if (filePath) {
      setFormData(prev => ({ ...prev, preBuildScript: filePath }));
    }
  };

  const handleSelectPostBuildScript = async () => {
    const filePath = await window.electronAPI.selectFile([
      { name: 'Script Files', extensions: ['bat', 'cmd', 'ps1', 'sh', 'bash'] },
      { name: 'All Files', extensions: ['*'] },
    ]);
    if (filePath) {
      setFormData(prev => ({ ...prev, postBuildScript: filePath }));
    }
  };

  const handleAddVariable = () => {
    setFormData(prev => ({
      ...prev,
      customVariables: [...prev.customVariables, { name: '', value: '' }],
    }));
  };

  const handleUpdateVariable = (index: number, field: 'name' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      customVariables: prev.customVariables.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  const handleDeleteVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customVariables: prev.customVariables.filter((_, i) => i !== index),
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || formData.platforms.length === 0) {
      alert('Please provide a name and select at least one platform');
      return;
    }

    const validVariables = formData.customVariables.filter(v => v.name.trim() && v.value.trim());

    const profileData: BuildProfile = {
      id: editingProfile?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      profileType: formData.profileType,
      platforms: formData.platforms,
      targetConfig: formData.profileType === 'project' ? formData.targetConfig : undefined,
      description: formData.description.trim() || undefined,
      preBuildScript: formData.preBuildScript || undefined,
      postBuildScript: formData.postBuildScript || undefined,
      customVariables: validVariables.length > 0 ? validVariables : undefined,
    };

    const updatedProfiles = editingProfile
      ? config.profiles.map(p => (p.id === editingProfile.id ? profileData : p))
      : [...config.profiles, profileData];

    await saveConfig({
      ...config,
      profiles: updatedProfiles,
    });

    setShowProfileForm(false);
  };

  const handleDuplicateProfile = async (profile: BuildProfile) => {
    const duplicatedProfile: BuildProfile = {
      id: crypto.randomUUID(),
      name: `${profile.name} (Copy)`,
      profileType: profile.profileType || 'plugin',
      platforms: [...profile.platforms],
      targetConfig: profile.targetConfig,
      description: profile.description,
      preBuildScript: profile.preBuildScript,
      postBuildScript: profile.postBuildScript,
      customVariables: profile.customVariables ? [...profile.customVariables] : undefined,
    };

    await saveConfig({
      ...config,
      profiles: [...config.profiles, duplicatedProfile],
    });
  };

  const handleDeleteProfile = async (profileId: string) => {
    const usedByProjects = config.projects.filter(p => p.defaultProfileId === profileId);
    
    if (usedByProjects.length > 0) {
      const projectNames = usedByProjects.map(p => p.name).join(', ');
      alert(`Cannot delete profile: Used by projects (${projectNames})`);
      return;
    }

    if (!confirm('Delete this profile?')) {
      return;
    }

    await saveConfig({
      ...config,
      profiles: config.profiles.filter(p => p.id !== profileId),
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Build Profiles</h2>
        <button className="btn btn-primary" onClick={startAddProfile}>
          <span className="material-symbols-outlined">add</span>
          New Profile
        </button>
      </header>

      <div className="page-content">
        <div className="section">
          <h3>Your Profiles</h3>
          <p className="help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Create reusable platform configurations for quick building
          </p>

          {config.profiles.length === 0 && (
            <div className="empty-state">
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>
                layers
              </span>
              <h3>No Profiles Yet</h3>
              <p>Create your first build profile to get started</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={startAddProfile}>
                <span className="material-symbols-outlined">add</span>
                Create Profile
              </button>
            </div>
          )}

          {config.profiles.length > 0 && (
            <div className="project-grid">
              {config.profiles.map(profile => {
                const usedByProjects = config.projects.filter(p => p.defaultProfileId === profile.id);
                
                return (
                  <div key={profile.id} className="project-card">
                    <div className="project-header">
                      <div className="project-info">
                        <h3>{profile.name}</h3>
                        <span className="project-badge">
                          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                            {(profile.profileType || 'plugin') === 'project' ? 'sports_esports' : 'extension'}
                          </span>
                          {(profile.profileType || 'plugin') === 'project' ? 'Project Profile' : 'Plugin Profile'}
                        </span>
                        {profile.description && (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {profile.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="project-details">
                      <div className="project-detail">
                        <span className="material-symbols-outlined">devices</span>
                        <div className="project-platforms">
                          {profile.platforms.map(platform => (
                            <span key={platform} className="platform-chip">
                              {platform}
                            </span>
                          ))}
                          {profile.profileType === 'project' && profile.targetConfig && (
                            <span className="platform-chip" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                              {profile.targetConfig}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {(profile.preBuildScript || profile.postBuildScript) && (
                        <div className="project-detail">
                          <span className="material-symbols-outlined">code</span>
                          <span style={{ fontSize: '0.8125rem' }}>
                            {profile.preBuildScript && profile.postBuildScript ? 'Pre & Post Scripts' : 
                             profile.preBuildScript ? 'Pre-Build Script' : 'Post-Build Script'}
                          </span>
                        </div>
                      )}
                      
                      {usedByProjects.length > 0 && (
                        <div className="project-detail">
                          <span className="material-symbols-outlined">folder_open</span>
                          <span style={{ fontSize: '0.8125rem' }}>
                            Used by {usedByProjects.length} project{usedByProjects.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="project-actions">
                      <button className="btn btn-secondary" onClick={() => startEditProfile(profile)}>
                        <span className="material-symbols-outlined">edit</span>
                        Edit
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleDuplicateProfile(profile)}>
                        <span className="material-symbols-outlined">content_copy</span>
                        Duplicate
                      </button>
                      <button className="btn btn-text" onClick={() => handleDeleteProfile(profile.id)}>
                        <span className="material-symbols-outlined">delete</span>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showProfileForm && (
        <div className="form-modal">
          <div className="form-container">
            <div className="form-header">
              <h3>
                <span className="material-symbols-outlined">
                  {editingProfile ? 'edit' : 'add'}
                </span>
                {editingProfile ? 'Edit Profile' : 'New Profile'}
              </h3>
              <button className="btn btn-text" onClick={() => setShowProfileForm(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="form-body">
              <div className="form-group">
                <label>Profile Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Desktop Release"
                />
              </div>

              <div className="form-group">
                <label>Profile Type *</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="profileType"
                      checked={formData.profileType === 'plugin'}
                      onChange={() => setFormData({ ...formData, profileType: 'plugin', platforms: formData.platforms.length === 1 ? ['Win64'] : formData.platforms })}
                    />
                    <span>Plugin Profile</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="profileType"
                      checked={formData.profileType === 'project'}
                      onChange={() => setFormData({ ...formData, profileType: 'project', platforms: [formData.platforms[0] || 'Win64'] })}
                    />
                    <span>Project Profile</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Build configuration for..."
                />
              </div>

              <div className="form-group">
                <label>Target Platform{formData.profileType === 'plugin' ? 's' : ''} *</label>
                {formData.profileType === 'project' && (
                  <p className="help-text" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                    Project profiles build one platform at a time.
                  </p>
                )}
                <div className="checkbox-group">
                  {PLATFORMS.map(platform => (
                    <label key={platform.id} className="checkbox-label">
                      <input
                        type={formData.profileType === 'project' ? 'radio' : 'checkbox'}
                        name={formData.profileType === 'project' ? 'platform' : undefined}
                        checked={formData.platforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                      />
                      <span>{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.profileType === 'project' && (
                <div className="form-group">
                  <label>Build Configuration *</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        name="targetConfig"
                        checked={formData.targetConfig === 'Development'}
                        onChange={() => setFormData({ ...formData, targetConfig: 'Development' })}
                      />
                      <span>Development (Debug)</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        name="targetConfig"
                        checked={formData.targetConfig === 'Shipping'}
                        onChange={() => setFormData({ ...formData, targetConfig: 'Shipping' })}
                      />
                      <span>Shipping (Release)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Pre-Build Script (Optional)</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.preBuildScript}
                    readOnly
                    placeholder="Select script to run before build (.bat, .sh, .ps1)"
                    style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-secondary" onClick={handleSelectPreBuildScript}>
                    <span className="material-symbols-outlined">folder_open</span>
                    Browse
                  </button>
                </div>
                <p className="help-text">
                  Runs before build starts. Use for cleanup, preparation, etc.
                </p>
              </div>

              <div className="form-group">
                <label>Post-Build Script (Optional)</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.postBuildScript}
                    readOnly
                    placeholder="Select script to run after build (.bat, .sh, .ps1)"
                    style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-secondary" onClick={handleSelectPostBuildScript}>
                    <span className="material-symbols-outlined">folder_open</span>
                    Browse
                  </button>
                </div>
                <p className="help-text">
                  Runs after successful build. Use for packaging, archiving, etc.
                </p>
              </div>

              <div className="form-group" style={{ marginTop: '2rem' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', transition: 'transform 0.2s', transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    chevron_right
                  </span>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                    Advanced Settings
                  </h4>
                </div>
              </div>

              {showAdvanced && (
                <>
                  <div className="form-group">
                    <label>Built-in Variables</label>
                    <div style={{ 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '1rem',
                      fontSize: '0.8125rem',
                      fontFamily: 'Consolas, monospace'
                    }}>
                      <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
                        These variables are automatically available in your scripts:
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div style={{ color: 'var(--primary)' }}>PROJECT_NAME</div>
                        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>Plugin/project name</div>
                        
                        <div style={{ color: 'var(--primary)' }}>ENGINE_PATH</div>
                        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>Full engine path</div>
                        
                        <div style={{ color: 'var(--primary)' }}>ENGINE_VERSION</div>
                        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>Engine version (e.g., 5.3)</div>
                        
                        <div style={{ color: 'var(--primary)' }}>OUTPUT_PATH</div>
                        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>Build output directory</div>
                        
                        <div style={{ color: 'var(--primary)' }}>PROJECT_PATH</div>
                        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>Full .uplugin/.uproject path</div>
                        
                        <div style={{ color: 'var(--primary)' }}>TARGET_PLATFORMS</div>
                        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>Comma-separated platforms</div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <label style={{ margin: 0 }}>Custom Variables</label>
                      <button 
                        type="button"
                        className="btn btn-secondary" 
                        onClick={handleAddVariable}
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                        Add Variable
                      </button>
                    </div>
                    
                    {formData.customVariables.length === 0 ? (
                      <p className="help-text" style={{ marginTop: '0.5rem' }}>
                        No custom variables defined. Click "Add Variable" to create your own.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {formData.customVariables.map((variable, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr auto', 
                              gap: '0.5rem',
                              alignItems: 'center'
                            }}
                          >
                            <input
                              type="text"
                              className="form-input"
                              placeholder="VARIABLE_NAME"
                              value={variable.name}
                              onChange={(e) => handleUpdateVariable(index, 'name', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                              style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem' }}
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder="value"
                              value={variable.value}
                              onChange={(e) => handleUpdateVariable(index, 'value', e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-text"
                              onClick={() => handleDeleteVariable(index)}
                              style={{ color: 'var(--danger)' }}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="help-text" style={{ marginTop: '0.75rem' }}>
                      Define your own variables to use in scripts. Example: MY_PATH=/custom/path
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="form-footer">
              <button className="btn btn-secondary" onClick={() => setShowProfileForm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveProfile}>
                <span className="material-symbols-outlined">save</span>
                {editingProfile ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profiles;