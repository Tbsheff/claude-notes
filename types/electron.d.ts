import type { Note, APIKeysSettings, AppSettings } from '../app/modules/editor/api/types'
import type { UnifiedMessage } from '../lib/agent/types'

export interface ElectronAPI {
  openFile: () => Promise<string | undefined>;
  saveFile: (content: string) => Promise<boolean>;
  getVersion: () => Promise<string>;
  ai: {
    initialize: (config?: { apiKey?: string }) => Promise<{ success: boolean, error?: string }>;
    processRequest: (message: string) => Promise<{ success: boolean, response?: string, error?: string, changedFiles?: string[], workspaceResult?: { changedFilesCount?: number } }>;
    agentStream: (payload: { messages: Array<{ role: 'user' | 'assistant', content: string }>, noteId?: string, noteContent?: string, streamId?: string, chatId?: string }) => Promise<{ success: boolean, streamId?: string, error?: string }>;
    generateTitle: (userMessage: string) => Promise<{ success: boolean, title?: string, error?: string }>;
  };
  llmCall: (messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>, model?: string) => Promise<{ success: boolean, content?: string, error?: string }>;
  notes: {
    create: (title?: string, content?: string) => Promise<{ success: boolean, note?: Note, error?: string }>;
    save: (noteId: string, content: string, title?: string) => Promise<{ success: boolean, note?: Note, error?: string }>;
    load: (noteId: string) => Promise<{ success: boolean, note?: Note, error?: string }>;
    list: () => Promise<{ success: boolean, notes?: Note[], error?: string }>;
    delete: (noteId: string) => Promise<{ success: boolean, error?: string }>;
  };
  settings: {
    save: (settings: AppSettings) => Promise<{ success: boolean, error?: string }>;
    load: () => Promise<{ success: boolean, settings?: AppSettings, error?: string }>;
  };
  chats: {
    create: (chat: { id: string; title: string; createdAt: number; updatedAt: number }) => Promise<{ success: boolean; error?: string }>;
    addMessage: (chatId: string, message: UnifiedMessage) => Promise<{ success: boolean; error?: string }>;
    getMessages: (chatId: string) => Promise<{ success: boolean; messages?: UnifiedMessage[]; error?: string }>;
    get: (chatId: string) => Promise<{ success: boolean; chat?: any; error?: string }>;
    list: () => Promise<{ success: boolean; chats?: any[]; error?: string }>;
    updateMessage: (message: UnifiedMessage) => Promise<{ success: boolean; error?: string }>;
    updateTitle: (chatId: string, title: string) => Promise<{ success: boolean; error?: string }>;
    delete: (chatId: string) => Promise<{ success: boolean; error?: string }>;
  };
  app: {
    reloadWindow: () => Promise<void>;
    rebuildAndReload: () => Promise<{ success: boolean; error?: string }>;
  };
  general: {
    exportWorkspace: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    resetFeatures: (repoUrl: string) => Promise<{ success: boolean; error?: string }>;
  };
  ipcRenderer: {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
  };
  document: {
    update: (request: { action: 'append' | 'replace' | 'insert'; text: string; position?: number }) => Promise<{ success: boolean; error?: string }>
    getContent: () => Promise<string>
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 