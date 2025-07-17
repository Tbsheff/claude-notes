import { v4 as uuidv4 } from 'uuid'
import { UnifiedMessage } from '@/lib/agent/types'

export const createUserMessage = (content: string): UnifiedMessage => ({
  id: uuidv4(),
  content,
  role: 'user',
  blocks: [{
    id: uuidv4(),
    type: 'text',
    status: 'completed',
    data: { text: content }
  }],
  metadata: {
    timestamp: new Date()
  },
  toolInvocations: []
})

export const createAssistantMessage = (id: string): UnifiedMessage => ({
  id,
  role: 'assistant',
  content: '',
  blocks: [],
  metadata: { 
    timestamp: new Date(), 
    isStreaming: true, 
    streamId: id 
  },
  toolInvocations: []
})

export const createSystemMessage = (content: string): UnifiedMessage => ({
  id: 'system-document',
  content,
  role: 'assistant',
  blocks: [],
  metadata: { timestamp: new Date() },
  toolInvocations: []
})

export const agentApi = {
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
  
  ensureChatExists: async (
    currentChatId: string | null,
    firstMessage: string,
    callbacks: {
      setCurrentChatId: (id: string) => void
      setActiveTitle: (title: string) => void
    }
  ): Promise<string> => {
    if (currentChatId) return currentChatId

    const newChatId = uuidv4()
    const now = Date.now()

    await window.electronAPI.chats.create({
      id: newChatId,
      title: 'New Chat',
      createdAt: now,
      updatedAt: now
    })

    callbacks.setCurrentChatId(newChatId)
    callbacks.setActiveTitle('New Chat')

    generateTitle(newChatId, firstMessage, callbacks)
    
    return newChatId
  },

  updateMessageById: (
    messages: UnifiedMessage[],
    id: string,
    updater: (msg: UnifiedMessage) => UnifiedMessage
  ): UnifiedMessage[] => {
    const index = messages.findIndex(m => m.id === id)
    if (index === -1) {
      return [...messages, updater({} as UnifiedMessage)]
    }

    const updated = [...messages]
    updated[index] = updater(updated[index])
    return updated
  },

  loadChatMessages: async (chatId: string): Promise<UnifiedMessage[]> => {
    const result = await window.electronAPI.chats.getMessages(chatId)
    return result.success && result.messages ? result.messages : []
  },

  updateMessage: async (message: UnifiedMessage): Promise<void> => {
    try {
      await window.electronAPI.chats.updateMessage(message)
    } catch (error) {
      console.error('❌ Failed to update message in DB:', error)
      throw error
    }
  },

  deleteChat: async (chatId: string): Promise<void> => {
    try {
      await window.electronAPI.chats.delete(chatId)
    } catch (error) {
      console.error('❌ Failed to delete chat:', error)
      throw error
    }
  },

  getChat: async (chatId: string) => {
    try {
      const result = await window.electronAPI.chats.get(chatId)
      return result.success ? result.chat : null
    } catch (error) {
      console.error('❌ Failed to get chat:', error)
      return null
    }
  },

  addMessage: async (chatId: string, message: UnifiedMessage): Promise<void> => {
    try {
      await window.electronAPI.chats.addMessage(chatId, message)
    } catch (error) {
      console.error('❌ Failed to add message:', error)
      throw error
    }
  },

  startAgentStream: async (payload: any) => {
    try {
      const response = await (window.electronAPI.ai.agentStream as any)(payload)
      if (!response.success) {
        throw new Error(response.error || 'Agent stream failed')
      }
      return response
    } catch (error) {
      console.error('❌ Agent stream failed:', error)
      throw error
    }
  }
}

const generateTitle = async (
  chatId: string, 
  message: string,
  callbacks: {
    setActiveTitle: (title: string) => void
  }
) => {
  try {
    const titleResult = await window.electronAPI.ai.generateTitle(message)
    if (titleResult.success && titleResult.title) {
      await window.electronAPI.chats.updateTitle(chatId, titleResult.title)
      callbacks.setActiveTitle(titleResult.title)
    }
  } catch (error) {
    console.error('Title generation failed:', error)
  }
}
