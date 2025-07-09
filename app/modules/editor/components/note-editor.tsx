import React, { useState, useRef, useEffect } from 'react'
import { NoteEditorHeader } from './note-editor-header'
import { NoteEditorFooter } from './note-editor-footer'
import { SelectionToolbar } from './selection-toolbar'

export function NoteEditor() {
  const [content, setContent] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [createdAt] = useState(new Date())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [])

  const handleTextSelection = () => {
    if (!textareaRef.current) return

    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
    }

    const selection = window.getSelection()
    const selectedText = selection?.toString()
    
    if (selectedText && selectedText.trim().length > 0) {
      selectionTimeoutRef.current = setTimeout(() => {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()
        
        if (rect) {
          setSelectedText(selectedText)
          
          const toolbarWidth = 240
          const toolbarHeight = 40
          let x = rect.left + rect.width / 2 - toolbarWidth / 2
          let y = rect.top - toolbarHeight - 10
          
          if (x < 10) x = 10
          if (x + toolbarWidth > window.innerWidth - 10) x = window.innerWidth - toolbarWidth - 10
          if (y < 10) y = rect.bottom + 10
          
          setToolbarPosition({ x, y })
          setShowToolbar(true)
        }
      }, 200)
    } else {
      setShowToolbar(false)
    }
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
        setBuildStatus('Changes applied, auto-reload will trigger...')
        
        setTimeout(() => {
          setIsBuilding(false)
        }, 3000)
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
      <NoteEditorHeader 
        createdAt={createdAt}
        isBuilding={isBuilding}
        buildStatus={buildStatus}
        content={content}
      />

      <div className="flex-1 px-6 py-6 bg-white relative">
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
            content={content}
            setContent={setContent}
            textareaRef={textareaRef}
            onBuild={handleBuild}
            onClose={() => setShowToolbar(false)}
          />
        )}
      </div>

      <NoteEditorFooter characterCount={content.length} />
    </div>
  )
} 