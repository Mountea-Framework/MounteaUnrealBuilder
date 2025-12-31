import React, { useState } from 'react';
import { AppConfig, EngineInstallation } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const EngineConfig: React.FC<Props> = ({ config, saveConfig }) => {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const engines = await window.electronAPI.scanEngines();
      const newConfig = { ...config, engines };
      await saveConfig(newConfig);
    } finally {
      setScanning(false);
    }
  };

  if (config.engines.length === 0) {
    return (
      <div className="page engines">
        <header className="page-header">
          <h2>Engine Configuration</h2>
        </header>
        <div className="empty-state">
          <div className="empty-icon">🔧</div>
          <h3>No Engines Configured</h3>
          <p>Scan your system for Unreal Engine installations or add them manually</p>
          <div className="button-group">
            <button 
              className="btn btn-primary"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Scan System'}
            </button>
            <button className="btn btn-secondary">
              Add Manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page engines">
      <header className="page-header">
        <h2>Engine Configuration</h2>
        <div className="button-group">
          <button 
            className="btn btn-secondary"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Scan System'}
          </button>
          <button className="btn btn-primary">
            + Add Engine
          </button>
        </div>
      </header>

      <div className="engine-list">
        {config.engines.map(engine => (
          <div key={engine.id} className="engine-item">
            <div className="engine-icon">
              {engine.validated ? '✓' : '⚠️'}
            </div>
            <div className="engine-info">
              <h3>Unreal Engine {engine.version}</h3>
              <p className="engine-path">{engine.path}</p>
              <span className={`engine-type ${engine.type}`}>
                {engine.type === 'launcher' ? 'Launcher' : 'Source'}
              </span>
            </div>
            <div className="engine-actions">
              <button className="btn btn-text">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EngineConfig;
