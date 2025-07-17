import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { ChatInput } from './agnet-chat-input'
import { AgentMessage, ThinkingMessage } from './agent-message'
import { DocumentCard } from './document-card'
import { UnifiedMessage } from '@/lib/agent/types'
import { processStreamParts } from '@/lib/agent/part-processor'
import { addClaudeCodeLog, getClaudeCodeLogs, getClaudeCodeStatus } from '@/lib/agent/part-processor'
import { cn } from '@/lib/utils'
import { ChatSwitcher } from './chat-switcher'
import { v4 as uuidv4 } from 'uuid'

export function AgentChat({ isOpen, onToggle, currentNote, onApplyChanges }: any) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  const streamPartsRef = useRef<Record<string, any[]>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages]);

  useEffect(() => {
    if (currentChatId) {
      loadChatMessages(currentChatId)
    } else {
      setMessages([])
    }
  }, [currentChatId])

  useEffect(() => {
    if (!window.electronAPI) return

    const handleStreamPart = (_event: any, data: { streamId: string; part: any }) => {
      const { streamId, part } = data
      const currentParts = streamPartsRef.current[streamId] || []
      const newParts = [...currentParts, part]
      streamPartsRef.current[streamId] = newParts

      setMessages(prev => 
        prev.map(m => 
          m.id === streamId ? processStreamParts(streamId, newParts, m) : m
        )
      )
    }

    const handleStreamComplete = (_event: any, data: { streamId: string }) => {
      const { streamId } = data
      const finalParts = streamPartsRef.current[data.streamId] || []
      if (finalParts.length > 0) {
        const finalMessage = processStreamParts(streamId, finalParts)
        finalMessage.metadata.isStreaming = false
        setMessages(prev => prev.map(m => m.id === streamId ? finalMessage : m))
        window.electronAPI.chats.updateMessage(finalMessage)
        console.log('📝 Assistant message updated in DB:', finalMessage.id)
      }
      delete streamPartsRef.current[data.streamId]
      setIsLoading(false)
    }

    const handleClaudeCodeEventLocal = (_event: any, event: any) => {
      if (!event || !event.toolCallId) return
      const { toolCallId } = event
      addClaudeCodeLog(toolCallId, event)

      setMessages(prev => prev.map(msg => {
        let updated = false
        const newBlocks = msg.blocks.map(block => {
          if (block.type === 'tool' && block.id === toolCallId) {
            updated = true
            return {
              ...block,
              data: {
                ...block.data,
                logs: [...getClaudeCodeLogs(toolCallId)],
                currentStatus: getClaudeCodeStatus(toolCallId)
              }
            }
          }
          return block
        })
        if (updated) {
          const newMsg = { ...msg, blocks: newBlocks }
          window.electronAPI.chats.updateMessage(newMsg)
          return newMsg
        }
        return msg
      }))
    }

    window.electronAPI.ipcRenderer.on('ai-stream-part', handleStreamPart)
    window.electronAPI.ipcRenderer.on('ai-stream-complete', handleStreamComplete)
    window.electronAPI.ipcRenderer.on('claude-code-event', handleClaudeCodeEventLocal)

    return () => {
      window.electronAPI.ipcRenderer.removeListener('ai-stream-part', handleStreamPart)
      window.electronAPI.ipcRenderer.removeListener('ai-stream-complete', handleStreamComplete)
      window.electronAPI.ipcRenderer.removeListener('claude-code-event', handleClaudeCodeEventLocal)
    }
  }, [])

  const handleUpdateMessage = (message: UnifiedMessage) => {
    setMessages(prev => prev.map(m => m.id === message.id ? message : m))
    window.electronAPI.chats.updateMessage(message)
    console.log('📝 Message updated after tool interaction:', message.id)
  }

  const loadChatMessages = async (chatId: string) => {
    const result = await window.electronAPI.chats.getMessages(chatId)
    if (result.success && result.messages) {
      setMessages(result.messages)
    }
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: UnifiedMessage = {
      id: uuidv4(),
      content: inputValue,
      role: 'user',
      blocks: [{
        id: uuidv4(),
        type: 'text',
        status: 'completed',
        data: { text: inputValue }
      }],
      metadata: {
        timestamp: new Date()
      },
      toolInvocations: []
    }

    const currentMessagesSnapshot = [...messages, userMessage]
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    ;(async () => {
      let chatId = currentChatId
      if (!chatId) {
        const newChatId = uuidv4()
        const now = Date.now()

        await window.electronAPI.chats.create({
          id: newChatId,
          title: 'New Chat',
          createdAt: now,
          updatedAt: now
        })

        chatId = newChatId

        ;(async () => {
          const titleResult = await window.electronAPI.ai.generateTitle(inputValue)

          if (titleResult.success && titleResult.title) {
            const updateFn = (window.electronAPI.chats as any).updateTitle
            if (typeof updateFn === 'function') {
              await updateFn(newChatId, titleResult.title)
            }
          }
        })()
      }

      await window.electronAPI.chats.addMessage(chatId, userMessage)

      const assistantMessageId = uuidv4()
      const assistantMessage: UnifiedMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        blocks: [],
        metadata: { timestamp: new Date(), isStreaming: true, streamId: assistantMessageId },
        toolInvocations: []
      }
      setMessages(prev => [...prev, assistantMessage])
      await window.electronAPI.chats.addMessage(chatId, assistantMessage)
      console.log('📝 Assistant message placeholder created in DB:', assistantMessageId)

      if (chatId !== currentChatId) {
        setCurrentChatId(chatId)
      }

      streamPartsRef.current[assistantMessageId] = []

      if (currentNote && currentNote.content && currentNote.content.trim()) {
        const systemMessage: UnifiedMessage = {
          id: 'system-document',
          content: `Current document content:\n\n${currentNote.content}`,
          role: 'assistant',
          blocks: [],
          metadata: { timestamp: new Date() },
          toolInvocations: []
        }
        currentMessagesSnapshot.unshift(systemMessage)
      }

      const payload = {
        messages: currentMessagesSnapshot,
        noteId: currentNote?.id,
        noteContent: currentNote?.content,
        streamId: assistantMessageId,
      }
      const response = await (window.electronAPI.ai.agentStream as any)(payload)

      if (!response.success) {
        console.log('❌ handleSendMessage: Response failed')
        setIsLoading(false)
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId))
      }
    })()
  }

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const handleCreateChat = () => {
    setCurrentChatId(null)
    setMessages([])
  }

  const handleDeleteChat = async (chatId: string) => {
    await window.electronAPI.chats.delete(chatId)
    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }

  return (
    <div className={cn(
      "h-full bg-background border-l border-border flex flex-col flex-shrink-0 transition-[width] duration-200 ease-linear",
      isOpen ? "w-[480px]" : "w-0 overflow-hidden"
    )}>
      <div className="h-full flex flex-col w-full">
        <div className="flex items-center justify-between p-2 border-b border-border">
          <ChatSwitcher
            currentChatId={currentChatId}
            onSelectChat={handleSelectChat}
            onCreateChat={handleCreateChat}
            onDeleteChat={handleDeleteChat}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <AgentMessage
                  key={message.id}
                  message={message}
                  currentNote={currentNote}
                  onApplyChanges={onApplyChanges}
                  onUpdateMessage={handleUpdateMessage}
                />
              ))}
              {isLoading && (() => {
                const streaming = messages.find(m => m.metadata?.isStreaming)
                if (!streaming) return true
                return streaming.blocks.length === 0
              })() && (
                <ThinkingMessage />
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <DocumentCard currentNote={currentNote} />

            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSendMessage}
              loading={isLoading}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

 