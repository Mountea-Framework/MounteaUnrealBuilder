import React from 'react';
import { AppConfig } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const Settings: React.FC<Props> = ({ config, saveConfig }) => {
  const handleToggleNotifications = async () => {
    await saveConfig({
      ...config,
      settings: {
        ...config.settings,
        showNotifications: !config.settings.showNotifications,
      },
    });
  };

  const handleToggleAutoOpenQueue = async () => {
    await saveConfig({
      ...config,
      settings: {
        ...config.settings,
        autoOpenBuildQueue: !config.settings.autoOpenBuildQueue,
      },
    });
  };

  const handleToggleMinimizeToTray = async () => {
    await saveConfig({
      ...config,
      settings: {
        ...config.settings,
        minimizeToTray: !config.settings.minimizeToTray,
      },
    });
  };

  const handleChangeHistoryLimit = async (value: number) => {
    await saveConfig({
      ...config,
      settings: {
        ...config.settings,
        maxHistoryBuilds: value,
      },
    });
  };

  const handleClearAllData = async () => {
    if (!confirm('Clear ALL data including engines, projects, and build history? This cannot be undone!')) {
      return;
    }

    const emptyConfig: AppConfig = {
      engines: [],
      projects: [],
      buildHistory: [],
      settings: {
        showNotifications: true,
        autoOpenBuildQueue: true,
        maxHistoryBuilds: 20,
        minimizeToTray: false,
      },
      profiles: [],
      analytics: {
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        averageBuildTime: 0,
        platformStats: {},
      },
    };

    await saveConfig(emptyConfig);
    alert('All data cleared successfully');
  };

  const handleExportConfig = async () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unreal-builder-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page settings">
      <header className="page-header">
        <h2>Settings</h2>
      </header>

      <div className="page-content">
        <div className="section">
          <h3>General</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <h4>Desktop Notifications</h4>
              <p>Show notifications when builds complete</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.settings.showNotifications}
                onChange={handleToggleNotifications}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Auto-open Build Queue</h4>
              <p>Automatically switch to Build Queue when starting a build</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.settings.autoOpenBuildQueue}
                onChange={handleToggleAutoOpenQueue}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Minimize to System Tray</h4>
              <p>Keep app running in system tray when minimized</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.settings.minimizeToTray}
                onChange={handleToggleMinimizeToTray}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Build History Limit</h4>
              <p>Maximum number of completed builds to keep</p>
            </div>
            <select
              className="select-input"
              value={config.settings.maxHistoryBuilds}
              onChange={(e) => handleChangeHistoryLimit(Number(e.target.value))}
              style={{ width: '150px' }}
            >
              <option value={10}>10 builds</option>
              <option value={20}>20 builds</option>
              <option value={50}>50 builds</option>
              <option value={100}>100 builds</option>
              <option value={-1}>Unlimited</option>
            </select>
          </div>
        </div>

        <div className="section">
          <h3>Build Analytics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{config.analytics.totalBuilds}</div>
              <div className="stat-label">Total Builds</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{config.analytics.successfulBuilds}</div>
              <div className="stat-label">Successful Builds</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{config.analytics.failedBuilds}</div>
              <div className="stat-label">Failed Builds</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {config.analytics.totalBuilds > 0
                  ? Math.round((config.analytics.successfulBuilds / config.analytics.totalBuilds) * 100)
                  : 0}%
              </div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {config.analytics.averageBuildTime > 0
                  ? `${Math.round(config.analytics.averageBuildTime / 60)}m`
                  : '--'}
              </div>
              <div className="stat-label">Avg Build Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{config.engines.length}</div>
              <div className="stat-label">Engines</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{config.projects.length}</div>
              <div className="stat-label">Projects</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{config.profiles.length}</div>
              <div className="stat-label">Profiles</div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Data Management</h3>
          
          <div className="button-group">
            <button className="btn btn-secondary" onClick={handleExportConfig}>
              <span className="material-symbols-outlined">download</span>
              Export Configuration
            </button>
            <button className="btn btn-danger" onClick={handleClearAllData}>
              <span className="material-symbols-outlined">delete_forever</span>
              Clear All Data
            </button>
          </div>

          <p className="help-text">
            Configuration is stored at: <code>{navigator.userAgent.includes('Windows') ? '%APPDATA%' : '~'}/.unreal-builder/config.json</code>
          </p>
        </div>

        <div className="section">
          <h3>Keyboard Shortcuts</h3>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <kbd>Ctrl+1</kbd>
              <span>Go to Dashboard</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+2</kbd>
              <span>Go to Engine Configuration</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+3</kbd>
              <span>Go to Build Queue</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+4</kbd>
              <span>Go to Build Profiles</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+,</kbd>
              <span>Open Settings</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+B</kbd>
              <span>Build first project (from Dashboard)</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+Shift+X</kbd>
              <span>Cancel current build</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>About</h3>
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>
                  construction
                </span>
              </div>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.25rem' }}>Unreal Builder</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>v1.0.3</p>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '0.75rem' }}>
              A desktop application for building Unreal Engine plugins and projects across multiple engine versions and platforms.
            </p>
            <p className="help-text" style={{ marginTop: '0' }}>
             Made by Dominik Morse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;