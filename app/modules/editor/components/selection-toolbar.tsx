import React from 'react'
import { Zap, Bold, Italic, Underline, Copy, Scissors, Sparkles, Wrench, Loader2, Heading1, Heading2, Heading3, List, ListOrdered } from 'lucide-react'
import { useAITextEditor } from '../features/ai-text-editor'

interface SelectionToolbarProps {
  children?: React.ReactNode
  content: string
  setContent: (content: string) => void
  editorRef: React.RefObject<HTMLDivElement | null>
  onBuild: () => void
}

export function SelectionToolbar({ children, content, setContent, editorRef, onBuild }: SelectionToolbarProps) {
  const [showMenu, setShowMenu] = React.useState(false)
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 })
  const [loading, setLoading] = React.useState(false)
  const [loadingAction, setLoadingAction] = React.useState<'fix' | 'improve' | null>(null)
  const aiTextEditor = useAITextEditor(true)

  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const selectedText = selection.toString()
      if (selectedText.trim().length > 0) {
        setMenuPosition({ x: e.clientX, y: e.clientY })
        setShowMenu(true)
      }
    }

    if (editorRef.current) {
      editorRef.current.addEventListener('contextmenu', handleContextMenu)
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener('contextmenu', handleContextMenu)
        }
      }
    }
  }, [editorRef.current])

  const handleFormat = (format: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      alert('Please select some text first')
      return
    }

    const selectedText = selection.toString()
    if (!selectedText) {
      alert('Please select some text first')
      return
    }
    
    switch (format) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
      case 'h1':
        document.execCommand('formatBlock', false, 'H1')
        break
      case 'h2':
        document.execCommand('formatBlock', false, 'H2')
        break
      case 'h3':
        document.execCommand('formatBlock', false, 'H3')
        break
      case 'bulletlist':
        document.execCommand('insertUnorderedList', false)
        break
      case 'numberedlist':
        document.execCommand('insertOrderedList', false)
        break
      case 'copy':
        document.execCommand('copy', false)
        break
      case 'cut':
        document.execCommand('cut', false)
        break
    }

    setShowMenu(false)
    
    if (editorRef.current) {
      editorRef.current.focus()
      setContent(editorRef.current.innerHTML)
    }
  }

  const handleBuildClick = () => {
    onBuild()
    setShowMenu(false)
  }

  const handleAIAction = async (action: 'fix' | 'improve') => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      alert('Please select some text first')
      return
    }

    const selectedText = selection.toString()
    if (!selectedText) {
      alert('Please select some text first')
      return
    }

    setLoading(true)
    setLoadingAction(action)
    
    try {
      const result = await aiTextEditor.processText(action, selectedText)

      if (result.success && result.content) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const textNode = document.createTextNode(result.content.trim())
        range.insertNode(textNode)
        
        setShowMenu(false)
        
        if (editorRef.current) {
          editorRef.current.focus()
          setContent(editorRef.current.innerHTML)
        }
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
            onClick={() => handleFormat('h1')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Heading1 className="h-4 w-4" />
            Heading 1
          </div>
          
          <div 
            onClick={() => handleFormat('h2')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Heading2 className="h-4 w-4" />
            Heading 2
          </div>
          
          <div 
            onClick={() => handleFormat('h3')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <Heading3 className="h-4 w-4" />
            Heading 3
          </div>
          
          <div className="bg-border -mx-1 my-1 h-px" />
          
          <div 
            onClick={() => handleFormat('bulletlist')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <List className="h-4 w-4" />
            Bullet List
          </div>
          
          <div 
            onClick={() => handleFormat('numberedlist')}
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
          >
            <ListOrdered className="h-4 w-4" />
            Numbered List
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