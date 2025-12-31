import React, { useState } from 'react';
import { AppConfig, EngineInstallation } from '../../shared/types';

interface Props {
  config: AppConfig;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const EngineConfig: React.FC<Props> = ({ config, saveConfig }) => {
  const [scanning, setScanning] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleScan = async () => {
    setScanning(true);
    try {
      const scannedEngines = await window.electronAPI.scanEngines();
      
      const existingPaths = new Set(config.engines.map(e => e.path));
      const newEngines = scannedEngines.filter(e => !existingPaths.has(e.path));
      
      if (newEngines.length > 0) {
        const updatedConfig = {
          ...config,
          engines: [...config.engines, ...newEngines],
        };
        await saveConfig(updatedConfig);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualPath.trim()) return;

    setValidating(true);
    setValidationError('');

    try {
      const isValid = await window.electronAPI.validateEnginePath(manualPath);
      
      if (!isValid) {
        setValidationError('Invalid engine path. RunUAT.bat not found.');
        setValidating(false);
        return;
      }

      const existingEngine = config.engines.find(e => e.path === manualPath);
      if (existingEngine) {
        setValidationError('Engine already added.');
        setValidating(false);
        return;
      }

      const versionMatch = manualPath.match(/UE[_-](\d+)\.(\d+)/i);
      const version = versionMatch ? `${versionMatch[1]}.${versionMatch[2]}` : 'Custom';

      const newEngine: EngineInstallation = {
        id: crypto.randomUUID(),
        version,
        path: manualPath,
        type: 'source',
        validated: true,
      };

      const updatedConfig = {
        ...config,
        engines: [...config.engines, newEngine],
      };

      await saveConfig(updatedConfig);
      setManualPath('');
      setAddingManual(false);
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = async (engineId: string) => {
    const usedInProjects = config.projects.some(p => p.engineId === engineId);
    
    if (usedInProjects) {
      alert('Cannot remove: Engine is used by one or more projects');
      return;
    }

    const updatedConfig = {
      ...config,
      engines: config.engines.filter(e => e.id !== engineId),
    };
    
    await saveConfig(updatedConfig);
  };

  if (config.engines.length === 0 && !addingManual) {
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
              {scanning ? 'Scanning...' : '🔍 Scan System'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setAddingManual(true)}
            >
              + Add Manually
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
            {scanning ? 'Scanning...' : '🔍 Scan System'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setAddingManual(true)}
          >
            + Add Engine
          </button>
        </div>
      </header>

      {addingManual && (
        <div className="add-engine-form">
          <h3>Add Engine Manually</h3>
          <div className="form-group">
            <label>Engine Path</label>
            <input
              type="text"
              value={manualPath}
              onChange={(e) => {
                setManualPath(e.target.value);
                setValidationError('');
              }}
              placeholder="C:\Program Files\Epic Games\UE_5.6"
              className="text-input"
            />
            {validationError && (
              <span className="error-text">{validationError}</span>
            )}
          </div>
          <div className="button-group">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setAddingManual(false);
                setManualPath('');
                setValidationError('');
              }}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleAddManual}
              disabled={validating || !manualPath.trim()}
            >
              {validating ? 'Validating...' : 'Add Engine'}
            </button>
          </div>
        </div>
      )}

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
                {engine.type === 'launcher' ? 'Launcher' : 'Source Build'}
              </span>
            </div>
            <div className="engine-actions">
              <button 
                className="btn btn-text"
                onClick={() => handleRemove(engine.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EngineConfig;