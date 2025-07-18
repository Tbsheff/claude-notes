import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClaudeCodeTool } from '../tools/claude-code'
import { createDocumentEditorTool } from '../tools/document-editor'
import { AgentPrompt } from './prompt'

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

  return streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: AgentPrompt,
    messages: filteredMessages,
    toolCallStreaming: true,
    tools,
    maxSteps: 15,
    onError: (error) => {
      console.error('Agent error:', error)
    },
    ...options
  })
}

export * from './types'
export * from './part-processor' 