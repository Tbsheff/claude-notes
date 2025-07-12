export interface ElectronAPI {
  openFile: () => Promise<string | undefined>;
  saveFile: (content: string) => Promise<boolean>;
  getVersion: () => Promise<string>;
  ai: {
    initialize: (config?: { apiKey?: string }) => Promise<{ success: boolean, error?: string }>;
    processRequestWorkspace: (message: string) => Promise<{ success: boolean, response?: string, error?: string, changedFiles?: string[] }>;
  };
  llmCall: (messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>, model?: string) => Promise<{ success: boolean, content?: string, error?: string }>;
  app: {
    reloadWindow: () => Promise<void>;
    rebuildAndReload: () => Promise<{ success: boolean; error?: string }>;
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