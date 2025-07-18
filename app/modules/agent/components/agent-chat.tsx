import { useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { ChatInput } from './agnet-chat-input'
import { AgentMessage, ThinkingMessage } from './agent-chat-message'
import { DocumentCard } from './document-card'
import { cn } from '@/lib/utils'
import { AgentChatPopover } from './agent-chat-popover'
import { useAutoScroll } from '@/hooks/use-auto-scroll'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { Note } from '@/app/modules/editor/api/types'

interface AgentChatProps {
  isOpen: boolean
  onToggle: () => void
  currentNote?: Note
  onApplyChanges: (data: { action: string; content: string; newNote?: Note }) => void
}

export function AgentChat({ isOpen, onToggle, currentNote, onApplyChanges }: AgentChatProps) {
  const {
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
  } = useAgentChat({ currentNote })

  const scrollRef = useRef<HTMLDivElement>(null)
  
  useAutoScroll(scrollRef, [messages])

  const showThinkingMessage = useMemo(() => {
    if (!isLoading) return false
    const streaming = messages.find(m => m.metadata?.isStreaming)
    return !streaming || streaming.blocks.length === 0
  }, [isLoading, messages])



  return (
    <div className={cn(
      "h-full bg-background border-l border-border flex flex-col flex-shrink-0 transition-[width] duration-200 ease-linear",
      isOpen ? "w-[480px]" : "w-0 overflow-hidden"
    )}>
      <div className="h-full flex flex-col w-full">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium truncate">
              {activeTitle || 'New Chat'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateChat}
              className="h-7 w-7 p-0 text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <AgentChatPopover
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onDeleteChat={handleDeleteChat}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-7 w-7 p-0 text-muted-foreground flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
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

 