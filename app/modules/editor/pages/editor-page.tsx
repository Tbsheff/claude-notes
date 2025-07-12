import React, { useState, useRef, useEffect } from 'react'
import { NoteEditorHeader } from '../components/note-editor-header'
import { NoteEditorFooter } from '../components/note-editor-footer'
import { SelectionToolbar } from '../components/selection-toolbar'

export function EditorPage() {
  const [content, setContent] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [createdAt] = useState(new Date())

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

  const handleBuild = async () => {
    if (!textareaRef.current || !aiInitialized) return
    
    const textarea = textareaRef.current
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
    
    if (!selectedText || selectedText.trim().length === 0) {
      alert('Please select some text first')
      return
    }
    
    if (!window.electronAPI?.ai) {
      alert('Electron API not available')
      return
    }

    setIsBuilding(true)
    setBuildStatus('Building...')

    try {
      const result = await window.electronAPI.ai.processRequestWorkspace(selectedText)
      
      if (result.success) {
        console.log('AI Response:', result.response)
        if (result.changedFiles && result.changedFiles.length > 0) {
          console.log('Changed files:', result.changedFiles)
        }
        setBuildStatus('Workspace validated, reloading...')
        
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
    <div className="w-full h-screen max-h-screen flex flex-col bg-background">
      <NoteEditorHeader 
        createdAt={createdAt}
        isBuilding={isBuilding}
        buildStatus={buildStatus}
        content={content}
      />

      <div className="flex-1 bg-background relative">
        <textarea
          ref={textareaRef}
          placeholder="Start writing..."
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          className="w-full h-full resize-none border-none shadow-none p-6 bg-background text-foreground focus:outline-none text-base leading-relaxed placeholder:text-muted-foreground"
          style={{ fontFamily: 'Manrope, sans-serif' }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        
        <SelectionToolbar
          content={content}
          setContent={setContent}
          textareaRef={textareaRef}
          onBuild={handleBuild}
        />
      </div>

      <div className="flex-shrink-0">
        <NoteEditorFooter content={content} />
      </div>
    </div>
  )
} 