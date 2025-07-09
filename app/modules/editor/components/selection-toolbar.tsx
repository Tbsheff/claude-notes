import React from 'react'
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger,
  ContextMenuSeparator 
} from '@/components/ui/context-menu'
import { Zap, Bold, Italic, Underline, Copy, Scissors } from 'lucide-react'

interface SelectionToolbarProps {
  children: React.ReactNode
  content: string
  setContent: (content: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onBuild: () => void
}

export function SelectionToolbar({ children, content, setContent, textareaRef, onBuild }: SelectionToolbarProps) {
  const [selectionRange, setSelectionRange] = React.useState({ start: 0, end: 0 })

  const handleContextMenu = () => {
    if (textareaRef.current) {
      setSelectionRange({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      })
    }
  }

  const handleFormat = (format: string) => {
    const { start, end } = selectionRange
    
    if (start === end) {
      alert('Please select some text first')
      return
    }

    const selectedText = content.substring(start, end)
    let formattedText = selectedText
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'underline':
        formattedText = `<u>${selectedText}</u>`
        break
      case 'copy':
        navigator.clipboard.writeText(selectedText)
        return
      case 'cut':
        navigator.clipboard.writeText(selectedText)
        formattedText = ''
        break
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end)
    setContent(newContent)
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, start + formattedText.length)
      }
    }, 0)
  }

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48" onCloseAutoFocus={() => {
        if (textareaRef.current && selectionRange.start !== selectionRange.end) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(selectionRange.start, selectionRange.end)
        }
      }}>
        <ContextMenuItem onClick={() => handleFormat('copy')}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleFormat('cut')}>
          <Scissors className="mr-2 h-4 w-4" />
          Cut
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleFormat('bold')}>
          <Bold className="mr-2 h-4 w-4" />
          Bold
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleFormat('italic')}>
          <Italic className="mr-2 h-4 w-4" />
          Italic
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleFormat('underline')}>
          <Underline className="mr-2 h-4 w-4" />
          Underline
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onBuild}>
          <Zap className="mr-2 h-4 w-4" />
          Build with AI
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
} 