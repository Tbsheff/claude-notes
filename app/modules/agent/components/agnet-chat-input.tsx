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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [value])

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
            className="w-full min-h-[24px] max-h-[100px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent text-sm py-1 px-2 placeholder:text-muted-foreground"
            rows={1}
          />
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Mic className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || loading}
            className="h-8 w-8 p-0 bg-black hover:bg-gray-800 disabled:bg-gray-200 rounded-md"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <ArrowUpIcon className="h-4 w-4 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
