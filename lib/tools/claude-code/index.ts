import { tool } from 'ai'
import { z } from 'zod'
import { BrowserWindow } from 'electron'

export function createClaudeCodeTool(mainWindow: BrowserWindow) {
  return tool({
    description: 'Execute Claude Code agent for complex coding tasks, file editing, and project analysis',
    parameters: z.object({
      task: z.string().describe('The specific coding task or request to perform'),
      feature_name: z.string().optional().describe('2-3 words description of the feature being implemented (use Title Case with Capital Letters)')
    }),
    execute: async ({ task, feature_name }, context) => {
      try {
        const { ClaudeCodeLogger } = await import('./logger')
        

        ClaudeCodeLogger.setCurrentToolCallId(context.toolCallId)
        if (feature_name) {
          ClaudeCodeLogger.setCurrentFeatureName(feature_name)
        }
        

        ClaudeCodeLogger.setEventCallback((event) => {
          const eventWithId = { ...event, toolCallId: context.toolCallId }
          mainWindow?.webContents.send('claude-code-event', eventWithId)
        })
        

        const { processRequest } = await import('../../../electron/services/ai-service')
        

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
export * from './prompts/main-prompt'
export * from './types' 