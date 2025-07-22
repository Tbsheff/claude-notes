import { app } from 'electron';
import { createWindow as _createWindow, getMainWindow } from './electron/main';
import { setupAIHandlers } from './electron/ipc/ai-handlers';
import { getChangedFiles } from './electron/services/ai-service';
import { setupAppHandlers } from './electron/ipc/app-handlers';
import { setupFileHandlers } from './electron/ipc/file-handlers';
import { setupNoteStorageHandlers } from './electron/ipc/note-handlers';
import { setupSettingsHandlers } from './electron/ipc/settings-handlers';
import { setupGeneralHandlers } from './electron/ipc/general-handlers';
import { setupDocumentHandlers } from './electron/ipc/document-handlers';
import { setupAuthHandlers } from './electron/ipc/auth-handlers';
import { setupFileWatcher } from './electron/services/file-watcher-service';

// Import new services and handlers
import { settingsService } from './electron/services/settings-service';
import { migrationService } from './electron/services/migration-service';
import { registerSettingsHandlers } from './electron/ipc/settings-handlers';
import { registerMigrationHandlers } from './electron/ipc/migration-handlers';

/**
 * Initialize application services
 */
async function initializeServices(): Promise<void> {
  console.log('Initializing application services...');

  try {
    // Initialize settings first
    await settingsService.initialize();
    console.log('Settings service initialized');

    // Check and run migrations if needed
    if (await migrationService.needsMigration()) {
      console.log('Migration needed, running migrations...');
      
      const result = await migrationService.runMigrations();
      
      if (result.success) {
        console.log(`Migration completed successfully: v${result.fromVersion} -> v${result.toVersion}`);
      } else {
        console.error('Migration failed:', result.error);
        
        // Show dialog to user about migration failure
        const { dialog } = require('electron');
        const response = await dialog.showMessageBox({
          type: 'error',
          title: 'Migration Failed',
          message: 'Failed to migrate application data',
          detail: `${result.error}\n\nThe application will continue with limited functionality.`,
          buttons: ['Continue', 'Quit'],
          defaultId: 0
        });

        if (response.response === 1) {
          app.quit();
          return;
        }
      }
    } else {
      console.log('No migration needed');
    }

    // Check migration health
    const health = await migrationService.checkAndRepair();
    if (!health.healthy) {
      console.warn('Migration health issues detected:', health.issues);
      if (health.repaired.length > 0) {
        console.log('Repaired issues:', health.repaired);
      }
    }

  } catch (error) {
    console.error('Failed to initialize services:', error);
    
    // Show critical error dialog
    const { dialog } = require('electron');
    await dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize application services: ${error.message}`
    );
  }
}

// Run initialization when app is ready
app.whenReady().then(async () => {
  await initializeServices();
  
  // Setup IPC handlers
  const fileWatcher = setupFileWatcher(getMainWindow, getChangedFiles);
  
  setupAIHandlers(fileWatcher.rebuildAfterClaudeFinished);
  setupAppHandlers(getMainWindow);
  setupFileHandlers(getMainWindow);
  setupNoteStorageHandlers();
  setupSettingsHandlers();
  setupGeneralHandlers(getMainWindow);
  setupDocumentHandlers(getMainWindow);
  setupAuthHandlers();
  
  // Register new handlers
  registerSettingsHandlers();
  registerMigrationHandlers();
  
  console.log('All IPC handlers registered');
});

// Handle app events
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (getMainWindow() === null) {
    _createWindow();
  }
});