import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface ChatHeaderProps {
  currentChatTitle?: string
  onCreateChat: () => void
}

export function ChatHeader({ currentChatTitle, onCreateChat }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-2">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium truncate">
          {currentChatTitle || 'New Chat'}
        </h2>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateChat}
        className="h-7 w-7 p-0 text-muted-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
} 