import React, { memo, useMemo, useCallback } from 'react'
import { SparklesIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChatMessageProps } from '../api/types'
import { CollapsibleTool } from './tools/collapsible-tool'
import equal from 'fast-deep-equal'

const renderToolResult = (toolName: string, result: any, toolCallId?: string, claudeCodeLogs?: Record<string, string[]>) => {
  if (toolName === 'claude-code') {
    const logs = claudeCodeLogs?.[toolCallId || ''] || []
    return (
      <div className="w-full max-w-lg md:max-w-2xl">
        <CollapsibleTool 
          title="Claude Code"
          icon={<SparklesIcon size={16} />}
          dataTestId="claude-code-completed"
        >
          <div className="space-y-2">
            <div className="text-sm text-green-600">
              {result.message || 'Task completed successfully'}
            </div>
            {logs.length > 0 && (
              <div className="border-t border-border pt-2">
                <div className="text-xs text-muted-foreground space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="font-mono">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleTool>
      </div>
    )
  }
  
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border">
      <div className="text-sm font-medium mb-1">{toolName}</div>
      <div className="text-xs text-muted-foreground">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </div>
    </div>
  )
}

const renderToolInvocation = (toolName: string, toolCallId: string, toolInvocation: any, claudeCodeLogs?: Record<string, string[]>) => {
  const baseClassName = "w-full max-w-lg md:max-w-2xl"
  
  switch (toolName) {
    case 'claude-code':
      const toolLogs = claudeCodeLogs?.[toolCallId] || []
      return (
        <div key={toolCallId} className={baseClassName}>
          <CollapsibleTool 
            title="Running Claude Code"
            icon={<SparklesIcon size={16} />}
            dataTestId="claude-code-executing"
          >
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Executing: {toolInvocation.args?.task || 'Unknown task'}
              </div>
              {toolLogs.length > 0 && (
                <div className="border-t border-border pt-2">
                  <div className="text-xs text-muted-foreground space-y-1">
                    {toolLogs.map((log, index) => (
                      <div key={index} className="font-mono">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleTool>
        </div>
      )
    default:
      return (
        <div key={toolCallId} className={baseClassName}>
          <CollapsibleTool 
            title={`Running ${toolName}`}
            icon={<SparklesIcon size={16} />}
            dataTestId={`${toolName}-executing`}
          >
            <div className="text-sm text-muted-foreground">
              Executing tool...
            </div>
          </CollapsibleTool>
        </div>
      )
  }
}

const PureChatMessageComponent: React.FC<ChatMessageProps> = ({ message, claudeCodeLogs }) => {
  const isUser = message.role === 'user'

  const renderTextContent = useCallback((text: string, key?: string) => {
    return (
      <div
        key={key}
        className={cn(
          "px-3 py-2 rounded-2xl text-sm break-words",
          isUser
            ? "bg-primary text-primary-foreground max-w-lg md:max-w-2xl ml-auto"
            : "bg-muted max-w-lg md:max-w-2xl",
        )}
      >
        {text}
      </div>
    )
  }, [isUser])

  const messageContent = useMemo(() => {
    const elements: React.ReactNode[] = []

    if (message.content?.trim()) {
      elements.push(renderTextContent(message.content, `message-${message.id}-content`))
    }

    if (!message.parts || message.parts.length === 0) {
      return elements
    }

    message.parts.forEach((part, index) => {
      const key = `message-${message.id}-part-${index}`

      if (part.type === 'text') {
        elements.push(renderTextContent(part.text || '', key))
        return
      }

      if (part.type === 'tool-invocation') {
        const { toolInvocation } = part
        const { toolName, toolCallId, state } = toolInvocation!

        if (state === 'call') {
          elements.push(renderToolInvocation(toolName, toolCallId, toolInvocation, claudeCodeLogs))
          return
        }

        if (state === 'result') {
          elements.push(renderToolResult(toolName, toolInvocation!.result, toolCallId, claudeCodeLogs))
          return
        }
      }
    })

    return elements
  }, [message.parts, message.content, message.id, renderTextContent, claudeCodeLogs])

  return (
    <motion.div
      className="w-full"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className={cn("flex gap-4 w-full mb-4", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              <SparklesIcon size={14} className="text-foreground" />
            </div>
          </div>
        )}

        <div className={cn("flex flex-col space-y-2", isUser ? "items-end max-w-[90%]" : "items-start max-w-[90%]")}>
          {messageContent}
        </div>
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
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
    
    // Сравниваем объекты claudeCodeLogs
    const prevLogs = prevProps.claudeCodeLogs || {}
    const nextLogs = nextProps.claudeCodeLogs || {}
    if (!equal(prevLogs, nextLogs)) return false
    
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
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
          <div className="translate-y-px">
            <SparklesIcon size={14} className="text-foreground" />
          </div>
        </div>
        <div className="flex flex-col gap-2 max-w-[75%]">
          <div className="p-3 rounded-2xl text-sm bg-muted text-muted-foreground">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  )
})

ThinkingMessage.displayName = 'ThinkingMessage'

export { ChatMessageComponent as AgentMessage } 