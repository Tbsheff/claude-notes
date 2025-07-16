import { tool } from 'ai'
import { z } from 'zod'
import { BrowserWindow } from 'electron'

export function createClaudeCodeTool(mainWindow: BrowserWindow) {
  return tool({
    description: 'Execute Claude Code agent for complex coding tasks, file editing, and project analysis',
    parameters: z.object({
      task: z.string().describe('The specific coding task or request to perform')
    }),
    execute: async ({ task }, context) => {
      try {
        const { ClaudeCodeLogger } = await import('./logger')
        
        // Set current toolCallId for global access
        ClaudeCodeLogger.setCurrentToolCallId(context.toolCallId)
        
        // Set callback with toolCallId context from AI SDK v4
        ClaudeCodeLogger.setEventCallback((event) => {
          // Add toolCallId to events for specific tool block targeting
          const eventWithId = { ...event, toolCallId: context.toolCallId }
          console.log('🔥 [claude-code] Sending event:', eventWithId)
          mainWindow?.webContents.send('claude-code-event', eventWithId)
        })
        
        // Start processing with real-time streaming
        const { processRequest } = await import('../../../electron/services/ai-service')
        
        // Process request with streaming enabled
        const response = await processRequest(task, () => {})
        
        if (response?.success) {
          return {
            success: true,
            message: `Task completed successfully. ${response.workspaceResult?.changedFilesCount || 0} files were modified.`,
            changedFiles: response.workspaceResult?.changedFilesCount || 0
          }
        } else {
          return {
            success: false,
            error: response?.error || 'Unknown error occurred'
          }
        }
      } catch (error) {
        return {
          success: false,
          error: `Error executing Claude Code: ${error}`
        }
      }
    }
  })
}

export * from './core'
export { ClaudeCodeLogger, cleanWorkspacePath, getFileName, getDirName, truncateCommand, processToolMessage, getQueryOptions } from './logger' 
export * from './main-prompt'
export * from './types' 