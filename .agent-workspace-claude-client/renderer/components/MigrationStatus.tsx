import React, { useState, useEffect } from 'react';

interface MigrationStatus {
  inProgress: boolean;
  currentVersion: number;
  targetVersion: number;
  progress: number;
  message: string;
  error?: string;
}

interface MigrationStatusProps {
  onMigrationComplete?: () => void;
}

export const MigrationStatus: React.FC<MigrationStatusProps> = ({ onMigrationComplete }) => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkMigrationStatus();
    
    // Subscribe to migration updates
    const handleStatusUpdate = (_event: any, newStatus: MigrationStatus) => {
      setStatus(newStatus);
      
      if (!newStatus.inProgress && newStatus.progress === 100) {
        onMigrationComplete?.();
      }
    };

    window.electronAPI.on('migration:status-update', handleStatusUpdate);
    
    return () => {
      window.electronAPI.off('migration:status-update', handleStatusUpdate);
    };
  }, [onMigrationComplete]);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    try {
      const result = await window.electronAPI.invoke('migration:check');
      if (result.success) {
        setNeedsMigration(result.data.needsMigration);
        setStatus(result.data.status);
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    try {
      // Subscribe to updates before starting
      window.electronAPI.send('migration:subscribe');
      
      const result = await window.electronAPI.invoke('migration:run');
      if (!result.success) {
        setStatus(prev => ({
          ...prev!,
          error: result.error
        }));
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setStatus(prev => ({
        ...prev!,
        error: error.message
      }));
    }
  };

  const checkAndRepair = async () => {
    try {
      const result = await window.electronAPI.invoke('migration:repair');
      if (result.success) {
        const { healthy, issues, repaired } = result.data;
        
        if (healthy) {
          alert('No issues found. Migration system is healthy.');
        } else {
          alert(`Issues found:\n${issues.join('\n')}\n\nRepaired:\n${repaired.join('\n')}`);
        }
        
        // Recheck status
        await checkMigrationStatus();
      }
    } catch (error) {
      console.error('Repair failed:', error);
      alert(`Repair failed: ${error.message}`);
    }
  };

  if (isChecking) {
    return (
      <div className="migration-status">
        <div className="spinner" />
        <p>Checking migration status...</p>
      </div>
    );
  }

  if (!needsMigration && !status?.inProgress) {
    return null;
  }

  return (
    <div className="migration-status">
      <div className="migration-card">
        <h3>Database Migration</h3>
        
        {status?.error && (
          <div className="error-message">
            <strong>Error:</strong> {status.error}
          </div>
        )}
        
        {status?.inProgress ? (
          <div className="migration-progress">
            <p>{status.message}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <p className="progress-text">{Math.round(status.progress)}%</p>
          </div>
        ) : (
          <div className="migration-info">
            <p>
              A database migration is required to upgrade from version {status?.currentVersion || 1} to {status?.targetVersion || 2}.
            </p>
            <p className="migration-description">
              This migration will move your API key to secure OS keychain storage for improved security.
            </p>
            
            <div className="migration-actions">
              <button 
                className="btn-primary"
                onClick={runMigration}
                disabled={status?.inProgress}
              >
                Run Migration
              </button>
              
              <button 
                className="btn-secondary"
                onClick={checkAndRepair}
                disabled={status?.inProgress}
              >
                Check & Repair
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Example styles (add to your CSS)
const styles = `
.migration-status {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.migration-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.migration-card h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
  color: #c00;
}

.migration-progress {
  text-align: center;
}

.progress-bar {
  background: #f0f0f0;
  border-radius: 4px;
  height: 8px;
  margin: 16px 0;
  overflow: hidden;
}

.progress-fill {
  background: #4CAF50;
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #666;
}

.migration-info p {
  margin: 12px 0;
  line-height: 1.5;
}

.migration-description {
  font-size: 14px;
  color: #666;
}

.migration-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976D2;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;