import React, { useState, useRef, useEffect } from 'react'
import { NoteEditorHeader } from '../components/note-editor-header'
import { NoteEditorFooter } from '../components/note-editor-footer'
import { SelectionToolbar } from '../components/selection-toolbar'
import { NotesSidebar } from '../components/note-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { editorApi } from '../api'
import { Note } from '@/types/electron'

export function EditorPage() {
  const [content, setContent] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [createdAt] = useState(new Date())

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const createNewNote = async (): Promise<void> => {
    try {
      const createResult = await editorApi.createNote({ title: 'New Note', content: '' })
      if (createResult.success && createResult.data) {
        setCurrentNote(createResult.data)
        setContent(createResult.data.content)
      }
    } catch (error) {
      console.error('Failed to create note:', error)
      throw error
    }
  }

  const handleNoteSelect = (note: Note) => {
    setCurrentNote(note)
    setContent(note.content)
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const result = await editorApi.deleteNote(noteId)
      if (result.success) {
        if (currentNote?.id === noteId) {
          const notesResult = await editorApi.listNotes()
          if (notesResult.success && notesResult.data && notesResult.data.length > 0) {
            const nextNote = notesResult.data[0]
            setCurrentNote(nextNote)
            setContent(nextNote.content)
          } else {
            await createNewNote()
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

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

    const loadOrCreateNote = async () => {
      try {
        const notesResult = await editorApi.listNotes()
        if (notesResult.success && notesResult.data && notesResult.data.length > 0) {
          const latestNote = notesResult.data[0]
          setCurrentNote(latestNote)
          setContent(latestNote.content)
        } else {
          await createNewNote()
        }
      } catch (error) {
        console.error('Failed to load note:', error)
      }
    }

    initializeAI()
    loadOrCreateNote()
  }, [])

  useEffect(() => {
    if (!currentNote || !content.trim()) return

    const saveNote = async () => {
      try {
        const result = await editorApi.saveNote({
          noteId: currentNote.id,
          content: content,
          title: currentNote.title
        })
        if (result.success && result.data) {
          setCurrentNote(result.data)
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }

    const timer = setTimeout(saveNote, 3000)
    return () => clearTimeout(timer)
  }, [content, currentNote])

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
      const result = await window.electronAPI.ai.processRequest(selectedText)
      
      if (result.success) {
        console.log('AI Response:', result.response)
        if (result.changedFiles && result.changedFiles.length > 0) {
          console.log('Changed files:', result.changedFiles)
        }
        setBuildStatus('Changes applied, reloading...')
        
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
    <SidebarProvider defaultOpen={false}>
      <div className="w-full h-screen max-h-screen flex bg-background">
        <NotesSidebar
          currentNote={currentNote}
          onNoteSelect={handleNoteSelect}
          onCreateNote={createNewNote}
          onDeleteNote={handleDeleteNote}
        />
        
        <SidebarInset className="flex flex-col">
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
} 