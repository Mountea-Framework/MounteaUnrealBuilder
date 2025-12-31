import React, { useState, useEffect } from 'react';
import { AppConfig } from '../shared/types';
import Dashboard from './pages/Dashboard';
import EngineConfig from './pages/EngineConfig';
import BuildQueue from './pages/BuildQueue';

type Page = 'dashboard' | 'engines' | 'queue';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [config, setConfig] = useState<AppConfig | null>(null);

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
      </main>
    </div>
  );
};

export default App;