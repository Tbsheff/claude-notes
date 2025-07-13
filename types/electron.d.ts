import type { Note, APIKeysSettings, AppSettings } from '../app/modules/editor/api/types'

export interface ElectronAPI {
  openFile: () => Promise<string | undefined>;
  saveFile: (content: string) => Promise<boolean>;
  getVersion: () => Promise<string>;
  ai: {
    initialize: (config?: { apiKey?: string }) => Promise<{ success: boolean, error?: string }>;
    processRequest: (message: string) => Promise<{ success: boolean, response?: string, error?: string, changedFiles?: string[], workspaceResult?: { changedFilesCount?: number } }>;
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
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 