import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { List, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentChatPopoverProps {
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}

export function AgentChatPopover({ currentChatId, onSelectChat, onDeleteChat }: AgentChatPopoverProps) {
  const [showAllChats, setShowAllChats] = useState(false)
  const [allChats, setAllChats] = useState<any[]>([])

  const fetchAllChats = async () => {
    const result = await window.electronAPI.chats.list()
    if (result.success && result.chats) {
      setAllChats(result.chats)
    }
  }

  const handleSelectFromList = (chatId: string) => {
    onSelectChat(chatId)
    setShowAllChats(false)
  }

  const handleDeleteFromList = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await onDeleteChat(chatId)
    await fetchAllChats()
  }

  return (
    <Popover open={showAllChats} onOpenChange={(open) => {
      setShowAllChats(open)
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
      <PopoverContent className="w-[300px] p-0" align="end">
        <div className="p-2 border-b">
          <p className="text-sm font-medium">All Chats</p>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {allChats.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No chats yet</p>
              </div>
            ) : (
              allChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent/50",
                    currentChatId === chat.id && "bg-accent/50"
                  )}
                  onClick={() => handleSelectFromList(chat.id)}
                >
                  <span className="truncate text-sm pr-2">{chat.title || 'Untitled'}</span>
                  <button
                    className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteFromList(chat.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
