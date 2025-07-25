import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/lib/markdown'
import { ChatMessageProps } from '../api/types'
import { MessageBlock, ToolBlock, TextBlock, ThinkingBlock, ErrorBlock } from '@/lib/agent/types'
import { Note } from '@/app/modules/editor/api/types'
import { getToolComponent } from '@/lib/agent/tool-registry'
import './tools/claude-code-tool-view'
import './tools/document-editor-tool-view'
import equal from 'fast-deep-equal'

const renderTextBlock = (block: TextBlock, isUser: boolean) => {
  if (isUser) {
    return (
      <div className="px-3 py-2 rounded-2xl text-sm break-words bg-primary text-primary-foreground max-w-lg md:max-w-2xl ml-auto">
        {block.data.text}
      </div>
    )
  }
  
  return (
    <div className="text-sm break-words text-foreground max-w-lg md:max-w-2xl">
      <MarkdownRenderer>{block.data.text}</MarkdownRenderer>
    </div>
  )
}

const renderToolBlock = (block: ToolBlock, currentNote?: Note, onApplyChanges?: (data: { action: string; content: string; newNote?: Note }) => void, onUpdateBlock?: (updatedBlock: MessageBlock) => void) => {
  const { toolName, args, result, logs } = block.data
  const isCompleted = block.status === 'completed'
  
  const ToolComponent = getToolComponent(toolName)
  if (ToolComponent) {
    return (
      <div className="w-full">
        <ToolComponent block={block} currentNote={currentNote} onApplyChanges={onApplyChanges} onUpdateBlock={onUpdateBlock} />
      </div>
    )
  }
  
  return (
    <div className="w-full">
        <div className="space-y-1 text-sm">
          {args && (
            <div className="text-muted-foreground font-medium">
              Args: {JSON.stringify(args, null, 2)}
            </div>
          )}
          {logs && logs.length > 0 && (
            <div className="space-y-1 text-sm">
              {logs.map((line: string, idx: number) => (
                <div key={idx} className="flex gap-1 text-xs font-mono break-all">
                  <span className={
                    line.startsWith('+') ? 'text-green-600 dark:text-green-400' : 
                    line.startsWith('-') ? 'text-red-600 dark:text-red-400' : 
                    line.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 
                    line.startsWith('~') ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-muted-foreground'
                  }>
                    {line.slice(0, 2)}
                  </span>
                  <span className="flex-1">{line.slice(2)}</span>
                </div>
              ))}
            </div>
          )}
          {isCompleted && result && (
            <div className="text-muted-foreground text-xs">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </div>
          )}
        </div>
    </div>
  )
}

const renderThinkingBlock = (block: ThinkingBlock) => {
  return (
    <div className="text-sm text-muted-foreground">
      {block.data.text}
    </div>
  )
}

const renderErrorBlock = (block: ErrorBlock) => {
  return (
    <div className="text-sm break-words text-foreground max-w-lg md:max-w-2xl">
      <MarkdownRenderer>{block.data.message || block.data.error}</MarkdownRenderer>
    </div>
  )
}

const PureChatMessageComponent: React.FC<ChatMessageProps> = ({ message, currentNote, onApplyChanges, onUpdateMessage }) => {
  const isUser = message.role === 'user'

  const messageElements = useMemo(() => {
    return message.blocks.map((block, index) => {
      const key = `message-${message.id}-block-${index}`

      if (block.type === 'tool') {
        return (
          <div key={key} className="w-full">
            {renderToolBlock(block as ToolBlock, currentNote, onApplyChanges, (updatedBlock) => {
              if (onUpdateMessage) {
                const updatedMessage = {
                  ...message,
                  blocks: message.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b)
                }
                onUpdateMessage(updatedMessage)
              }
            })}
          </div>
        )
      }

      if (block.type === 'thinking') {
        return (
          <div key={key} className={cn('flex gap-4 w-full', isUser ? 'justify-end' : 'justify-start')}>
            <div className={cn('flex flex-col space-y-2', isUser ? 'items-end max-w-[90%]' : 'items-start max-w-[90%]')}>
              {renderThinkingBlock(block as ThinkingBlock)}
            </div>
          </div>
        )
      }

      if (block.type === 'error') {
        return (
          <div key={key} className={cn('flex gap-4 w-full', isUser ? 'justify-end' : 'justify-start')}>
            <div className={cn('flex flex-col space-y-2', isUser ? 'items-end max-w-[90%]' : 'items-start max-w-[90%]')}>
              {renderErrorBlock(block as ErrorBlock)}
            </div>
          </div>
        )
      }

      // default to text block
      return (
        <div key={key} className={cn('flex gap-4 w-full', isUser ? 'justify-end' : 'justify-start')}>
          <div className={cn('flex flex-col space-y-2', isUser ? 'items-end max-w-[90%]' : 'items-start max-w-[90%]')}>
            {renderTextBlock(block as TextBlock, isUser)}
          </div>
        </div>
      )
    })
  }, [message.blocks, message.id, isUser, onUpdateMessage])

  return (
    <motion.div
      className="w-full"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="w-full mb-4 space-y-2">
        {messageElements}
      </div>
    </motion.div>
  )
}

export const ChatMessageComponent = memo(
  PureChatMessageComponent,
  (prevProps, nextProps) => {
    if (prevProps.message.id !== nextProps.message.id) return false
    if (prevProps.message.role !== nextProps.message.role) return false
    if (prevProps.message.content !== nextProps.message.content) return false
    if (!equal(prevProps.message.blocks, nextProps.message.blocks)) return false
    
    return true
  }
)

export const ThinkingMessage = memo(() => {
  return (
    <motion.div
      className="w-full"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
    >
      <div className="flex gap-4 w-full justify-start mb-4">
        <div className="flex flex-col gap-2 max-w-[75%]">
          <div className="text-sm text-muted-foreground">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  )
})

ThinkingMessage.displayName = 'ThinkingMessage'

export { ChatMessageComponent as AgentMessage } 