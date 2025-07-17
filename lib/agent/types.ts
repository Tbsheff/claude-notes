export interface UnifiedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  blocks: MessageBlock[]
  metadata: MessageMetadata
  toolInvocations?: any[]
}

export interface MessageBlock {
  id: string
  type: 'text' | 'tool' | 'thinking'
  data: any
  status: 'pending' | 'executing' | 'completed' | 'error'
}

export interface MessageMetadata {
  timestamp: Date
  streamId?: string
  isStreaming?: boolean
}

export interface ToolBlock extends MessageBlock {
  type: 'tool'
  data: {
    toolName: string
    toolCallId: string
    args?: any
    result?: any
    logs?: string[]
    currentStatus?: string
  }
}

export interface TextBlock extends MessageBlock {
  type: 'text'
  data: {
    text: string
  }
}

export interface ThinkingBlock extends MessageBlock {
  type: 'thinking'
  data: {
    text: string
  }
}

export type ToolParser = (data: any) => ToolBlock
export type TextParser = (data: any) => TextBlock
