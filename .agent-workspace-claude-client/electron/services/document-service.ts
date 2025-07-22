import { BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win
}

export interface DocumentUpdateRequest {
  action: 'append' | 'replace' | 'insert'
  text: string
  position?: number
}

export async function updateDocument(request: DocumentUpdateRequest) {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' }
    }

    mainWindow.webContents.send('document-update', request)

    return { 
      success: true, 
      message: `Document ${request.action}ed successfully`,
      action: request.action,
      textLength: request.text.length
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

export async function getCurrentDocument(): Promise<string> {
  try {
    if (!mainWindow) {
      return ''
    }

    const window = mainWindow
    
    return new Promise((resolve) => {
      const handleResponse = (_event: any, content: string) => {
        (window.webContents as any).removeListener('document-content-response', handleResponse)
        resolve(content || '')
      }

      (window.webContents as any).on('document-content-response', handleResponse)
      window.webContents.send('document-content-request')

      setTimeout(() => {
        (window.webContents as any).removeListener('document-content-response', handleResponse)
        resolve('')
      }, 2000)
    })
  } catch (error) {
    return ''
  }
} 

export async function getNoteContent(noteId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!mainWindow) {
      return reject(new Error('Main window is not available'))
    }
    
    const channel = `document-content-response-${noteId}`
    
    const listener = (_event: any, content: string) => {
      ipcMain.removeListener(channel, listener)
      resolve(content)
    }
    ipcMain.once(channel, listener)

    mainWindow.webContents.send('get-document-content', { noteId })

    setTimeout(() => {
      ipcMain.removeListener(channel, listener)
      reject(new Error('Timeout waiting for document content response'))
    }, 5000)
  })
} 