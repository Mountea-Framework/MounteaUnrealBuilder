import React, { useState } from 'react';
import { AppConfig, EngineInstallation } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const EngineConfig: React.FC<Props> = ({ config, saveConfig }) => {
  const [showEngineForm, setShowEngineForm] = useState(false);
  const [enginePath, setEnginePath] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleScanEngines = async () => {
    setIsScanning(true);
    try {
      const scannedEngines = await window.electronAPI.scanEngines();
      
      const existingPaths = new Set(config.engines.map(e => e.path.toLowerCase()));
      const newEngines = scannedEngines.filter(
        e => !existingPaths.has(e.path.toLowerCase())
      );

      if (newEngines.length > 0) {
        await saveConfig({
          ...config,
          engines: [...config.engines, ...newEngines],
        });
        alert(`Found ${newEngines.length} new engine(s)`);
      } else {
        alert('No new engines found');
      }
    } catch (error) {
      alert('Failed to scan for engines: ' + (error as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectEngine = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      setEnginePath(folderPath);
    }
  };

  const handleAddEngine = async () => {
    if (!enginePath.trim()) {
      alert('Please select an engine path');
      return;
    }

    const isValid = await window.electronAPI.validateEnginePath(enginePath);
    if (!isValid) {
      alert('Invalid engine path. Please select a valid Unreal Engine installation folder.');
      return;
    }

    const existingEngine = config.engines.find(
      e => e.path.toLowerCase() === enginePath.toLowerCase()
    );

    if (existingEngine) {
      alert('This engine is already added');
      return;
    }

    const versionMatch = enginePath.match(/UE[_-]?(\d+\.\d+)/i);
    const version = versionMatch ? versionMatch[1] : 'Unknown';

    const newEngine: EngineInstallation = {
      id: crypto.randomUUID(),
      version,
      path: enginePath,
      type: 'source',
      validated: true,
    };

    await saveConfig({
      ...config,
      engines: [...config.engines, newEngine],
    });

    setEnginePath('');
    setShowEngineForm(false);
  };

  const handleRemoveEngine = async (engineId: string) => {
    const hasProjects = config.projects.some(p => p.engineId === engineId);
    if (hasProjects) {
      alert('Cannot remove engine: projects are using it');
      return;
    }

    if (!confirm('Remove this engine?')) {
      return;
    }

    await saveConfig({
      ...config,
      engines: config.engines.filter(e => e.id !== engineId),
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Engine Configuration</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleScanEngines} disabled={isScanning}>
            <span className="material-symbols-outlined">search</span>
            {isScanning ? 'Scanning...' : 'Scan Engines'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowEngineForm(true)}>
            <span className="material-symbols-outlined">add</span>
            Add Engine
          </button>
        </div>
      </header>

      <div className="page-content">
        {config.engines.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>
              extension
            </span>
            <h3>No Engines Configured</h3>
            <p>Scan for installed engines or add manually</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleScanEngines}>
              <span className="material-symbols-outlined">search</span>
              Scan for Engines
            </button>
          </div>
        )}

        {config.engines.length > 0 && (
          <div className="engine-list">
            {config.engines.map(engine => (
              <div key={engine.id} className="engine-item">
                <div className="engine-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>
                    extension
                  </span>
                </div>
                <div className="engine-info">
                  <h4>Unreal Engine {engine.version}</h4>
                  <p>{engine.path}</p>
                </div>
                <span className="engine-type-badge">{engine.type || 'Launcher'}</span>
                <div className="engine-actions">
                  <button
                    className="btn btn-text"
                    onClick={() => handleRemoveEngine(engine.id)}
                    title="Remove engine"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEngineForm && (
        <div className="form-modal">
          <div className="form-container">
            <div className="form-header">
              <h3>
                <span className="material-symbols-outlined">add</span>
                Add Engine
              </h3>
              <button className="btn btn-text" onClick={() => setShowEngineForm(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="form-body">
              <div className="form-group">
                <label>Engine Path *</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={enginePath}
                    readOnly
                    placeholder="Select engine root folder"
                    style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-secondary" onClick={handleSelectEngine}>
                    <span className="material-symbols-outlined">folder_open</span>
                    Browse
                  </button>
                </div>
                <p className="help-text">
                  Select the root folder containing Engine/Build/BatchFiles/RunUAT scripts
                </p>
              </div>
            </div>

            <div className="form-footer">
              <button className="btn btn-secondary" onClick={() => setShowEngineForm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddEngine}>
                <span className="material-symbols-outlined">add</span>
                Add Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineConfig;