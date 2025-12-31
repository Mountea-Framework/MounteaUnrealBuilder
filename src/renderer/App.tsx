import React, { useState, useEffect } from 'react';
import { AppConfig } from '../shared/types';
import Dashboard from './pages/Dashboard';
import EngineConfig from './pages/EngineConfig';
import BuildQueue from './pages/BuildQueue';
import Settings from './pages/Settings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type Page = 'dashboard' | 'engines' | 'queue' | 'settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [config, setConfig] = useState<AppConfig | null>(null);

  useKeyboardShortcuts([
    {
      key: '1',
      ctrlKey: true,
      action: () => setCurrentPage('dashboard'),
      description: 'Go to Dashboard',
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => setCurrentPage('engines'),
      description: 'Go to Engine Configuration',
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => setCurrentPage('queue'),
      description: 'Go to Build Queue',
    },
    {
      key: ',',
      ctrlKey: true,
      action: () => setCurrentPage('settings'),
      description: 'Open Settings',
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => {
        if (currentPage === 'dashboard' && config && config.projects.length > 0) {
          window.electronAPI.startBuild(config.projects[0].id);
        }
      },
      description: 'Build first project',
    },
    {
      key: 'x',
      ctrlKey: true,
      shiftKey: true,
      action: () => window.electronAPI.cancelBuild(),
      description: 'Cancel current build',
    },
  ]);

  useEffect(() => {
    loadConfig();
    
    const interval = setInterval(loadConfig, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    const loadedConfig = await window.electronAPI.getConfig();
    setConfig(loadedConfig);
  };

  const saveConfig = async (newConfig: AppConfig) => {
    await window.electronAPI.saveConfig(newConfig);
    setConfig(newConfig);
  };

  if (!config) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>Unreal Builder</h1>
          <span className="version">v1.0.0</span>
        </div>
        <ul className="nav-menu">
          <li
            className={currentPage === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentPage('dashboard')}
          >
            <span className="icon">📊</span>
            Dashboard
          </li>
          <li
            className={currentPage === 'engines' ? 'active' : ''}
            onClick={() => setCurrentPage('engines')}
          >
            <span className="icon">⚙️</span>
            Engine Configuration
          </li>
          <li
            className={currentPage === 'queue' ? 'active' : ''}
            onClick={() => setCurrentPage('queue')}
          >
            <span className="icon">📋</span>
            Build Queue
          </li>
        </ul>
        
        <ul className="nav-menu nav-menu-bottom">
          <li
            className={currentPage === 'settings' ? 'active' : ''}
            onClick={() => setCurrentPage('settings')}
          >
            <span className="icon">🔧</span>
            Settings
          </li>
        </ul>
      </nav>

      <main className="content">
        {currentPage === 'dashboard' && (
          <Dashboard config={config} saveConfig={saveConfig} />
        )}
        {currentPage === 'engines' && (
          <EngineConfig config={config} saveConfig={saveConfig} />
        )}
        {currentPage === 'queue' && (
          <BuildQueue config={config} />
        )}
        {currentPage === 'settings' && (
          <Settings config={config} saveConfig={saveConfig} />
        )}
      </main>
    </div>
  );
};

export default App;