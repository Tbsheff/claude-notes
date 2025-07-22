const { ipcMain, app } = require('electron')

export function setupAppHandlers(getMainWindow: () => any) {
  ipcMain.handle('app:reloadWindow', async () => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.reload()
    }
  })

  ipcMain.handle('app:rebuildAndReload', async () => {
    try {
      return { success: true, message: 'Auto-rebuild will trigger when files change' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion()
  })
} 