import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, Bold, Italic, Underline, Copy, Scissors } from 'lucide-react'

interface SelectionToolbarProps {
  selectedText: string
  position: { x: number, y: number }
  content: string
  setContent: (content: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onBuild: () => void
  onClose: () => void
}

export function SelectionToolbar({ selectedText, position, content, setContent, textareaRef, onBuild, onClose }: SelectionToolbarProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.selection-toolbar')) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleFormat = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
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
        onClose()
        return
      case 'cut':
        navigator.clipboard.writeText(selectedText)
        formattedText = ''
        break
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end)
    setContent(newContent)
    onClose()
  }

  const toolbarButtons = [
    { icon: Bold, action: 'bold', tooltip: 'Bold' },
    { icon: Italic, action: 'italic', tooltip: 'Italic' },
    { icon: Underline, action: 'underline', tooltip: 'Underline' },
    { icon: Copy, action: 'copy', tooltip: 'Copy' },
    { icon: Scissors, action: 'cut', tooltip: 'Cut' },
  ]

  return (
    <div 
      className="selection-toolbar fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 flex items-center space-x-1"
      style={{ 
        left: position.x, 
        top: position.y
      }}
    >
      {toolbarButtons.map(({ icon: Icon, action, tooltip }) => (
        <button
          key={action}
          onClick={() => handleFormat(action)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors duration-150 flex items-center justify-center text-gray-700"
          title={tooltip}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      
      <div className="w-px h-4 bg-gray-200 mx-1" />
      
      <Button
        onClick={onBuild}
        size="sm"
        variant="default"
        className="flex items-center space-x-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 border-0"
        style={{ backgroundColor: '#2563eb', color: 'white' }}
      >
        <Zap className="h-3 w-3" />
        <span>Build</span>
      </Button>
    </div>
  )
} 