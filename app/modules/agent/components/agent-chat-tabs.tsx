import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatSwitcherProps {
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onCreateChat: () => void
  currentChatTitle?: string
}

export function ChatSwitcher({ 
  currentChatId, 
  onSelectChat, 
  onCreateChat, 
  currentChatTitle 
}: ChatSwitcherProps) {
  const [chats, setChats] = useState<any[]>([])
  const [openTabs, setOpenTabs] = useState<string[]>([])

  const fetchChats = async () => {
    const result = await window.electronAPI.chats.list()
    if (result.success && result.chats) {
      setChats(result.chats)
    }
  }

  const loadOpenTabs = () => {
    const saved = localStorage.getItem('agent-chat-tabs')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setOpenTabs(parsed)
        }
      } catch (e) {
        console.error('Failed to parse saved tabs:', e)
      }
    }
  }

  const saveOpenTabs = (tabs: string[]) => {
    localStorage.setItem('agent-chat-tabs', JSON.stringify(tabs))
  }

  useEffect(() => {
    fetchChats()
    loadOpenTabs()
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agent-chat-tabs') {
        loadOpenTabs()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (currentChatId && !openTabs.includes(currentChatId)) {
      const newTabs = [...openTabs, currentChatId]
      setOpenTabs(newTabs)
      saveOpenTabs(newTabs)
    }
  }, [currentChatId, openTabs])

  useEffect(() => {
    if (currentChatId) {
      fetchChats()
    }
  }, [currentChatId])

  useEffect(() => {
    if (currentChatTitle) {
      fetchChats()
    }
  }, [currentChatTitle])

  useEffect(() => {
    loadOpenTabs()
  }, [currentChatId])

  const handleCloseTab = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newTabs = openTabs.filter(id => id !== chatId)
    setOpenTabs(newTabs)
    saveOpenTabs(newTabs)
    
    if (currentChatId === chatId) {
      if (newTabs.length > 0) {
        onSelectChat(newTabs[0])
      } else {
        onCreateChat()
      }
    }
  }

  const getChatTitle = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId)
    if (chat?.title) {
      return chat.title
    }
    return null
  }

  const availableTabs = openTabs.filter(chatId => {
    const title = getChatTitle(chatId)
    return title !== null
  })

  const maxVisibleTabs = 3
  const visibleTabs = availableTabs.slice(0, maxVisibleTabs)
  const hiddenTabsCount = availableTabs.length - visibleTabs.length

  return (
    <div className="flex items-center w-full">
      <div className="flex items-center min-w-0 flex-1">
        {visibleTabs.map((chatId) => {
          const title = getChatTitle(chatId)
          if (!title) return null
          
          return (
            <div
              key={chatId}
              className={cn(
                "group relative flex items-center h-7 px-2 cursor-pointer transition-colors rounded mr-1 min-w-0",
                visibleTabs.length === 1 ? "flex-1" : visibleTabs.length === 2 ? "flex-1" : "max-w-[100px]",
                currentChatId === chatId 
                  ? "bg-muted/40 text-foreground my-1 border border-border/50" 
                  : "text-muted-foreground hover:text-accent-foreground my-1"
              )}
              onClick={() => onSelectChat(chatId)}
            >
              <span className="text-xs font-medium truncate pr-4">
                {title}
              </span>
              <button
                className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 flex items-center justify-center opacity-0 group-hover:opacity-80 hover:opacity-100 transition-opacity"
                onClick={(e) => handleCloseTab(chatId, e)}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )
        })}
        
        {hiddenTabsCount > 0 && (
          <div className="flex items-center h-7 px-2 text-xs text-muted-foreground bg-muted/50 rounded mr-1 pointer-events-none">
            +{hiddenTabsCount}
          </div>
        )}
        
        <button
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-accent-foreground transition-colors"
          onClick={onCreateChat}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
} 