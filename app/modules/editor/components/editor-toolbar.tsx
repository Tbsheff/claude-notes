import React from 'react'
import { useAITextEditor } from '../features/ai-text-editor'
import { useFeatureState } from '../features/feature-manager'
import { getMarkdownEditorFeatures } from '@/lib/markdown'

interface SelectionToolbarProps {
  children?: React.ReactNode
  content: string
  setContent: (content: string) => void
  editorRef: React.RefObject<HTMLDivElement | null>
}

export function SelectionToolbar({ children, content: _content, setContent, editorRef }: SelectionToolbarProps) {
  const [showMenu, setShowMenu] = React.useState(false)
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 })
  const [aiTextEditorEnabled] = useFeatureState('aiTextEditor')
  const aiTextEditor = useAITextEditor(aiTextEditorEnabled)
  const { handleFormat, formatCommands } = getMarkdownEditorFeatures()

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

  const handleFormatCommand = (format: string) => {
    handleFormat(format, editorRef, setContent)
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
          {formatCommands.map((command, index) => {
            const Icon = command.icon
            const needsSeparator = index > 0 && formatCommands[index - 1].group !== command.group
            
            return (
              <React.Fragment key={command.key}>
                {needsSeparator && <div className="bg-border -mx-1 my-1 h-px" />}
                <div 
                  onClick={() => handleFormatCommand(command.key)}
                  className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {command.label}
                </div>
              </React.Fragment>
            )
          })}
          
          {aiTextEditorEnabled && <div className="bg-border -mx-1 my-1 h-px" />}
          
          {aiTextEditorEnabled && aiTextEditor.renderFixButton(() => handleAIAction('fix'))}
          
          {aiTextEditorEnabled && aiTextEditor.renderImproveButton(() => handleAIAction('improve'))}

        </div>
      )}
    </div>
  )
} 