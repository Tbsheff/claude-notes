import { 
  UnifiedMessage, 
  MessageBlock, 
  ToolBlock, 
  TextBlock, 
  ThinkingBlock, 
  ToolParser, 
  TextParser 
} from './types'

export class MessageParser {
  private static instance: MessageParser
  private toolParsers: Map<string, ToolParser> = new Map()
  private textParser: TextParser | null = null

  static getInstance(): MessageParser {
    if (!MessageParser.instance) {
      MessageParser.instance = new MessageParser()
      MessageParser.instance.initializeDefaultParsers()
    }
    return MessageParser.instance
  }

  private initializeDefaultParsers(): void {
    this.registerToolParser('claude-code', (data: any): ToolBlock => {
      const { toolName, toolCallId, args, result, status } = data
      
      return {
        id: toolCallId,
        type: 'tool',
        status,
        data: {
          toolName,
          toolCallId,
          args,
          result,
          logs: result?.logs || []
        }
      }
    })
  }

  registerToolParser(toolName: string, parser: ToolParser): void {
    this.toolParsers.set(toolName, parser)
  }

  registerTextParser(parser: TextParser): void {
    this.textParser = parser
  }

  parseStreamChunk(streamId: string, chunk: string, fullText: string): UnifiedMessage {
    const textBlock: TextBlock = {
      id: `text-${Date.now()}`,
      type: 'text',
      status: 'completed',
      data: { text: fullText }
    }

    return {
      id: streamId,
      role: 'assistant',
      content: fullText,
      blocks: [textBlock],
      metadata: {
        timestamp: new Date(),
        streamId,
        isStreaming: true
      }
    }
  }

  parseToolCall(streamId: string, toolName: string, toolCallId: string, args: any): ToolBlock {
    const parser = this.toolParsers.get(toolName)
    
    if (parser) {
      return parser({
        toolName,
        toolCallId,
        args,
        status: 'executing'
      })
    }

    return {
      id: toolCallId,
      type: 'tool',
      status: 'executing',
      data: {
        toolName,
        toolCallId,
        args
      }
    }
  }

  parseToolResult(toolCallId: string, toolName: string, result: any): ToolBlock {
    const parser = this.toolParsers.get(toolName)
    
    if (parser) {
      return parser({
        toolName,
        toolCallId,
        result,
        status: 'completed'
      })
    }

    return {
      id: toolCallId,
      type: 'tool',
      status: 'completed',
      data: {
        toolName,
        toolCallId,
        result
      }
    }
  }

  parseThinking(): ThinkingBlock {
    return {
      id: `thinking-${Date.now()}`,
      type: 'thinking',
      status: 'executing',
      data: { text: 'Thinking...' }
    }
  }

  updateMessageWithBlock(message: UnifiedMessage, block: MessageBlock): UnifiedMessage {
    const existingBlockIndex = message.blocks.findIndex(b => b.id === block.id)
    
    if (existingBlockIndex !== -1) {
      const updatedBlocks = [...message.blocks]
      updatedBlocks[existingBlockIndex] = block
      return { ...message, blocks: updatedBlocks }
    }

    return {
      ...message,
      blocks: [...message.blocks, block]
    }
  }

  removeBlockFromMessage(message: UnifiedMessage, blockId: string): UnifiedMessage {
    return {
      ...message,
      blocks: message.blocks.filter(block => block.id !== blockId)
    }
  }
} 