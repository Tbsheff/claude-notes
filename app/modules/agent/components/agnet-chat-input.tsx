import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUpIcon, Plus, Mic, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

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
    <div className="w-full bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 p-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className="w-full min-h-[20px] max-h-[100px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent text-sm py-1 px-2 placeholder:text-muted-foreground leading-tight"
            rows={1}
          />
        </div>
        
        <div className="flex items-center flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || loading}
            className="h-8 w-8 p-0 bg-black hover:bg-gray-800 disabled:bg-gray-200 rounded-md"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <ArrowUpIcon className={value.trim() ? "h-4 w-4 text-white" : "h-4 w-4 text-gray-500"} />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
