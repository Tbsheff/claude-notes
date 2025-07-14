import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { claudeCodeTool } from '../tools/claude-code'

export function createAgentStream(messages: any[], options: any = {}) {
  console.log('🎬 createAgentStream: Creating stream with messages:', messages.length)
  
  return streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools: {
      'claude-code': claudeCodeTool
    },
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

export { claudeCodeTool } from '../tools/claude-code' 