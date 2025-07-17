import { useState, useEffect } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronsUpDown, MessageSquarePlus, Trash2, Search } from 'lucide-react'

type Chat = {
  id: string
  title: string | null
  createdAt: number
  updatedAt: number
}

interface ChatSwitcherProps {
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onCreateChat: () => void
  onDeleteChat: (chatId: string) => void
}

export function ChatSwitcher({ currentChatId, onSelectChat, onCreateChat, onDeleteChat }: ChatSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const fetchChats = async () => {
    const result = await window.electronAPI.chats.list()
    if (result.success && result.chats) {
      setChats(result.chats)
    }
  }

  useEffect(() => {
    if (open) {
      fetchChats()
    }
  }, [open])

  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (chatId: string) => {
    onSelectChat(chatId)
    setOpen(false)
  }

  const handleCreate = () => {
    onCreateChat()
    setOpen(false)
  }

  const currentChat = chats.find(c => c.id === currentChatId)
  const currentChatTitle = currentChat?.title || 'New Chat'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {currentChatTitle}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <div className="flex flex-col space-y-2 p-2">
          <Button variant="outline" onClick={handleCreate} className="w-full justify-start">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search chats..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-2">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  onClick={() => handleSelect(chat.id)}
                  className="w-full justify-between mb-1"
                >
                  <span className="truncate">{chat.title || 'Untitled'}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </Button>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                No chats found.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 