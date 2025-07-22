import { UnifiedMessage, MessageBlock } from './types'
import { MutableRefObject, Dispatch, SetStateAction } from 'react'
import { getErrorMessage } from './error-handler'

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
    'Applied': 'Applying changes...',
    'No files changed': 'Completed',
    'Task completed': 'Completed',
    'Rebuilding project': 'Rebuilding...',
    'Rebuild completed': 'Completed',
    'Rebuild failed': 'Failed',
    'Rebuild error': 'Error',
    'Build failed': 'Failed',
    'Validation failed': 'Failed',
    'Starting build check': 'Building...',
    'Build completed successfully': 'Completed'
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
  _existingMessage?: UnifiedMessage
): UnifiedMessage {
  let content = ''
  const toolCalls: Record<string, any> = {}
  const blocks: MessageBlock[] = []
  const toolCallOrder: string[] = []
  
  let currentTextContent = ''

  for (const part of parts) {
    switch (part.type) {
      case 'text-delta':
        currentTextContent += part.textDelta
        content += part.textDelta
        break
      case 'tool-call-streaming-start':
        if (currentTextContent.trim()) {
          blocks.push({
            id: `text-block-${streamId}-${blocks.length}`,
            type: 'text',
            status: 'completed',
            data: { text: currentTextContent.trim() }
          })
          currentTextContent = ''
        }
        toolCallOrder.push(part.toolCallId)
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
        if (!toolCallOrder.includes(part.toolCallId)) {
          toolCallOrder.push(part.toolCallId)
        }
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
          
          const statusMap: any = {
            'input-streaming': 'executing',
            'input-available': 'executing',
            'output-available': 'completed'
          }
          const claudeCodeLogs = getClaudeCodeLogs(part.toolCallId)
          blocks.push({
            id: part.toolCallId,
            type: 'tool',
            status: statusMap[toolCalls[part.toolCallId].state] || 'executing',
            data: {
              toolName: toolCalls[part.toolCallId].toolName,
              toolCallId: part.toolCallId,
              args: toolCalls[part.toolCallId].input || toolCalls[part.toolCallId].rawInput,
              result: toolCalls[part.toolCallId].output,
              logs: [...claudeCodeLogs]
            }
          })
        }
        break
      case 'error':
        if (currentTextContent.trim()) {
          blocks.push({
            id: `text-block-${streamId}-${blocks.length}`,
            type: 'text',
            status: 'completed',
            data: { text: currentTextContent.trim() }
          })
          currentTextContent = ''
        }
        
        const rawError = typeof part.error === 'string' ? part.error : JSON.stringify(part.error)
        const friendlyMessage = getErrorMessage(part.error)
        
        blocks.push({
          id: `error-block-${streamId}-${blocks.length}`,
          type: 'error',
          status: 'error',
          data: { 
            error: rawError,
            message: friendlyMessage
          }
        })
        break
    }
  }

  for (const toolCallId of toolCallOrder) {
    const toolCall = toolCalls[toolCallId]
    if (toolCall && !blocks.find(b => b.id === toolCallId)) {
      const statusMap: any = {
        'input-streaming': 'executing',
        'input-available': 'executing',
        'output-available': 'completed'
      }
      const claudeCodeLogs = getClaudeCodeLogs(toolCallId)
      blocks.push({
        id: toolCallId,
        type: 'tool',
        status: statusMap[toolCall.state] || 'executing',
        data: {
          toolName: toolCall.toolName,
          toolCallId: toolCallId,
          args: toolCall.input || toolCall.rawInput,
          result: toolCall.output,
          logs: [...claudeCodeLogs]
        }
      })
    }
  }

  if (currentTextContent.trim()) {
    blocks.push({
      id: `text-block-${streamId}-${blocks.length}`,
      type: 'text',
      status: 'completed',
      data: { text: currentTextContent.trim() }
    })
  }

  if (blocks.length === 0 && content.trim()) {
    blocks.push({
      id: `text-block-${streamId}`,
      type: 'text',
      status: 'completed',
      data: { text: content.trim() }
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
  _streamingMessage: UnifiedMessage | null,
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