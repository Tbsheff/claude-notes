const { ipcMain } = require('electron')
import * as aiService from '../services/ai-service'

export const getChangedFiles = aiService.getChangedFiles
export const setMainWindow = aiService.setMainWindow

export function setupAIHandlers(rebuildCallback: (workspacePath?: string) => void) {
  ipcMain.handle('ai:initialize', () => aiService.initializeAI({}))
  ipcMain.handle('ai:process-request', (_: any, message: string) => aiService.processRequest(message, rebuildCallback))
  ipcMain.handle('ai:agent-stream', (_: any, payload: { messages: any[], noteId?: string, noteContent?: string, streamId?: string, chatId?: string }) => aiService.createAgentStream(payload, rebuildCallback))
  ipcMain.handle('llm:call', (_: any, messages: any, model: string) => aiService.llmCall(messages, model))
  ipcMain.handle('ai:generate-title', (_: any, userMessage: string) => aiService.generateTitleForChat(userMessage))
} 