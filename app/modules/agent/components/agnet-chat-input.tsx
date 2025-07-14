import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUpIcon } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = "Type a message...",
  disabled = false
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !loading) {
        onSubmit()
      }
    }
  }

  const handleSubmit = () => {
    if (value.trim() && !loading) {
      onSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 border border-input bg-transparent rounded-lg focus-within:ring-1 focus-within:ring-ring">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="flex-1 min-h-[40px] max-h-[40px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent text-sm leading-5 py-2"
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={!value.trim() || loading}
        variant="default"
        className="shrink-0 rounded-full p-1.5 h-fit"
        size="sm"
      >
        <ArrowUpIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
