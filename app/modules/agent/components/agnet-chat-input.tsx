import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUpIcon, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

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
  placeholder = "Ask me anything...",
  disabled = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    <div className="w-full rounded-lg border-border p-1 border bg-card">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={`w-full min-h-[20px] max-h-[100px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none !bg-card text-sm py-1 px-2 placeholder:text-muted-foreground leading-tight ${value.trim() ? 'text-foreground' : 'text-muted-foreground'}`}
            rows={1}
          />
        </div>
        
        <div className="flex items-center flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || loading}
            variant="secondary"
            className="h-8 w-8 p-0"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
