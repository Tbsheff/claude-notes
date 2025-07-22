const { ipcMain, dialog } = require('electron')
import * as generalService from '../services/general-service'

export function setupGeneralHandlers(getMainWindow: () => any) {
  ipcMain.handle('general:exportWorkspace', async () => {
    const mainWindow = getMainWindow()
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: `workspace-${new Date().toISOString().split('T')[0]}.zip`,
    })
    if (result.canceled) return { success: false, error: 'Export cancelled' }
    return generalService.exportWorkspace(result.filePath)
  })

  ipcMain.handle('general:resetFeatures', async (_: any, repoUrl: string) => {
    const mainWindow = getMainWindow()
    return generalService.resetFeatures(repoUrl, () => mainWindow?.reload())
  })

  ipcMain.handle('general:clearDatabase', async () => {
    return generalService.clearDatabase()
  })
} 