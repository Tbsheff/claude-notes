const { ipcMain } = require('electron')
import * as aiService from '../services/ai-service'

export const getChangedFiles = aiService.getChangedFiles
export const setMainWindow = aiService.setMainWindow

export function setupAIHandlers(rebuildCallback: () => void) {
  ipcMain.handle('ai:initialize', () => aiService.initializeAI({}))
  ipcMain.handle('ai:process-request', (_: any, message: string) => aiService.processRequest(message, rebuildCallback))
  ipcMain.handle('llm:call', (_: any, messages: any, model: string) => aiService.llmCall(messages, model))
} 