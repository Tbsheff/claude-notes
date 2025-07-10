import React from 'react'
import { Zap, Bold, Italic, Underline, Copy, Scissors, Sparkles, Wrench, Loader2 } from 'lucide-react'
import { FIX_TEXT_PROMPT, IMPROVE_TEXT_PROMPT } from '@/lib/ai/prompts/text-editing-prompts'

interface SelectionToolbarProps {
  children?: React.ReactNode
  content: string
  setContent: (content: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onBuild: () => void
}

export function SelectionToolbar({ children, content, setContent, textareaRef, onBuild }: SelectionToolbarProps) {
  const [selectionRange, setSelectionRange] = React.useState({ start: 0, end: 0 })
  const [showMenu, setShowMenu] = React.useState(false)
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 })
  const [loading, setLoading] = React.useState(false)
  const [loadingAction, setLoadingAction] = React.useState<'fix' | 'improve' | null>(null)

  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      
      if (!textareaRef.current) return

      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd

      if (start !== end) {
        setSelectionRange({ start, end })
        setMenuPosition({ x: e.clientX, y: e.clientY })
        setShowMenu(true)
      }
    }

    if (textareaRef.current) {
      textareaRef.current.addEventListener('contextmenu', handleContextMenu)
      return () => {
        if (textareaRef.current) {
          textareaRef.current.removeEventListener('contextmenu', handleContextMenu)
        }
      }
    }
  }, [textareaRef.current])

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
        setShowMenu(false)
        return
      case 'cut':
        navigator.clipboard.writeText(selectedText)
        formattedText = ''
        break
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end)
    setContent(newContent)
    setShowMenu(false)
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, start + formattedText.length)
      }
    }, 0)
  }

  const handleBuildClick = () => {
    onBuild()
    setShowMenu(false)
  }

  const handleAIAction = async (action: 'fix' | 'improve') => {
    const { start, end } = selectionRange
    
    if (start === end) {
      alert('Please select some text first')
      return
    }

    const selectedText = content.substring(start, end)
    setLoading(true)
    setLoadingAction(action)
    
    try {
      const systemPrompt = action === 'fix' ? FIX_TEXT_PROMPT : IMPROVE_TEXT_PROMPT
      
      const result = await window.electronAPI.llmCall([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: selectedText }
      ])

      if (result.success && result.content) {
        const newContent = content.substring(0, start) + result.content.trim() + content.substring(end)
        setContent(newContent)
        setShowMenu(false)
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(start, start + result.content!.trim().length)
          }
        }, 0)
      } else {
        alert('AI request failed: ' + (result.error || 'Unknown error'))
        setShowMenu(false)
      }
    } catch (error) {
      alert('AI request failed: ' + error)
      setShowMenu(false)
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Element
    if (!target.closest('.selection-menu')) {
      setShowMenu(false)
    }
  }

  React.useEffect(() => {
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  return (
    <div className="relative">
      {children}
      
      {showMenu && (
        <div 
          className="selection-menu fixed z-50 bg-popover text-popover-foreground min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md"
          style={{ 
            left: `${menuPosition.x}px`, 
            top: `${menuPosition.y}px`
          }}
        >
          <div 
            onClick={() => handleFormat('copy')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Copy className="h-4 w-4" />
            Copy
          </div>
          
          <div 
            onClick={() => handleFormat('cut')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Scissors className="h-4 w-4" />
            Cut
          </div>
          
          <div className="bg-border -mx-1 my-1 h-px" />
          
          <div 
            onClick={() => handleFormat('bold')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Bold className="h-4 w-4" />
            Bold
          </div>
          
          <div 
            onClick={() => handleFormat('italic')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Italic className="h-4 w-4" />
            Italic
          </div>
          
          <div 
            onClick={() => handleFormat('underline')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Underline className="h-4 w-4" />
            Underline
          </div>
          
          <div className="bg-border -mx-1 my-1 h-px" />
          
          <div 
            onClick={() => !loading && handleAIAction('fix')}
            className={`focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none ${
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-default hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {loading && loadingAction === 'fix' ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            {loading && loadingAction === 'fix' ? 'Fixing...' : 'Fix with AI'}
          </div>
          
          <div 
            onClick={() => !loading && handleAIAction('improve')}
            className={`focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none ${
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-default hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {loading && loadingAction === 'improve' ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading && loadingAction === 'improve' ? 'Improving...' : 'Improve with AI'}
          </div>
          
          <div className="bg-border -mx-1 my-1 h-px" />
          
          <div 
            onClick={handleBuildClick}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Zap className="h-4 w-4" />
            Build with AI
          </div>
        </div>
      )}
    </div>
  )
} 