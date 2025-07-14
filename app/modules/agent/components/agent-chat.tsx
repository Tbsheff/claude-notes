import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { ChatInput } from './agnet-chat-input'
import { AgentMessage, ThinkingMessage } from './agent-message'
import { ClaudeEvent } from '@/lib/tools/claude-code/types'
import { ChatMessage, AgentChatProps } from '../api/types'

function useChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [claudeEvents, setClaudeEvents] = useState<ClaudeEvent[]>([])
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null)
  const [isExecutingTool, setIsExecutingTool] = useState(false)
  const [claudeCodeLogs, setClaudeCodeLogs] = useState<Record<string, string[]>>({})

  const updateThinking = useCallback((thinking: boolean) => {
    console.log('🤔 updateThinking called with:', thinking)
    setIsThinking(thinking)
  }, [])

  return {
    messages, setMessages,
    inputValue, setInputValue,
    isLoading, setIsLoading,
    isThinking, updateThinking,
    claudeEvents, setClaudeEvents,
    streamingMessage, setStreamingMessage,
    isExecutingTool, setIsExecutingTool,
    claudeCodeLogs, setClaudeCodeLogs
  }
}

export function AgentChat({ isOpen, onToggle }: AgentChatProps) {
  const chatState = useChatState()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatState.messages, chatState.claudeEvents, chatState.streamingMessage, chatState.isThinking, chatState.isExecutingTool, chatState.claudeCodeLogs])

  useEffect(() => {
    if (!window.electronAPI) return

    const handleClaudeCodeLogUpdate = (_event: any, data: { toolCallId: string; logs: string[] }) => {
      console.log('📝 Claude Code logs updated:', data.toolCallId, data.logs)
      console.log('📋 Current claudeCodeLogs state:', chatState.claudeCodeLogs)
      chatState.setClaudeCodeLogs(prev => {
        const updated = {
          ...prev,
          [data.toolCallId]: data.logs
        }
        console.log('📋 New claudeCodeLogs state:', updated)
        return updated
      })
    }

    const handleAgentEvent = (_event: any, agentEvent: ClaudeEvent) => {
      console.log('🎭 handleAgentEvent: Received event:', agentEvent)
      chatState.setClaudeEvents(prev => [...prev, agentEvent])

      if (agentEvent.type === 'tool_action' || agentEvent.type === 'tool_result') {
        console.log('🔧 handleAgentEvent: Adding tool event to streamingMessage')
        chatState.setStreamingMessage(prev => {
          if (!prev) return prev
          const newPart = {
            type: 'text',
            text: agentEvent.message
          } as any
          return { ...prev, parts: [...(prev.parts || []), newPart] }
        })
      }

      if (agentEvent.type === 'complete') {
        console.log('✅ handleAgentEvent: COMPLETE event - but NOT moving streaming to messages yet!')
        console.log('✅ handleAgentEvent: Current streamingMessage:', chatState.streamingMessage)
        chatState.setIsLoading(false)
        setTimeout(() => chatState.setClaudeEvents([]), 2000)
      }
      if (agentEvent.type === 'start') chatState.setIsLoading(true)
      if (agentEvent.type === 'error') chatState.setIsLoading(false)
    }

    const handleStreamStart = (_event: any, data: { streamId: string }) => {
      console.log('🚀 handleStreamStart: Stream started, streamId:', data.streamId)
      const tempMessage: ChatMessage = {
        id: data.streamId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        parts: []
      }
      chatState.setStreamingMessage(tempMessage)
      console.log('💬 handleStreamStart: Set streamingMessage:', tempMessage)
      chatState.setIsLoading(true)
    }

    const handleStreamChunk = (_event: any, data: { streamId: string; chunk: string; fullText: string; message?: any }) => {
      console.log('📝 handleStreamChunk: Chunk received:', data.chunk.substring(0, 20) + '...')
      // Сбрасываем thinking при первом ответе
      chatState.updateThinking(false)
      console.log('🤔 handleStreamChunk: Set isThinking to false')
      
      chatState.setStreamingMessage(prev => {
        if (!prev || prev.id !== data.streamId) return prev
        
        const updatedMessage = {
          ...prev,
          content: data.fullText,
          parts: data.message?.parts || prev.parts || []
        }
        
        return updatedMessage
      })
    }

    const handleToolCall = (_event: any, data: { streamId: string; toolCall: any; message: any }) => {
      console.log('🔧 handleToolCall: Tool call received:', data.toolCall.toolInvocation?.toolName)
      chatState.setIsExecutingTool(true)
      
      // НЕ убираем thinking здесь - только в handleStreamChunk
      
      chatState.setStreamingMessage(prev => {
        if (!prev || prev.id !== data.streamId) return prev
        
        const updatedMessage = {
          ...prev,
          parts: [...(prev.parts || []), ...data.message.parts || []]
        }
        
        return updatedMessage
      })
    }

    const handleToolResult = (_event: any, data: { streamId: string; toolResult: any; message: any }) => {
      console.log('✅ handleToolResult: Tool result received')
      console.log('✅ handleToolResult: Data received:', data)
      console.log('✅ handleToolResult: Current streamingMessage before update:', chatState.streamingMessage)
      console.log('✅ handleToolResult: Current claudeCodeLogs:', chatState.claudeCodeLogs)
      
      chatState.setIsExecutingTool(false)
      chatState.setStreamingMessage(prev => {
        if (!prev || prev.id !== data.streamId) {
          console.log('✅ handleToolResult: No matching streaming message')
          return prev
        }
        
        const updatedMessage = {
          ...prev,
          parts: data.message.parts || prev.parts || []
        }
        console.log('✅ handleToolResult: Updated streamingMessage:', updatedMessage)
        
        return updatedMessage
      })
    }

    const handleToolCallDelta = (_event: any, data: { streamId: string; argsTextDelta: string; message: any }) => {
      console.log('🔸 handleToolCallDelta: Delta received')
      chatState.setStreamingMessage(prev => {
        if (!prev || prev.id !== data.streamId) return prev
        
        const updatedMessage = {
          ...prev,
          parts: data.message.parts || prev.parts || []
        }
        
        return updatedMessage
      })
    }

    const handleStreamComplete = (_event: any, data: { streamId: string; fullText: string; message?: any }) => {
      console.log('✅ handleStreamComplete: Stream completed')
      console.log('✅ handleStreamComplete: Data received:', data)
      console.log('✅ handleStreamComplete: Current streamingMessage before update:', chatState.streamingMessage)
      console.log('✅ handleStreamComplete: Current claudeCodeLogs:', chatState.claudeCodeLogs)
      
      // Гарантируем, что thinking отключён
      chatState.updateThinking(false)
      console.log('🤔 handleStreamComplete: Set isThinking to false')
      
      chatState.setStreamingMessage(prev => {
        if (!prev || prev.id !== data.streamId) {
          console.log('✅ handleStreamComplete: No matching streaming message, returning null')
          return prev
        }
        const updatedMessage = {
          ...prev,
          content: data.fullText,
          parts: data.message?.parts || prev.parts || []
        }
        console.log('✅ handleStreamComplete: Updated streamingMessage:', updatedMessage)
        console.log('✅ handleStreamComplete: NOW moving to messages and clearing streaming')
        
        // ТЕПЕРЬ перемещаем в messages и очищаем streaming
        chatState.setMessages(m => [...m, updatedMessage])
        chatState.setIsLoading(false)
        return null
      })
    }

    const handleStreamError = (_event: any, data: { streamId: string; error: string }) => {
      console.log('❌ handleStreamError: Stream error:', data.error)
      chatState.setStreamingMessage(null)
      chatState.setIsLoading(false)
      chatState.updateThinking(false)
      console.log('🤔 handleStreamError: Set isThinking to false')
      
      const errorMessage: ChatMessage = {
        id: data.streamId,
        content: `Error: ${data.error}`,
        role: 'assistant',
        timestamp: new Date()
      }
      chatState.setMessages(prev => [...prev, errorMessage])
    }

    window.claudeEvents?.on(handleAgentEvent)
    window.electronAPI.ipcRenderer.on('agent-stream-start', handleStreamStart)
    window.electronAPI.ipcRenderer.on('agent-stream-chunk', handleStreamChunk)
    window.electronAPI.ipcRenderer.on('agent-stream-tool-call', handleToolCall)
    window.electronAPI.ipcRenderer.on('agent-stream-complete', handleStreamComplete)
    window.electronAPI.ipcRenderer.on('agent-stream-error', handleStreamError)
    window.electronAPI.ipcRenderer.on('agent-stream-tool-result', handleToolResult)
    window.electronAPI.ipcRenderer.on('agent-stream-tool-call-delta', handleToolCallDelta)
    window.electronAPI.ipcRenderer.on('claude-code-log-update', handleClaudeCodeLogUpdate)

    return () => {
      window.claudeEvents?.off(handleAgentEvent)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-start', handleStreamStart)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-chunk', handleStreamChunk)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-tool-call', handleToolCall)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-complete', handleStreamComplete)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-error', handleStreamError)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-tool-result', handleToolResult)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-tool-call-delta', handleToolCallDelta)
      window.electronAPI.ipcRenderer.removeListener('claude-code-log-update', handleClaudeCodeLogUpdate)
    }
  }, []) // возвращаем пустой массив но используем стабильные callback'и из chatState

  const handleSendMessage = async () => {
    if (!chatState.inputValue.trim() || chatState.isLoading) return

    console.log('🔄 handleSendMessage: Starting')

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatState.inputValue,
      role: 'user',
      timestamp: new Date()
    }

    chatState.setMessages(prev => [...prev, userMessage])
    chatState.setInputValue('')
    chatState.setIsLoading(true)
    chatState.updateThinking(true)
    console.log('🤔 handleSendMessage: Set isThinking to true')

    try {
      const allMessages = [...chatState.messages, userMessage]
      const response = await window.electronAPI.ai.agentStream(allMessages)
      console.log('📡 handleSendMessage: Response received:', response)
      
      if (!response.success) {
        console.log('❌ handleSendMessage: Response failed')
        chatState.setIsLoading(false)
        chatState.updateThinking(false)
        console.log('🤔 handleSendMessage: Set isThinking to false (error)')
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: `Error: ${response.error || 'Task failed'}`,
          role: 'assistant',
          timestamp: new Date()
        }
        chatState.setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.log('❌ handleSendMessage: Exception:', error)
      chatState.setIsLoading(false)
      chatState.updateThinking(false)
      console.log('🤔 handleSendMessage: Set isThinking to false (exception)')
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error}`,
        role: 'assistant',
        timestamp: new Date()
      }
      chatState.setMessages(prev => [...prev, errorMessage])
    }
  }



  return (
    <div 
      className={`h-full bg-background border-l border-border flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[480px]' : 'w-0'
      }`}
      style={{ minWidth: isOpen ? '480px' : '0' }}
    >
      <div className={`h-full flex flex-col ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">AI Agent</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-4">
              {chatState.messages.length === 0 && chatState.claudeEvents.length === 0 && !chatState.streamingMessage && !chatState.isThinking ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="text-sm opacity-50">No messages yet</div>
                </div>
              ) : (
                <>
                  {chatState.messages.map((message) => (
                    <AgentMessage
                      key={message.id}
                      message={message}
                      claudeCodeLogs={chatState.claudeCodeLogs}
                    />
                  ))}
                  {chatState.streamingMessage && (
                    <AgentMessage 
                      key={chatState.streamingMessage.id} 
                      message={chatState.streamingMessage} 
                      claudeCodeLogs={chatState.claudeCodeLogs}
                    />
                  )}
                  {chatState.isThinking && (
                    <>
                      {console.log('🤔 Rendering ThinkingMessage: isThinking=', chatState.isThinking, 'isExecutingTool=', chatState.isExecutingTool)}
                      {console.log('🤔 ThinkingMessage Debug: streamingMessage=', chatState.streamingMessage)}
                      {console.log('🤔 ThinkingMessage Debug: claudeCodeLogs=', chatState.claudeCodeLogs)}
                      <ThinkingMessage />
                    </>
                  )}
                </>
              )}
              {chatState.isLoading && !chatState.streamingMessage && !chatState.isThinking && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4">
            <ChatInput
              value={chatState.inputValue}
              onChange={chatState.setInputValue}
              onSubmit={handleSendMessage}
              loading={chatState.isLoading}
              placeholder="Ask me anything..."
              disabled={chatState.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

 