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
    onChunk({ chunk }) {
      console.log('🧩 onChunk: Full chunk:', JSON.stringify(chunk, null, 2))
    },
    onFinish(result) {
      console.log('🏁 onFinish: Stream finished with reason:', result.finishReason)
      console.log('🏁 onFinish: Usage:', result.usage)
      console.log('🏁 onFinish: Response messages:', result.response?.messages?.length)
    },
    onError: (error) => console.error('❌ Agent stream error:', error),
    ...options
  })
}

export * from './types'
export * from './part-processor' 