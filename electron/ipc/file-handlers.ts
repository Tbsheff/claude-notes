const { ipcMain } = require('electron')
import * as fileService from '../services/file-service'

export function setupFileHandlers(getMainWindow: () => any) {
  ipcMain.handle('dialog:openFile', async () => {
    const { dialog } = require('electron')
    const mainWindow = getMainWindow()
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (!result.canceled) {
      return fileService.readFile(result.filePaths[0])
    }
    return undefined
  })

  ipcMain.handle('dialog:saveFile', async (_: any, content: string) => {
    const { dialog } = require('electron')
    const mainWindow = getMainWindow()
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (!result.canceled) {
      return fileService.writeFile(result.filePath, content)
    }
    return false
  })
} 