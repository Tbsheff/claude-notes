import { BrowserWindow } from 'electron'

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
      console.error('❌ Main window not available in updateDocument')
      return { success: false, error: 'Main window not available' }
    }

    console.log('📝 Document update requested:', request)

    // Send the update to the renderer process
    mainWindow.webContents.send('document-update', request)

    return { 
      success: true, 
      message: `Document ${request.action}ed successfully`,
      action: request.action,
      textLength: request.text.length
    }
  } catch (error) {
    console.error('❌ Document update error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

export async function getCurrentDocument(): Promise<string> {
  try {
    if (!mainWindow) {
      console.log('❌ Main window not available in getCurrentDocument')
      return ''
    }

    const window = mainWindow
    
    return new Promise((resolve) => {
      const handleResponse = (_event: any, content: string) => {
        (window.webContents as any).removeListener('document-content-response', handleResponse)
        console.log('📄 Document service received content:', typeof content === 'string' ? content.length : 'undefined', 'characters')
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
    console.error('❌ getCurrentDocument error:', error)
    return ''
  }
} 