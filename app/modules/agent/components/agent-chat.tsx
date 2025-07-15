import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { ChatInput } from './agnet-chat-input'
import { AgentMessage } from './agent-message'
import { DocumentPreview } from './document-preview'
import { UnifiedMessage } from '@/lib/agent/types'
import { AgentChatProps } from '../api/types'

function useChatState() {
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<UnifiedMessage | null>(null)

  return {
    messages, setMessages,
    inputValue, setInputValue,
    isLoading, setIsLoading,
    streamingMessage, setStreamingMessage
  }
}

export function AgentChat({ isOpen, onToggle, currentNote }: AgentChatProps) {
  const chatState = useChatState()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatState.messages, chatState.streamingMessage])

  useEffect(() => {
    if (!window.electronAPI) return

    const handleMessageUpdate = (_event: any, data: { streamId: string; message: UnifiedMessage }) => {
      console.log('📝 Message update received:', data.message.id)
      chatState.setStreamingMessage(data.message)
    }

    const handleStreamComplete = (_event: any, data: { streamId: string; message: UnifiedMessage }) => {
      console.log('✅ Stream completed:', data.message.id)
      chatState.setMessages(prev => [...prev, data.message])
      chatState.setStreamingMessage(null)
        chatState.setIsLoading(false)
    }

    const handleStreamError = (_event: any, data: { streamId: string; error: string }) => {
      console.log('❌ Stream error:', data.error)
      chatState.setStreamingMessage(null)
      chatState.setIsLoading(false)
      
      const errorMessage: UnifiedMessage = {
        id: data.streamId,
        content: `Error: ${data.error}`,
        role: 'assistant',
        blocks: [{
          id: 'error',
          type: 'text',
          status: 'error',
          data: { text: `Error: ${data.error}` }
        }],
        metadata: {
          timestamp: new Date(),
          streamId: data.streamId
        }
      }
      chatState.setMessages(prev => [...prev, errorMessage])
    }

    window.electronAPI.ipcRenderer.on('agent-message-update', handleMessageUpdate)
    window.electronAPI.ipcRenderer.on('agent-stream-complete', handleStreamComplete)
    window.electronAPI.ipcRenderer.on('agent-stream-error', handleStreamError)

    return () => {
      window.electronAPI.ipcRenderer.removeListener('agent-message-update', handleMessageUpdate)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-complete', handleStreamComplete)
      window.electronAPI.ipcRenderer.removeListener('agent-stream-error', handleStreamError)
    }
  }, [])

  const handleSendMessage = async () => {
    if (!chatState.inputValue.trim() || chatState.isLoading) return

    console.log('🔄 handleSendMessage: Starting')
    console.log('📄 currentNote:', currentNote)
    console.log('📄 currentNote.content:', currentNote?.content)

    const userMessage: UnifiedMessage = {
      id: Date.now().toString(),
      content: chatState.inputValue,
      role: 'user',
      blocks: [{
        id: 'user-text',
        type: 'text',
        status: 'completed',
        data: { text: chatState.inputValue }
      }],
      metadata: {
      timestamp: new Date()
      }
    }

    chatState.setMessages(prev => [...prev, userMessage])
    chatState.setInputValue('')
    chatState.setIsLoading(true)

    try {
      const allMessages = [...chatState.messages, userMessage]
      
      if (currentNote && currentNote.content && currentNote.content.trim()) {
        console.log('📄 Adding document content to prompt:', currentNote.content.length, 'characters')
        const systemMessage: UnifiedMessage = {
          id: 'system-document',
          content: `Current document content:\n\n${currentNote.content}\n\nWhen editing the document, you can see the current content above. Use the document-editor tool to make changes.`,
          role: 'assistant',
          blocks: [{
            id: 'system-text',
            type: 'text',
            status: 'completed',
            data: { text: `Current document content:\n\n${currentNote.content}\n\nWhen editing the document, you can see the current content above. Use the document-editor tool to make changes.` }
          }],
          metadata: {
            timestamp: new Date()
          }
        }
        allMessages.unshift(systemMessage)
      } else {
        console.log('📄 No document content to add - currentNote:', !!currentNote, 'content:', currentNote?.content?.length || 0)
      }
      
      console.log('📄 Final allMessages:', allMessages.length, 'messages')
      
      const response = await window.electronAPI.ai.agentStream(allMessages)
      console.log('📡 handleSendMessage: Response received:', response)
      
      if (!response.success) {
        console.log('❌ handleSendMessage: Response failed')
        chatState.setIsLoading(false)
        const errorMessage: UnifiedMessage = {
          id: (Date.now() + 1).toString(),
          content: `Error: ${response.error || 'Task failed'}`,
          role: 'assistant',
          blocks: [{
            id: 'error',
            type: 'text',
            status: 'error',
            data: { text: `Error: ${response.error || 'Task failed'}` }
          }],
          metadata: {
          timestamp: new Date()
          }
        }
        chatState.setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.log('❌ handleSendMessage: Exception:', error)
      chatState.setIsLoading(false)
      const errorMessage: UnifiedMessage = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error}`,
        role: 'assistant',
        blocks: [{
          id: 'error',
          type: 'text',
          status: 'error',
          data: { text: `Error: ${error}` }
        }],
        metadata: {
        timestamp: new Date()
        }
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
              {chatState.messages.length === 0 && !chatState.streamingMessage ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="text-sm opacity-50">No messages yet</div>
                </div>
              ) : (
                <>
                  {chatState.messages.map((message) => (
                    <AgentMessage
                      key={message.id}
                      message={message}
                    />
                  ))}
                  {chatState.streamingMessage && (
                    <AgentMessage 
                      key={chatState.streamingMessage.id} 
                      message={chatState.streamingMessage} 
                    />
                  )}
                </>
              )}
              {chatState.isLoading && !chatState.streamingMessage && (
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
          
          <div className="p-4 space-y-3">
            <DocumentPreview currentNote={currentNote} />
            
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

 