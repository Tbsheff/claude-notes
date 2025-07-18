import { UnifiedMessage, MessageBlock } from './types'
import { MutableRefObject, Dispatch, SetStateAction } from 'react'

const toolCallLogs: Record<string, any[]> = {}

export function addClaudeCodeLog(toolCallId: string, event: any) {
  if (!toolCallLogs[toolCallId]) {
    toolCallLogs[toolCallId] = []
  }
  
  if (event.type === 'assistant_message' || event.type === 'tool_action') {
    const formattedEvent = `${event.icon || '•'} ${event.message}`
    toolCallLogs[toolCallId].push(formattedEvent)
  }
}

export function getClaudeCodeLogs(toolCallId: string): any[] {
  return toolCallLogs[toolCallId] || []
}

export function clearClaudeCodeLogs(toolCallId: string) {
  delete toolCallLogs[toolCallId]
}

export function getClaudeCodeStatus(toolCallId: string, featureName?: string): string {
  const logs = toolCallLogs[toolCallId] || []
  if (logs.length === 0) return featureName ? `${featureName}: Building...` : 'Building...'
  
  const lastLog = logs[logs.length - 1]
  
  const statusMap = {
    'Validating workspace changes': 'Validating...',
    'Compiling project': 'Building...',
    'Applying changes to main codebase': 'Applying changes...',
    'changed files to main project': 'Applying changes...',
    'Task completed': 'Rebuilding...',
    'Rebuilding project': 'Rebuilding...',
    'Rebuild completed': 'Completed',
    'Rebuild failed': 'Failed',
    'Rebuild error': 'Error',
    'Agent ready': 'Completed'
  }
  
  let status = 'Building...'
  for (const [key, value] of Object.entries(statusMap)) {
    if (lastLog.includes(key)) {
      status = value
      break
    }
  }
  
  if (featureName) {
    return `${featureName}: ${status}`
  }
  
  return status
}

export function processStreamParts(
  streamId: string,
  parts: any[],
  existingMessage?: UnifiedMessage
): UnifiedMessage {
  let content = ''
  const toolCalls: Record<string, any> = {}

  for (const part of parts) {
    switch (part.type) {
      case 'text-delta':
        content += part.textDelta
        break
      case 'tool-call-streaming-start':
        toolCalls[part.toolCallId] = {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          state: 'input-streaming',
          rawInput: ''
        }
        break
      case 'tool-call-delta':
        if (toolCalls[part.toolCallId]) {
          toolCalls[part.toolCallId].rawInput += part.argsTextDelta
        }
        break
      case 'tool-call':
        toolCalls[part.toolCallId] = {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          state: 'input-available',
          input: part.args
        }
        break
      case 'tool-result':
        if (toolCalls[part.toolCallId]) {
          toolCalls[part.toolCallId].state = 'output-available'
          toolCalls[part.toolCallId].output = part.result
        }
        break
    }
  }

  const blocks: MessageBlock[] = []
  
  if (content.trim()) {
      blocks.push({
          id: `text-block-${streamId}`,
          type: 'text',
          status: 'completed',
          data: { text: content.trim() }
      })
  }
  
  for (const toolCall of Object.values(toolCalls)) {
    const statusMap: any = {
      'input-streaming': 'executing',
      'input-available': 'executing',
      'output-available': 'completed'
    }
    const claudeCodeLogs = getClaudeCodeLogs(toolCall.toolCallId)
    blocks.push({
      id: toolCall.toolCallId,
      type: 'tool',
      status: statusMap[toolCall.state] || 'executing',
      data: {
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        args: toolCall.input || toolCall.rawInput,
        result: toolCall.output,
        logs: [...claudeCodeLogs]
      }
    })
  }

  return {
    id: streamId,
    role: 'assistant',
    content,
    blocks,
    metadata: {
      timestamp: new Date(),
      streamId,
      isStreaming: true
    },
    toolInvocations: Object.values(toolCalls)
  }
} 

export function handleClaudeCodeEvent(
  event: any,
  streamingMessage: UnifiedMessage | null,
  streamPartsRef: MutableRefObject<Record<string, any[]>>,
  setStreamingMessage: Dispatch<SetStateAction<UnifiedMessage | null>>
): void {
  if (event.toolCallId) {
    addClaudeCodeLog(event.toolCallId, event)
    
    setStreamingMessage(prevStreamingMessage => {
      if (prevStreamingMessage) {
        const currentParts = streamPartsRef.current[prevStreamingMessage.id] || []
        const msg = processStreamParts(prevStreamingMessage.id, currentParts)
        
        return {
          ...msg,
          blocks: msg.blocks.map(block => {
            if (block.data.toolName === 'claude-code') {
              const freshLogs = getClaudeCodeLogs(block.data.toolCallId)
              const status = getClaudeCodeStatus(block.data.toolCallId, block.data.args?.feature_name)
              return {
                ...block,
                data: { 
                  ...block.data,
                  logs: [...freshLogs], 
                  currentStatus: status 
                }
              }
            }
            return {
              ...block,
              data: { ...block.data }
            }
          })
        }
      }
      return prevStreamingMessage
    })
  }
} 