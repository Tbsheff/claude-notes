const { ipcMain } = require('electron')
import * as documentService from '../services/document-service'

export function setupDocumentHandlers(getMainWindow: () => any) {
  const ensureMainWindow = () => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
      documentService.setMainWindow(mainWindow)
    }
    return mainWindow
  }

  ipcMain.handle('document:update', async (_: any, request: any) => {
    ensureMainWindow()
    return documentService.updateDocument(request)
  })

  ipcMain.handle('document:get-content', async () => {
    ensureMainWindow()
    return documentService.getCurrentDocument()
  })
} 