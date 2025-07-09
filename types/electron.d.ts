export interface ElectronAPI {
  openFile: () => Promise<string | undefined>;
  saveFile: (content: string) => Promise<boolean>;
  getVersion: () => Promise<string>;
  ai: {
    initialize: (config?: { apiKey?: string }) => Promise<{ success: boolean, error?: string }>;
    processRequest: (message: string) => Promise<{ success: boolean, response?: string, error?: string }>;
  };
  app: {
    reloadWindow: () => Promise<void>;
    rebuildAndReload: () => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 