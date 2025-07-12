const { ipcMain } = require('electron')

export function setupFileHandlers(getMainWindow: () => any) {
  ipcMain.handle('dialog:openFile', async () => {
    const { dialog } = require('electron')
    const mainWindow = getMainWindow()
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (!result.canceled) {
      const fs = require('fs')
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      return content
    }
    return undefined
  })

  ipcMain.handle('dialog:saveFile', async (event, content) => {
    const { dialog } = require('electron')
    const mainWindow = getMainWindow()
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (!result.canceled) {
      const fs = require('fs')
      fs.writeFileSync(result.filePath, content)
      return true
    }
    return false
  })
} 