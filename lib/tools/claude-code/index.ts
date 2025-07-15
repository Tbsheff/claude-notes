import { tool } from 'ai'
import { z } from 'zod'

export const claudeCodeTool = tool({
  description: 'Execute Claude Code agent for complex coding tasks, file editing, and project analysis',
  parameters: z.object({
    task: z.string().describe('The specific coding task or request to perform')
  }),
  execute: async ({ task }) => {
    try {
      const { ClaudeCodeLogger } = await import('./logger')
      ClaudeCodeLogger.logStart()
      
      const { processRequest } = await import('../../../electron/services/ai-service')
      const response = await processRequest(task, () => {
        console.log('🔄 Claude Code tool completed, rebuild will be handled by agent stream')
      })
      
      if (response?.success) {
        ClaudeCodeLogger.logComplete()
        return {
          success: true,
          message: `Task completed successfully. ${response.workspaceResult?.changedFilesCount || 0} files were modified.`,
          changedFiles: response.workspaceResult?.changedFilesCount || 0
        }
      } else {
        ClaudeCodeLogger.logError(response?.error || 'Unknown error occurred')
        return {
          success: false,
          error: response?.error || 'Unknown error occurred'
        }
      }
    } catch (error) {
      const { ClaudeCodeLogger } = await import('./logger')
      ClaudeCodeLogger.logError(error)
      return {
        success: false,
        error: `Error executing Claude Code: ${error}`
      }
    }
  }
})

export * from './core'
export { ClaudeCodeLogger, cleanWorkspacePath, getFileName, getDirName, truncateCommand, processToolMessage, getQueryOptions } from './logger' 
export * from './main-prompt'
export * from './types' 