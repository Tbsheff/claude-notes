import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { ChatInput } from './agnet-chat-input'
import { AgentMessage } from './agent-message'
import { DocumentPreview } from './document-card'
import { UnifiedMessage } from '@/lib/agent/types'
import { processStreamParts, handleClaudeCodeEvent } from '@/lib/agent/part-processor'
import { cn } from '@/lib/utils'

export function AgentChat({ isOpen, onToggle, currentNote, onApplyChanges }: any) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<UnifiedMessage | null>(null)
  
  const streamPartsRef = useRef<Record<string, any[]>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (!window.electronAPI) return

    const handleStreamPart = (_event: any, data: { streamId: string; part: any }) => {
      const { streamId, part } = data
      
      const currentParts = streamPartsRef.current[streamId] || []
      const newParts = [...currentParts, part]
      streamPartsRef.current[streamId] = newParts
      
      const msg = processStreamParts(streamId, newParts)
      setStreamingMessage(msg)
    }

    const handleStreamComplete = (_event: any, data: { streamId: string }) => {
      const finalParts = streamPartsRef.current[data.streamId] || []
      if (finalParts.length > 0) {
        const finalMessage = processStreamParts(data.streamId, finalParts)
        finalMessage.metadata.isStreaming = false
        setMessages(prev => [...prev, finalMessage])
      }
      
      setStreamingMessage(null)
      delete streamPartsRef.current[data.streamId]
      setIsLoading(false)
    }

    const handleClaudeCodeEventLocal = (_event: any, event: any) => {
      handleClaudeCodeEvent(event, streamingMessage, streamPartsRef, setStreamingMessage)
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: UnifiedMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      blocks: [{
        id: 'user-text',
        type: 'text',
        status: 'completed',
        data: { text: inputValue }
      }],
      metadata: {
        timestamp: new Date()
      },
      toolInvocations: []
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    const allMessages = [...messages, userMessage]
    
    if (currentNote && currentNote.content && currentNote.content.trim()) {
      const systemMessage: UnifiedMessage = {
        id: 'system-document',
        content: `Current document content:\n\n${currentNote.content}`,
        role: 'assistant',
        blocks: [],
        metadata: { timestamp: new Date() },
        toolInvocations: []
      }
      allMessages.unshift(systemMessage)
    }
    
    const payload = {
      messages: allMessages,
      noteId: currentNote?.id,
      noteContent: currentNote?.content
    }
    const response = await (window.electronAPI.ai.agentStream as any)(payload)
    
    if (!response.success) {
      console.log('❌ handleSendMessage: Response failed')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      "h-full bg-background border-l border-border flex flex-col flex-shrink-0 transition-[width] duration-200 ease-linear",
      isOpen ? "w-[480px]" : "w-0 overflow-hidden"
    )}>
      <div className="h-full flex flex-col w-full">
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
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 && !streamingMessage ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="text-sm opacity-50">No messages yet</div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <AgentMessage
                      key={message.id}
                      message={message}
                      currentNote={currentNote}
                      onApplyChanges={onApplyChanges}
                    />
                  ))}
                  {streamingMessage && (
                    <AgentMessage 
                      key={streamingMessage.id} 
                      message={streamingMessage} 
                      currentNote={currentNote}
                      onApplyChanges={onApplyChanges}
                    />
                  )}
                </>
              )}
              {isLoading && !streamingMessage && (
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
          </div>
          
          <div className="p-4 space-y-3">
            <DocumentPreview currentNote={currentNote} />
            
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

 