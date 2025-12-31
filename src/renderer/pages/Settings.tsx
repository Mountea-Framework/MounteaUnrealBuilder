import React, { useState } from 'react';
import { AppConfig } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const Settings: React.FC<Props> = ({ config, saveConfig }) => {
  const [maxHistoryBuilds, setMaxHistoryBuilds] = useState(20);
  const [autoOpenBuildQueue, setAutoOpenBuildQueue] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);

  const handleClearAllData = async () => {
    if (!confirm('Clear ALL data including engines, projects, and build history? This cannot be undone!')) {
      return;
    }

    const emptyConfig: AppConfig = {
      engines: [],
      projects: [],
      buildHistory: [],
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
              checked={showNotifications}
              onChange={(e) => setShowNotifications(e.target.checked)}
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
              checked={autoOpenBuildQueue}
              onChange={(e) => setAutoOpenBuildQueue(e.target.checked)}
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
            value={maxHistoryBuilds}
            onChange={(e) => setMaxHistoryBuilds(Number(e.target.value))}
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
        <h3>Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{config.engines.length}</div>
            <div className="stat-label">Engines Configured</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{config.projects.length}</div>
            <div className="stat-label">Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{config.buildHistory.length}</div>
            <div className="stat-label">Total Builds</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {config.buildHistory.filter(b => b.status === 'success').length}
            </div>
            <div className="stat-label">Successful Builds</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Data Management</h3>
        
        <div className="button-group">
          <button className="btn btn-secondary" onClick={handleExportConfig}>
            Export Configuration
          </button>
          <button className="btn btn-danger" onClick={handleClearAllData}>
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
        <p>Unreal Builder v1.0.0</p>
        <p>A desktop application for building Unreal Engine plugins across multiple engine versions and platforms.</p>
        <p className="help-text">Built with Electron, React, and TypeScript</p>
      </div>
    </div>
  );
};

export default Settings;