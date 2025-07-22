import { ipcMain } from 'electron';
import { migrationService } from '../services/migration-service';
import { settingsService } from '../services/settings-service';

/**
 * Register IPC handlers for migration operations
 */
export function registerMigrationHandlers(): void {
  /**
   * Check if migration is needed
   */
  ipcMain.handle('migration:check', async () => {
    try {
      const needsMigration = await migrationService.needsMigration();
      const status = migrationService.getStatus();
      const currentVersion = settingsService.getSchemaVersion();
      
      return {
        success: true,
        data: {
          needsMigration,
          currentVersion,
          targetVersion: status.targetVersion,
          status
        }
      };
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Get current migration status
   */
  ipcMain.handle('migration:status', async () => {
    try {
      const status = migrationService.getStatus();
      const settings = settingsService.getAll();
      
      return {
        success: true,
        data: {
          status,
          migrationHistory: settings.migrationHistory || [],
          lastMigrationRun: settings.lastMigrationRun
        }
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Run migrations
   */
  ipcMain.handle('migration:run', async () => {
    try {
      const result = await migrationService.runMigrations();
      
      return {
        success: result.success,
        data: result,
        error: result.error
      };
    } catch (error) {
      console.error('Failed to run migrations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Force migration (for testing or recovery)
   */
  ipcMain.handle('migration:force', async () => {
    try {
      const result = await migrationService.forceMigration();
      
      return {
        success: result.success,
        data: result,
        error: result.error
      };
    } catch (error) {
      console.error('Failed to force migration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Check and repair migration issues
   */
  ipcMain.handle('migration:repair', async () => {
    try {
      const result = await migrationService.checkAndRepair();
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to check/repair migrations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Subscribe to migration status updates
   */
  ipcMain.on('migration:subscribe', (event) => {
    const listener = (status: any) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('migration:status-update', status);
      }
    };

    migrationService.on('status-update', listener);

    // Clean up listener when renderer is destroyed
    event.sender.once('destroyed', () => {
      migrationService.off('status-update', listener);
    });
  });

  /**
   * Get migration logs
   */
  ipcMain.handle('migration:logs', async () => {
    try {
      const settings = settingsService.getAll();
      const history = settings.migrationHistory || [];
      
      // Sort by timestamp descending
      const sortedHistory = [...history].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        success: true,
        data: {
          history: sortedHistory,
          currentVersion: settings.schemaVersion,
          hasApiKeyInSettings: !!settings.apiKey
        }
      };
    } catch (error) {
      console.error('Failed to get migration logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Rollback to previous version (emergency use only)
   */
  ipcMain.handle('migration:rollback', async () => {
    try {
      const settings = settingsService.getAll();
      const currentVersion = settings.schemaVersion || 1;
      
      if (currentVersion <= 1) {
        return {
          success: false,
          error: 'Already at minimum version'
        };
      }

      // For v2 -> v1 rollback, restore API key from keychain
      if (currentVersion === 2) {
        const { authService } = await import('../services/auth-service');
        const apiKey = await authService.getApiKey();
        if (apiKey) {
          await settingsService.set({
            apiKey: apiKey,
            schemaVersion: 1
          });
          
          await authService.clearApiKey();
          
          return {
            success: true,
            data: {
              fromVersion: currentVersion,
              toVersion: 1,
              message: 'API key restored to settings'
            }
          };
        }
      }

      // Generic rollback
      await settingsService.set({ schemaVersion: currentVersion - 1 });
      
      return {
        success: true,
        data: {
          fromVersion: currentVersion,
          toVersion: currentVersion - 1
        }
      };
    } catch (error) {
      console.error('Failed to rollback migration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('Migration IPC handlers registered');
}