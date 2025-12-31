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
  const [formData, setFormData] = useState({
    name: '',
    platforms: ['Win64'],
    description: '',
  });

  const startAddProfile = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      platforms: ['Win64'],
      description: '',
    });
    setShowProfileForm(true);
  };

  const startEditProfile = (profile: BuildProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      platforms: profile.platforms,
      description: profile.description || '',
    });
    setShowProfileForm(true);
  };

  const togglePlatform = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || formData.platforms.length === 0) {
      alert('Please provide a name and select at least one platform');
      return;
    }

    const profileData: BuildProfile = {
      id: editingProfile?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      platforms: formData.platforms,
      description: formData.description.trim() || undefined,
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
                        </div>
                      </div>
                      
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
                  placeholder="Quick Test"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Fast build for testing"
                />
              </div>

              <div className="form-group">
                <label>Target Platforms *</label>
                <div className="checkbox-group">
                  {PLATFORMS.map(platform => (
                    <label key={platform.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.platforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                      />
                      <span>{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>
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