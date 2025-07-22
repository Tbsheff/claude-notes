import { settingsService, Settings, MigrationRecord } from './settings-service';
import { authService } from './auth-service';
import { EventEmitter } from 'events';

export interface MigrationStatus {
  inProgress: boolean;
  currentVersion: number;
  targetVersion: number;
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  error?: string;
  rollbackPerformed?: boolean;
}

export class MigrationService extends EventEmitter {
  private static readonly TARGET_SCHEMA_VERSION = 2;
  private migrationInProgress = false;
  private currentStatus: MigrationStatus = {
    inProgress: false,
    currentVersion: 1,
    targetVersion: MigrationService.TARGET_SCHEMA_VERSION,
    progress: 0,
    message: 'Migration not started'
  };

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    try {
      const settings = settingsService.getAll();
      const currentVersion = settings.schemaVersion || 1;
      return currentVersion < MigrationService.TARGET_SCHEMA_VERSION;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Get current migration status
   */
  getStatus(): MigrationStatus {
    return { ...this.currentStatus };
  }

  /**
   * Run all necessary migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    if (this.migrationInProgress) {
      throw new Error('Migration already in progress');
    }

    this.migrationInProgress = true;
    const startTime = Date.now();

    try {
      const settings = settingsService.getAll();
      const fromVersion = settings.schemaVersion || 1;
      
      if (fromVersion >= MigrationService.TARGET_SCHEMA_VERSION) {
        return {
          success: true,
          fromVersion,
          toVersion: fromVersion,
          error: 'No migration needed'
        };
      }

      this.updateStatus({
        inProgress: true,
        currentVersion: fromVersion,
        progress: 0,
        message: `Starting migration from v${fromVersion} to v${MigrationService.TARGET_SCHEMA_VERSION}`
      });

      // Run migrations sequentially
      let currentVersion = fromVersion;
      
      while (currentVersion < MigrationService.TARGET_SCHEMA_VERSION) {
        const nextVersion = currentVersion + 1;
        
        this.updateStatus({
          progress: ((currentVersion - fromVersion) / (MigrationService.TARGET_SCHEMA_VERSION - fromVersion)) * 100,
          message: `Migrating from v${currentVersion} to v${nextVersion}`
        });

        try {
          await this.runSingleMigration(currentVersion, nextVersion);
          currentVersion = nextVersion;
          
          // Record successful migration
          await settingsService.addMigrationRecord({
            fromVersion: currentVersion - 1,
            toVersion: currentVersion,
            success: true
          });
        } catch (error) {
          console.error(`Migration from v${currentVersion} to v${nextVersion} failed:`, error);
          
          // Record failed migration
          await settingsService.addMigrationRecord({
            fromVersion: currentVersion,
            toVersion: nextVersion,
            success: false,
            error: error.message
          });

          // Attempt rollback
          const rollbackSuccess = await this.attemptRollback(currentVersion, fromVersion);

          return {
            success: false,
            fromVersion,
            toVersion: currentVersion,
            error: error.message,
            rollbackPerformed: rollbackSuccess
          };
        }
      }

      // Update schema version
      await settingsService.set({ schemaVersion: MigrationService.TARGET_SCHEMA_VERSION });

      this.updateStatus({
        inProgress: false,
        currentVersion: MigrationService.TARGET_SCHEMA_VERSION,
        progress: 100,
        message: 'Migration completed successfully'
      });

      const duration = Date.now() - startTime;
      console.log(`Migration completed in ${duration}ms`);

      return {
        success: true,
        fromVersion,
        toVersion: MigrationService.TARGET_SCHEMA_VERSION
      };
    } catch (error) {
      this.updateStatus({
        inProgress: false,
        progress: 0,
        message: 'Migration failed',
        error: error.message
      });

      return {
        success: false,
        fromVersion: settingsService.getSchemaVersion(),
        toVersion: MigrationService.TARGET_SCHEMA_VERSION,
        error: error.message
      };
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Run a specific migration
   */
  private async runSingleMigration(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Running migration from v${fromVersion} to v${toVersion}`);

    switch (`${fromVersion}->${toVersion}`) {
      case '1->2':
        await this.migrateV1ToV2();
        break;
      
      default:
        throw new Error(`Unknown migration path: v${fromVersion} to v${toVersion}`);
    }
  }

  /**
   * Migrate from v1 to v2: Move API key from database to keychain
   */
  private async migrateV1ToV2(): Promise<void> {
    console.log('Starting v1 to v2 migration: Moving API key to keychain');
    
    const settings = settingsService.getAll();
    const apiKey = settings.apiKey;

    if (!apiKey) {
      console.log('No API key found in settings, skipping migration');
      return;
    }

    try {
      // Store API key in keychain
      this.updateStatus({
        message: 'Storing API key in secure keychain...'
      });
      
      await authService.storeApiKey(apiKey);

      // Verify the key was stored successfully
      this.updateStatus({
        message: 'Verifying secure storage...'
      });
      
      const storedApiKey = await authService.getApiKey();
      if (storedApiKey !== apiKey) {
        throw new Error('Failed to verify API key storage in keychain');
      }

      // Clear API key from settings
      this.updateStatus({
        message: 'Removing API key from database...'
      });
      
      await settingsService.clearSensitiveData();

      console.log('Successfully migrated API key to keychain');
    } catch (error) {
      console.error('Failed to migrate API key:', error);
      
      // If keychain storage failed, keep the API key in settings
      if (error.message.includes('keychain')) {
        console.warn('Keychain access failed, keeping API key in settings');
        throw new Error('Keychain access denied. Please grant keychain access and retry migration.');
      }
      
      throw error;
    }
  }

  /**
   * Attempt to rollback migrations
   */
  private async attemptRollback(failedVersion: number, originalVersion: number): Promise<boolean> {
    console.log(`Attempting rollback from v${failedVersion} to v${originalVersion}`);
    
    try {
      // For v2 rollback, we need to restore API key from keychain to settings
      if (failedVersion === 2 && originalVersion === 1) {
        const apiKey = await authService.getApiKey();
        if (apiKey) {
          await settingsService.set({
            apiKey: apiKey,
            schemaVersion: 1
          });
          
          // Clear from keychain
          await authService.clearApiKey();
          
          console.log('Rollback successful: API key restored to settings');
          return true;
        }
      }

      // For other cases, just revert schema version
      await settingsService.set({ schemaVersion: originalVersion });
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Update migration status and emit event
   */
  private updateStatus(updates: Partial<MigrationStatus>): void {
    this.currentStatus = {
      ...this.currentStatus,
      ...updates
    };
    
    this.emit('status-update', this.currentStatus);
  }

  /**
   * Manually trigger migration (for testing or recovery)
   */
  async forceMigration(): Promise<MigrationResult> {
    console.log('Force migration triggered');
    
    // Reset schema version to trigger migration
    const currentVersion = settingsService.getSchemaVersion();
    if (currentVersion >= MigrationService.TARGET_SCHEMA_VERSION) {
      await settingsService.set({ schemaVersion: 1 });
    }

    return this.runMigrations();
  }

  /**
   * Check migration health and fix issues
   */
  async checkAndRepair(): Promise<{ healthy: boolean; issues: string[]; repaired: string[] }> {
    const issues: string[] = [];
    const repaired: string[] = [];

    try {
      // Check 1: Settings file exists and is readable
      const settings = settingsService.getAll();
      
      // Check 2: Schema version is valid
      if (!settings.schemaVersion || settings.schemaVersion < 1 || settings.schemaVersion > MigrationService.TARGET_SCHEMA_VERSION) {
        issues.push(`Invalid schema version: ${settings.schemaVersion}`);
        await settingsService.set({ schemaVersion: 1 });
        repaired.push('Reset schema version to 1');
      }

      // Check 3: No API key in settings if schema v2
      if (settings.schemaVersion >= 2 && settings.apiKey) {
        issues.push('API key found in settings for schema v2');
        await settingsService.clearSensitiveData();
        repaired.push('Cleared API key from settings');
      }

      // Check 4: Keychain is accessible
      try {
        await authService.hasValidTokens();
      } catch (error) {
        issues.push(`Keychain access error: ${error.message}`);
      }

      // Check 5: Migration history integrity
      if (settings.migrationHistory) {
        const invalidRecords = settings.migrationHistory.filter(
          record => !record.timestamp || !record.fromVersion || !record.toVersion
        );
        
        if (invalidRecords.length > 0) {
          issues.push(`Found ${invalidRecords.length} invalid migration records`);
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        repaired
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`Critical error: ${error.message}`],
        repaired
      };
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();