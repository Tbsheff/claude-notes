import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { List, Search, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentChatPopoverProps {
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}

const truncateByChars = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + "..."
}

export function AgentChatPopover({ currentChatId, onSelectChat, onDeleteChat }: AgentChatPopoverProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [allChats, setAllChats] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAllChats = async () => {
    const result = await window.electronAPI.chats.list()
    if (result.success && result.chats) {
      setAllChats(result.chats)
    }
  }

  const handleSelectFromList = (chatId: string) => {
    onSelectChat(chatId)
    setShowSearch(false)
  }

  const handleDeleteFromList = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await onDeleteChat(chatId)
    await fetchAllChats()
  }

  const handleNewChat = () => {
    onSelectChat('new')
    setShowSearch(false)
  }

  const groupChatsByDate = (chats: any[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return chats.reduce((acc: Record<string, any[]>, chat) => {
      const chatDate = new Date(chat.updatedAt || chat.createdAt)
      let group: string

      if (chatDate >= today) {
        group = "Today"
      } else if (chatDate >= yesterday) {
        group = "Yesterday"
      } else if (chatDate >= sevenDaysAgo) {
        group = "Previous 7 Days"
      } else if (chatDate >= thirtyDaysAgo) {
        group = "Previous 30 Days"
      } else {
        group = "Older"
      }

      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(chat)
      return acc
    }, {})
  }

  const filteredChats = allChats.filter(chat => 
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    'untitled'.includes(searchQuery.toLowerCase())
  )

  const groupedChats = groupChatsByDate(filteredChats)
  const dateGroups = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"]

  const renderChatGroup = (chats: any[], title: string) => {
    if (chats.length === 0) return null
    
    return (
      <div className="mb-4">
        <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{title}</h3>
        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="group flex w-full cursor-pointer items-center rounded-md hover:bg-accent"
              onClick={() => handleSelectFromList(chat.id)}
            >
              <div className="flex-1 p-2 min-w-0">
                <p className="text-sm truncate" title={chat.title || 'Untitled'}>
                  {truncateByChars(chat.title || 'Untitled', 35)}
                </p>
              </div>
              <div className="flex-shrink-0 pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteFromList(chat.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Popover open={showSearch} onOpenChange={(open) => {
      setShowSearch(open)
      if (open) {
        fetchAllChats()
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button size="icon" variant="outline" onClick={handleNewChat} className="flex-shrink-0">
              <Plus className="h-4 w-4" />
              <span className="sr-only">New Chat</span>
            </Button>
          </div>
        </div>
        <ScrollArea className="h-96">
          <div className="p-2">
            {filteredChats.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No chats found.</div>
            ) : (
              dateGroups.map((group) =>
                groupedChats[group] ? (
                  <div key={group}>
                    {renderChatGroup(groupedChats[group], group)}
                  </div>
                ) : null
              )
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
