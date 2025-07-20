import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClaudeCodeTool } from '../tools/claude-code'
import { createDocumentEditorTool } from '../tools/document-editor'
import { AgentPrompt } from './prompt'
import { getErrorMessage } from './error-handler'
import { logger } from '../logger'

export function createAgentStream(messages: any[], options: { noteId?: string, noteContent?: string, mainWindow?: any } = {}) {
  const tools: any = {
    'claude-code': createClaudeCodeTool(options.mainWindow),
    'document-editor': createDocumentEditorTool({ 
      noteId: options.noteId || '',
      noteContent: options.noteContent || ''
    })
  }

  const filteredMessages = messages.filter(msg => 
    msg && msg.content && msg.content.trim() !== ''
  )

  const lastUserMessage = filteredMessages[filteredMessages.length - 1]?.content || 'No message'
  logger.agent(`Stream started: "${lastUserMessage}"`)

  return streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: AgentPrompt,
    messages: filteredMessages,
    toolCallStreaming: true,
    tools,
    maxSteps: 15,
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.agent(`ERROR: ${errorMsg}`)
      
      if (options.mainWindow) {
        const friendlyMessage = getErrorMessage(error)
        options.mainWindow.webContents.send('ai-stream-error', { 
          error: errorMsg,
          friendlyMessage,
          timestamp: new Date().toISOString()
        })
      }
    },
    ...options
  })
}

export * from './types'
export * from './part-processor' 