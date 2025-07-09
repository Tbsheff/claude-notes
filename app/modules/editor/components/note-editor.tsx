import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Share, MoreHorizontal, Zap, Bold, Italic, Underline, Copy, Scissors, Star } from 'lucide-react'

interface SelectionToolbarProps {
  selectedText: string
  position: { x: number, y: number }
  onBuild: () => void
  onFormat: (format: string) => void
  onClose: () => void
}

function SelectionToolbar({ selectedText, position, onBuild, onFormat, onClose }: SelectionToolbarProps) {
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

  const toolbarButtons = [
    { icon: Bold, action: 'bold', tooltip: 'Bold' },
    { icon: Italic, action: 'italic', tooltip: 'Italic' },
    { icon: Underline, action: 'underline', tooltip: 'Underline' },
    { icon: Copy, action: 'copy', tooltip: 'Copy' },
    { icon: Scissors, action: 'cut', tooltip: 'Cut' },
  ]

  return (
    <div 
      className="selection-toolbar fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl p-1 flex flex-col items-center space-y-1 animate-in fade-in duration-200"
      style={{ 
        left: position.x, 
        top: position.y,
        width: '60px'
      }}
    >
      {toolbarButtons.map(({ icon: Icon, action, tooltip }) => (
        <button
          key={action}
          onClick={() => onFormat(action)}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-150 group relative w-full flex justify-center"
          title={tooltip}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      
      <div className="h-px w-6 bg-gray-600 my-1" />
      
      <button
        onClick={onBuild}
        className="flex flex-col items-center space-y-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 text-xs font-medium w-full"
      >
        <Zap className="h-4 w-4" />
        <span>Build</span>
      </button>
    </div>
  )
}

export function NoteEditor() {
  const [content, setContent] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [createdAt] = useState(new Date()) // Store the creation time
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const initializeAI = async () => {
      try {
        if (!window.electronAPI?.ai) {
          console.error('electronAPI not available')
          return
        }
        
        const result = await window.electronAPI.ai.initialize({})
        if (result.success) {
          setAiInitialized(true)
        } else {
          console.error('Failed to initialize AI:', result.error)
        }
      } catch (error) {
        console.error('AI initialization error:', error)
      }
    }

    initializeAI()
  }, [])

  const handleTextSelection = () => {
    if (!textareaRef.current) return

    const selection = window.getSelection()
    const selectedText = selection?.toString()
    
    if (selectedText && selectedText.trim().length > 0) {
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      
      if (rect) {
        setSelectedText(selectedText)
        
        // Расчет позиции с проверкой границ экрана для вертикального тулбара
        const toolbarWidth = 60
        const toolbarHeight = 200 // приблизительная высота вертикального тулбара
        let x = rect.left + rect.width / 2 - toolbarWidth / 2
        let y = rect.top - toolbarHeight - 10
        
        // Проверяем границы экрана
        if (x < 10) x = 10
        if (x + toolbarWidth > window.innerWidth - 10) x = window.innerWidth - toolbarWidth - 10
        if (y < 10) y = rect.bottom + 10
        
        setToolbarPosition({ x, y })
        setShowToolbar(true)
      }
    } else {
      setShowToolbar(false)
    }
  }

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
        return
      case 'cut':
        navigator.clipboard.writeText(selectedText)
        formattedText = ''
        break
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end)
    setContent(newContent)
    setShowToolbar(false)
  }

  const handleBuild = async () => {
    if (!selectedText || !aiInitialized) return
    
    if (!window.electronAPI?.ai) {
      alert('Electron API not available')
      return
    }

    setIsBuilding(true)
    setBuildStatus('Building...')
    setShowToolbar(false)

    try {
      const result = await window.electronAPI.ai.processRequest(selectedText)
      
      if (result.success) {
        console.log('AI Response:', result.response)
        
        // Показываем статус перезагрузки и rebuild
        setBuildStatus('Changes applied, rebuilding...')
        
        setTimeout(async () => {
          try {
            if (window.electronAPI?.app?.rebuildAndReload) {
              await window.electronAPI.app.rebuildAndReload()
            } else if (window.electronAPI?.app?.reloadWindow) {
              window.electronAPI.app.reloadWindow()
            } else {
              // Fallback: перезагрузка через location.reload()
              window.location.reload()
            }
          } catch (error) {
            console.error('Rebuild error:', error)
            // Fallback to simple reload
            window.location.reload()
          }
        }, 500)
      } else {
        console.error('AI Error:', result.error)
        alert('AI Error: ' + result.error)
        setIsBuilding(false)
      }
    } catch (error) {
      console.error('Build error:', error)
      alert('Build error: ' + error)
      setIsBuilding(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {createdAt.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} at {createdAt.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </span>
          {isBuilding && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-blue-600 font-medium">{buildStatus}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <Share className="h-4 w-4 text-gray-600 hover:text-gray-800" />
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <Star className="h-4 w-4 text-gray-600 hover:text-gray-800" />
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <MoreHorizontal className="h-4 w-4 text-gray-600 hover:text-gray-800" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 bg-white relative">
        <textarea
          ref={textareaRef}
          placeholder="Start writing your note..."
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          onMouseUp={handleTextSelection}
          onKeyUp={handleTextSelection}
          className="w-full h-full resize-none border-none shadow-none p-0 bg-white focus:outline-none text-base leading-relaxed"
        />

        {showToolbar && (
          <SelectionToolbar
            selectedText={selectedText}
            position={toolbarPosition}
            onBuild={handleBuild}
            onFormat={handleFormat}
            onClose={() => setShowToolbar(false)}
          />
        )}
      </div>
    </div>
  )
} 