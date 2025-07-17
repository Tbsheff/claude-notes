import { useState, useEffect, useRef, useMemo } from 'react'
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
import { agentApi, createUserMessage, createAssistantMessage, createSystemMessage } from '../api'
import { useAutoScroll } from '@/hooks/use-auto-scroll'
import { Note } from '@/app/modules/editor/api/types'

interface AgentChatProps {
  isOpen: boolean
  onToggle: () => void
  currentNote?: Note
  onApplyChanges: (data: { action: string; content: string; newNote?: Note }) => void
}

export function AgentChat({ isOpen, onToggle, currentNote, onApplyChanges }: AgentChatProps) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)

  const streamPartsRef = useRef<Record<string, any[]>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useAutoScroll(scrollRef, [messages])

  const showThinkingMessage = useMemo(() => {
    if (!isLoading) return false
    const streaming = messages.find(m => m.metadata?.isStreaming)
    return !streaming || streaming.blocks.length === 0
  }, [isLoading, messages])

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
        agentApi.updateMessageById(prev, streamId, (m) => processStreamParts(streamId, newParts, m))
      )
    }

    const handleStreamComplete = async (_event: any, data: { streamId: string }) => {
      const { streamId } = data
      const finalParts = streamPartsRef.current[data.streamId] || []
      if (finalParts.length > 0) {
        const finalMessage = processStreamParts(streamId, finalParts)
        finalMessage.metadata.isStreaming = false
        setMessages(prev => agentApi.updateMessageById(prev, streamId, () => finalMessage))
        
        await agentApi.updateMessage(finalMessage)
        console.log('📝 Assistant message updated in DB:', finalMessage.id)
      }
      delete streamPartsRef.current[data.streamId]
      setIsLoading(false)
    }

    const handleClaudeCodeEventLocal = async (_event: any, event: any) => {
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
          agentApi.updateMessage(newMsg).catch(() => {})
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
      
      Object.keys(streamPartsRef.current).forEach(key => {
        delete streamPartsRef.current[key]
      })
    }
  }, [])

  const handleUpdateMessage = async (message: UnifiedMessage) => {
    setMessages(prev => agentApi.updateMessageById(prev, message.id, () => message))
    await agentApi.updateMessage(message)
    console.log('📝 Message updated after tool interaction:', message.id)
  }

  const loadChatMessages = async (chatId: string) => {
    try {
      const messages = await agentApi.loadChatMessages(chatId)
      setMessages(messages)
    } catch (error) {
      console.error('❌ Failed to load chat messages:', error)
      setMessages([])
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !window.electronAPI) return

    const userMessage = createUserMessage(inputValue)
    const userInputSnapshot = inputValue
    const currentMessagesSnapshot = [...messages, userMessage]
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const chatId = await agentApi.ensureChatExists(
        currentChatId,
        userInputSnapshot,
        { setCurrentChatId, setActiveTitle }
      )

      await agentApi.addMessage(chatId, userMessage)

      const assistantMessageId = uuidv4()
      const assistantMessage = createAssistantMessage(assistantMessageId)
      
      setMessages(prev => [...prev, assistantMessage])
      await agentApi.addMessage(chatId, assistantMessage)
      console.log('📝 Assistant message placeholder created in DB:', assistantMessageId)

      if (chatId !== currentChatId) {
        setCurrentChatId(chatId)
      }

      streamPartsRef.current[assistantMessageId] = []

      if (currentNote && currentNote.content && currentNote.content.trim()) {
        const systemMessage = createSystemMessage(`Current document content:\n\n${currentNote.content}`)
        currentMessagesSnapshot.unshift(systemMessage)
      }

      const payload = {
        messages: currentMessagesSnapshot,
        noteId: currentNote?.id,
        noteContent: currentNote?.content,
        streamId: assistantMessageId,
      }
      
      await agentApi.startAgentStream(payload)
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      setIsLoading(false)
      setInputValue(userInputSnapshot)
      setMessages(prev => prev.slice(0, -1))
    }
  }

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId)
    const chat = await agentApi.getChat(chatId)
    if (chat) {
      setActiveTitle(chat.title || 'Untitled')
    }
  }

  const handleCreateChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setActiveTitle('New Chat')
    Object.keys(streamPartsRef.current).forEach(key => {
      delete streamPartsRef.current[key]
    })
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await agentApi.deleteChat(chatId)
      if (currentChatId === chatId) {
        setCurrentChatId(null)
        setMessages([])
        setActiveTitle('New Chat')
      }
    } catch (error) {
      
    }
  }

  return (
    <div className={cn(
      "h-full bg-background border-l border-border flex flex-col flex-shrink-0 transition-[width] duration-200 ease-linear",
      isOpen ? "w-[480px]" : "w-0 overflow-hidden"
    )}>
      <div className="h-full flex flex-col w-full">
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex-1 min-w-0">
            <ChatSwitcher
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onDeleteChat={handleDeleteChat}
              onCreateChat={handleCreateChat}
              currentChatTitle={activeTitle || undefined}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 mr-2 hover:bg-muted rounded-md"
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
              {showThinkingMessage && (
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

 