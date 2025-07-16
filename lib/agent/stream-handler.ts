import { MessageParser } from './message-parser'
import { UnifiedMessage, MessageBlock, ToolBlock } from './types'
import { EventEmitter } from 'events'

export interface StreamHandlerOptions {
  onMessageUpdate?: (message: UnifiedMessage) => void
  onStreamComplete?: (message: UnifiedMessage) => void
  onStreamError?: (error: string) => void
  onThinkingStart?: () => void
  onThinkingEnd?: () => void
}

export class StreamHandler extends EventEmitter {
  private parser: MessageParser
  private currentMessage: UnifiedMessage | null = null
  private isThinking = false
  private thinkingBlockId: string | null = null

  constructor(private options: StreamHandlerOptions = {}) {
    super()
    this.parser = MessageParser.getInstance()
  }

  startStream(streamId: string): void {
    this.currentMessage = {
      id: streamId,
      role: 'assistant',
      content: '',
      blocks: [],
      metadata: {
        timestamp: new Date(),
        streamId,
        isStreaming: true
      }
    }

    this.startThinking()
    this.emitMessageUpdate()
  }

  handleTextChunk(chunk: string, fullText: string): void {
    if (!this.currentMessage) return

    this.endThinking()

    const parsedMessage = this.parser.parseStreamChunk(
      this.currentMessage.id,
      chunk,
      fullText
    )

    this.currentMessage = {
      ...this.currentMessage,
      content: parsedMessage.content,
      blocks: parsedMessage.blocks
    }

    this.emitMessageUpdate()
  }

  handleToolCall(toolName: string, toolCallId: string, args: any): void {
    if (!this.currentMessage) return

    const toolBlock = this.parser.parseToolCall(
      this.currentMessage.id,
      toolName,
      toolCallId,
      args
    )

    this.currentMessage = this.parser.updateMessageWithBlock(
      this.currentMessage,
      toolBlock
    )

    this.emitMessageUpdate()
  }

  handleToolResult(toolCallId: string, toolName: string, result: any): void {
    if (!this.currentMessage) return

    const toolBlock = this.parser.parseToolResult(toolCallId, toolName, result)

    this.currentMessage = this.parser.updateMessageWithBlock(
      this.currentMessage,
      toolBlock
    )

    this.emitMessageUpdate()
  }

  updateToolLogs(toolCallId: string, logs: string[]): void {
    if (!this.currentMessage) return

    const blockIndex = this.currentMessage.blocks.findIndex(
      block => block.id === toolCallId && block.type === 'tool'
    )

    if (blockIndex !== -1) {
      const toolBlock = this.currentMessage.blocks[blockIndex] as ToolBlock
      const updatedBlock: ToolBlock = {
        ...toolBlock,
        data: {
          ...toolBlock.data,
          logs
        }
      }

      this.currentMessage = this.parser.updateMessageWithBlock(
        this.currentMessage,
        updatedBlock
      )

      this.emitMessageUpdate()
    }
  }

  handleToolCallDelta(toolCallId: string, argsTextDelta: string): void {
    if (!this.currentMessage) return

    const blockIndex = this.currentMessage.blocks.findIndex(
      block => block.id === toolCallId && block.type === 'tool'
    )

    if (blockIndex !== -1) {
      const toolBlock = this.currentMessage.blocks[blockIndex] as ToolBlock
      
      // Accumulate the raw JSON text
      const currentArgs = (toolBlock.data.args || '') + argsTextDelta
      toolBlock.data.args = currentArgs
      
      // Try to parse the accumulated JSON to see if we have a complete object
      try {
        const parsedArgs = JSON.parse(currentArgs)
        toolBlock.data.args = parsedArgs
      } catch (e) {
        // Still accumulating, keep the raw string
      }
      
      // Emit the updated message
      this.emit('message-updated', this.currentMessage)
    }
  }

  completeStream(): void {
    if (!this.currentMessage) return

    this.endThinking()

    this.currentMessage = {
      ...this.currentMessage,
      metadata: {
        ...this.currentMessage.metadata,
        isStreaming: false
      }
    }

    this.emitStreamComplete()
    this.currentMessage = null
  }

  handleError(error: string): void {
    this.endThinking()
    this.currentMessage = null
    this.emitStreamError(error)
  }

  private startThinking(): void {
    if (this.isThinking) return

    this.isThinking = true
    const thinkingBlock = this.parser.parseThinking()
    this.thinkingBlockId = thinkingBlock.id

    if (this.currentMessage) {
      this.currentMessage = this.parser.updateMessageWithBlock(
        this.currentMessage,
        thinkingBlock
      )
    }

    this.options.onThinkingStart?.()
  }

  private endThinking(): void {
    if (!this.isThinking || !this.thinkingBlockId || !this.currentMessage) return

    this.isThinking = false
    this.currentMessage = this.parser.removeBlockFromMessage(
      this.currentMessage,
      this.thinkingBlockId
    )
    this.thinkingBlockId = null

    this.options.onThinkingEnd?.()
  }

  private emitMessageUpdate(): void {
    if (this.currentMessage) {
      this.options.onMessageUpdate?.(this.currentMessage)
      this.emit('message-update', this.currentMessage)
    }
  }

  private emitStreamComplete(): void {
    if (this.currentMessage) {
      this.options.onStreamComplete?.(this.currentMessage)
      this.emit('stream-complete', this.currentMessage)
    }
  }

  private emitStreamError(error: string): void {
    this.options.onStreamError?.(error)
    this.emit('stream-error', error)
  }

  getCurrentMessage(): UnifiedMessage | null {
    return this.currentMessage
  }

  isStreamingActive(): boolean {
    return this.currentMessage?.metadata.isStreaming ?? false
  }
} 