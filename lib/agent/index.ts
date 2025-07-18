import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClaudeCodeTool } from '../tools/claude-code'
import { createDocumentEditorTool } from '../tools/document-editor'

export function createAgentStream(messages: any[], options: { noteId?: string, noteContent?: string, mainWindow?: any } = {}) {
  const tools: any = {
    'claude-code': createClaudeCodeTool(options.mainWindow),
    'document-editor': createDocumentEditorTool({ 
      noteId: options.noteId || '',
      noteContent: options.noteContent || ''
    })
  }

  return streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    toolCallStreaming: true,
    tools,
    onError: (error) => {},
    ...options
  })
}

export * from './types'
export * from './part-processor' 