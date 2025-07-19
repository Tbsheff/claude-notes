const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow: any = null

export function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Claude Notes',
    icon: path.join(__dirname, '../public/logo.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  const { setMainWindow } = require('./ipc/ai-handlers')
  require('./ipc/chat-handlers')
  setMainWindow(mainWindow)
  
  const { setMainWindow: setDocumentMainWindow } = require('./services/document-service')
  setDocumentMainWindow(mainWindow)

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev && mainWindow) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  if (mainWindow) {
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
}

export function getMainWindow() {
  return mainWindow
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 