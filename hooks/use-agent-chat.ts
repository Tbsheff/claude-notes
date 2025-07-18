import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { UnifiedMessage } from '@/lib/agent/types'
import { processStreamParts } from '@/lib/agent/part-processor'
import { addClaudeCodeLog, getClaudeCodeLogs, getClaudeCodeStatus } from '@/lib/agent/part-processor'
import { agentApi, createUserMessage, createAssistantMessage, createSystemMessage } from '@/app/modules/agent/api'
import { Note } from '@/app/modules/editor/api/types'

interface UseAgentChatProps {
  currentNote?: Note
}

export function useAgentChat({ currentNote }: UseAgentChatProps) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)

  const streamPartsRef = useRef<Record<string, any[]>>({})

  useEffect(() => {
    if (currentChatId) {
      loadChatMessages(currentChatId)
      localStorage.setItem('last-opened-chat', currentChatId)
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
                currentStatus: getClaudeCodeStatus(toolCallId, block.data.args?.feature_name)
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

    const handleStreamError = async (_event: any, data: { error: string; friendlyMessage?: string; timestamp: string }) => {
      const { error, friendlyMessage, timestamp } = data
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.metadata?.isStreaming) {
          const errorBlock = {
            id: `error-block-${lastMessage.id}-${Date.now()}`,
            type: 'error' as const,
            status: 'error' as const,
            data: {
              error,
              message: friendlyMessage || error
            }
          }
          
          const updatedMessage = {
            ...lastMessage,
            blocks: [...lastMessage.blocks, errorBlock],
            metadata: {
              ...lastMessage.metadata,
              isStreaming: false
            }
          }
          
          agentApi.updateMessage(updatedMessage).catch(() => {})
          return [...prev.slice(0, -1), updatedMessage]
        }
        return prev
      })
      
      setIsLoading(false)
    }

    window.electronAPI.ipcRenderer.on('ai-stream-part', handleStreamPart)
    window.electronAPI.ipcRenderer.on('ai-stream-complete', handleStreamComplete)
    window.electronAPI.ipcRenderer.on('claude-code-event', handleClaudeCodeEventLocal)
    window.electronAPI.ipcRenderer.on('ai-stream-error', handleStreamError)

    return () => {
      window.electronAPI.ipcRenderer.removeListener('ai-stream-part', handleStreamPart)
      window.electronAPI.ipcRenderer.removeListener('ai-stream-complete', handleStreamComplete)
      window.electronAPI.ipcRenderer.removeListener('claude-code-event', handleClaudeCodeEventLocal)
      window.electronAPI.ipcRenderer.removeListener('ai-stream-error', handleStreamError)
      
      Object.keys(streamPartsRef.current).forEach(key => {
        delete streamPartsRef.current[key]
      })
    }
  }, [])

  useEffect(() => {
    const loadLastOpenedChat = async () => {
      const lastChatId = localStorage.getItem('last-opened-chat')
      if (lastChatId && !currentChatId) {
        try {
          const chat = await agentApi.getChat(lastChatId)
          if (chat) {
            setCurrentChatId(lastChatId)
            setActiveTitle(chat.title || 'Untitled')
          }
        } catch (error) {
          
        }
      }
    }
    
    loadLastOpenedChat()
  }, [])

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
        { setCurrentChatId, setActiveTitle, fetchChats: async () => {} }
      )

      await agentApi.addMessage(chatId, userMessage)

      const assistantMessageId = uuidv4()
      const assistantMessage = createAssistantMessage(assistantMessageId)
      
      setMessages(prev => [...prev, assistantMessage])
      await agentApi.addMessage(chatId, assistantMessage)

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
        chatId: chatId,
      }
      
      await agentApi.startAgentStream(payload)
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      setIsLoading(false)
      setInputValue(userInputSnapshot)
      setMessages(prev => prev.slice(0, -1))
    }
  }

  const handleUpdateMessage = async (message: UnifiedMessage) => {
    setMessages(prev => agentApi.updateMessageById(prev, message.id, () => message))
    await agentApi.updateMessage(message)
  }

  const handleSelectChat = async (chatId: string) => {
    if (chatId === 'new') {
      handleCreateChat()
      return
    }
    
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
    localStorage.removeItem('last-opened-chat')
    Object.keys(streamPartsRef.current).forEach(key => {
      delete streamPartsRef.current[key]
    })
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await agentApi.deleteChat(chatId)
      
      if (currentChatId === chatId) {
        localStorage.removeItem('last-opened-chat')
        
        const result = await window.electronAPI.chats.list()
        if (result.success && result.chats && result.chats.length > 0) {
          const nextChat = result.chats[0]
          setCurrentChatId(nextChat.id)
          setActiveTitle(nextChat.title || 'Untitled')
        } else {
          setCurrentChatId(null)
          setMessages([])
          setActiveTitle(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    currentChatId,
    activeTitle,
    handleSendMessage,
    handleUpdateMessage,
    handleSelectChat,
    handleCreateChat,
    handleDeleteChat,
  }
} 