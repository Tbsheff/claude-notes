const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  ai: {
    initialize: (config) => ipcRenderer.invoke('ai:initialize', config),
    processRequest: (message) => ipcRenderer.invoke('ai:process-request', message)
  },
  app: {
    reloadWindow: () => ipcRenderer.invoke('app:reloadWindow'),
    rebuildAndReload: () => ipcRenderer.invoke('app:rebuildAndReload')
  }
}) 