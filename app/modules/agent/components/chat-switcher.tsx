import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { X, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Chat = {
  id: string
  title: string | null
  createdAt: number
  updatedAt: number
}

interface ChatSwitcherProps {
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onCreateChat: () => void
  currentChatTitle?: string
}

export function ChatSwitcher({ 
  currentChatId, 
  onSelectChat, 
  onDeleteChat, 
  onCreateChat, 
  currentChatTitle 
}: ChatSwitcherProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [showAllChats, setShowAllChats] = useState(false)

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
    if (currentChatId && !openTabs.includes(currentChatId)) {
      const newTabs = [...openTabs, currentChatId]
      setOpenTabs(newTabs)
      saveOpenTabs(newTabs)
    }
  }, [currentChatId, openTabs])

  useEffect(() => {
    // Refresh chat list when currentChatId changes
    if (currentChatId) {
      fetchChats()
    }
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

  const handleSelectFromList = (chatId: string) => {
    onSelectChat(chatId)
    setShowAllChats(false)
  }

  const handleDeleteFromList = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onDeleteChat(chatId)
    await fetchChats() // Refresh the list after deletion
  }

  const getChatTitle = (chatId: string) => {
    if (currentChatId === chatId && currentChatTitle) {
      return currentChatTitle
    }
    const chat = chats.find(c => c.id === chatId)
    return chat?.title || 'New Chat'
  }

  const visibleTabs = openTabs.slice(0, 3) // Show max 3 tabs

  return (
    <div className="flex items-center bg-background">
      <ScrollArea className="flex-1">
        <div className="flex items-center">
          {visibleTabs.map((chatId) => (
            <div
              key={chatId}
              className={cn(
                "group relative flex items-center h-7 px-2 cursor-pointer transition-colors flex-1 basis-0 min-w-0 overflow-hidden rounded mr-1",
                currentChatId === chatId 
                  ? "bg-black/10 text-black" 
                  : "text-gray-600 hover:bg-black/5 hover:text-black"
              )}
              onClick={() => onSelectChat(chatId)}
            >
              <span className="text-xs font-medium truncate whitespace-nowrap w-full pr-4">
                {getChatTitle(chatId)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 p-0 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity rounded-sm hover:bg-black/10"
                onClick={(e) => handleCloseTab(chatId, e)}
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 mx-1 hover:bg-black/5 rounded text-gray-600 hover:text-black flex-shrink-0"
            onClick={onCreateChat}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </ScrollArea>
      
      <Popover open={showAllChats} onOpenChange={(open) => {
        setShowAllChats(open)
        if (open) {
          fetchChats() // Refresh chats when opening
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 mx-1 hover:bg-black/5 rounded text-gray-600 hover:text-black flex-shrink-0"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">All Chats</p>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-black/5",
                    currentChatId === chat.id && "bg-black/5 text-black"
                  )}
                  onClick={() => handleSelectFromList(chat.id)}
                >
                  <span className="truncate text-sm">{chat.title || 'Untitled'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-50 hover:opacity-100 hover:bg-red-500/10 rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFromList(chat.id, e)
                    }}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
} 