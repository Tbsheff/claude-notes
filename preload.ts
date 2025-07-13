const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  ai: {
    initialize: (config) => ipcRenderer.invoke('ai:initialize', config),
    processRequest: (message) => ipcRenderer.invoke('ai:process-request', message)
  },
  llmCall: (messages, model) => ipcRenderer.invoke('llm:call', messages, model),
  notes: {
    create: (title, content) => ipcRenderer.invoke('notes:create', title, content),
    save: (noteId, content, title) => ipcRenderer.invoke('notes:save', noteId, content, title),
    load: (noteId) => ipcRenderer.invoke('notes:load', noteId),
    list: () => ipcRenderer.invoke('notes:list'),
    delete: (noteId) => ipcRenderer.invoke('notes:delete', noteId)
  },
  settings: {
    save: (settings) => ipcRenderer.invoke('settings:save', settings),
    load: () => ipcRenderer.invoke('settings:load')
  },
  app: {
    reloadWindow: () => ipcRenderer.invoke('app:reloadWindow'),
    rebuildAndReload: () => ipcRenderer.invoke('app:rebuildAndReload')
  },
  general: {
    exportWorkspace: () => ipcRenderer.invoke('general:exportWorkspace'),
    resetFeatures: (repoUrl) => ipcRenderer.invoke('general:resetFeatures', repoUrl)
  },
  ipcRenderer: {
    on: (channel, listener) => ipcRenderer.on(channel, listener),
    removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener)
  }
}) 