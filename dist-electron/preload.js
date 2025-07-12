const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    ai: {
        initialize: (config) => ipcRenderer.invoke('ai:initialize', config),
        processRequestWorkspace: (message) => ipcRenderer.invoke('ai:process-request-workspace', message)
    },
    llmCall: (messages, model) => ipcRenderer.invoke('llm:call', messages, model),
    app: {
        reloadWindow: () => ipcRenderer.invoke('app:reloadWindow'),
        rebuildAndReload: () => ipcRenderer.invoke('app:rebuildAndReload')
    },
    ipcRenderer: {
        on: (channel, listener) => ipcRenderer.on(channel, listener),
        removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener)
    }
});
