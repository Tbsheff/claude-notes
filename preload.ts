const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('env', {
  NODE_ENV: process.env.NODE_ENV,
  DEBUG_LOGGER: process.env.DEBUG_LOGGER
})

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  ai: {
    initialize: (config) => ipcRenderer.invoke('ai:initialize', config),
    processRequest: (message) => ipcRenderer.invoke('ai:process-request', message),
    agentStream: (payload) => ipcRenderer.invoke('ai:agent-stream', payload),
    generateTitle: (userMessage) => ipcRenderer.invoke('ai:generate-title', userMessage)
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
  chats: {
    create: (chat) => ipcRenderer.invoke('chats:create', chat),
    addMessage: (chatId, message) => ipcRenderer.invoke('chats:addMessage', chatId, message),
    getMessages: (chatId) => ipcRenderer.invoke('chats:getMessages', chatId),
    get: (chatId) => ipcRenderer.invoke('chats:get', chatId),
    list: () => ipcRenderer.invoke('chats:list'),
    updateMessage: (message) => ipcRenderer.invoke('chats:updateMessage', message),
    updateTitle: (chatId, title) => ipcRenderer.invoke('chats:updateTitle', chatId, title),
    delete: (chatId) => ipcRenderer.invoke('chats:delete', chatId)
  },
  auth: {
    startOAuth: () => ipcRenderer.invoke('auth:start-oauth'),
    storeTokens: (tokens) => ipcRenderer.invoke('auth:store-tokens', tokens),
    getTokens: () => ipcRenderer.invoke('auth:get-tokens'),
    clearTokens: () => ipcRenderer.invoke('auth:clear-tokens'),
    hasValidTokens: () => ipcRenderer.invoke('auth:has-valid-tokens'),
    getUserInfo: () => ipcRenderer.invoke('auth:get-user-info')
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
    on: (channel, listener) => {
      const validChannels = [
        'claude-event', 
        'claude-code-event',
        'ai-stream-part', 
        'ai-stream-complete', 
        'ai-stream-error'
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, listener)
      }
    },
    removeListener: (channel, listener) => {
      const validChannels = [
        'claude-event',
        'claude-code-event',
        'ai-stream-part',
        'ai-stream-complete',
        'ai-stream-error'
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    send: (channel, ...args) => ipcRenderer.send(channel, ...args)
  },
  document: {
    update: (request) => ipcRenderer.invoke('document:update', request),
    getContent: () => ipcRenderer.invoke('document:get-content')
  }
})
