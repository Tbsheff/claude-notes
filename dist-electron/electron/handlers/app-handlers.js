"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAppHandlers = setupAppHandlers;
const { ipcMain, app } = require('electron');
function setupAppHandlers(getMainWindow) {
    ipcMain.handle('app:reloadWindow', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.reload();
        }
    });
    ipcMain.handle('app:rebuildAndReload', async () => {
        try {
            console.log('🔄 Manual rebuild requested...');
            return { success: true, message: 'Auto-rebuild will trigger when files change' };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('app:getVersion', async () => {
        return app.getVersion();
    });
}
