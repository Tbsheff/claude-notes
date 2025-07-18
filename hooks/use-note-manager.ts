import { useState, useEffect, useCallback } from 'react'
import { Note } from '@/app/modules/editor/api/types'
import { editorApi } from '@/app/modules/editor/api'
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown'

export function useNoteManager() {
  const [content, setContent] = useState('')
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [lastSavedContent, setLastSavedContent] = useState('')

  const getMarkdownContent = useCallback(() => htmlToMarkdown(content), [content])

  const saveCurrentNote = async () => {
    if (!currentNote) return
    const markdownContent = getMarkdownContent()
    if (markdownContent === lastSavedContent) return
    
    try {
      const result = await editorApi.saveNote({
        noteId: currentNote.id,
        content: markdownContent,
        title: currentNote.title
      })
      
      if (result.success) {
        setLastSavedContent(markdownContent)
      }
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  const createNewNote = async () => {
    const markdownContent = getMarkdownContent()
    if (currentNote && markdownContent !== lastSavedContent) {
      await saveCurrentNote()
    }
    
    try {
      const res = await editorApi.createNote({ title: 'New Note', content: '' })
      if (res.success && res.data) {
        setCurrentNote(res.data)
        setContent('')
        setLastSavedContent('')
        
        localStorage.setItem('lastOpenedNote', res.data.id)
        
        return res.data
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleNoteSelect = async (note: Note) => {
    const markdownContent = getMarkdownContent()
    if (currentNote && markdownContent !== lastSavedContent) {
      await saveCurrentNote()
    }
    
    try {
      const res = await editorApi.loadNote(note.id)
      if (res.success && res.data) {
        setCurrentNote(res.data)
        setContent(markdownToHtml(res.data.content || ''))
        setLastSavedContent(res.data.content || '')
      } else {
        setCurrentNote(note)
        setContent(markdownToHtml(note.content || ''))
        setLastSavedContent(note.content || '')
      }
      
      localStorage.setItem('lastOpenedNote', note.id)
      
    } catch (error) {
      console.error('Failed to load note:', error)
      setCurrentNote(note)
      setContent(markdownToHtml(note.content || ''))
      setLastSavedContent(note.content || '')
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await editorApi.deleteNote(id)
      if (!res.success) return
      
      if (localStorage.getItem('lastOpenedNote') === id) {
        localStorage.removeItem('lastOpenedNote')
      }
      
      if (currentNote?.id !== id) return
      
      setContent('')
      setCurrentNote(null)
      setLastSavedContent('')
      
      const list = await editorApi.listNotes()
      if (list.success && list.data && list.data.length) {
        const next = list.data[0]
        
        try {
          const noteRes = await editorApi.loadNote(next.id)
          if (noteRes.success && noteRes.data) {
            setCurrentNote(noteRes.data)
            setContent(markdownToHtml(noteRes.data.content || ''))
            setLastSavedContent(noteRes.data.content || '')
          } else {
            setCurrentNote(next)
            setContent(markdownToHtml(next.content || ''))
            setLastSavedContent(next.content || '')
          }
        } catch (error) {
          console.error('Failed to load note after deletion:', error)
          setCurrentNote(next)
          setContent(markdownToHtml(next.content || ''))
          setLastSavedContent(next.content || '')
        }
        
        localStorage.setItem('lastOpenedNote', next.id)
      } else {
        await createNewNote()
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const loadInitialNote = async () => {
    const lastNoteId = localStorage.getItem('lastOpenedNote')
    
    if (lastNoteId) {
      try {
        const noteRes = await editorApi.loadNote(lastNoteId)
        if (noteRes.success && noteRes.data) {
          setCurrentNote(noteRes.data)
          setContent(markdownToHtml(noteRes.data.content || ''))
          setLastSavedContent(noteRes.data.content || '')
          return
        }
      } catch (error) {
        console.error('Failed to load last opened note:', error)
      }
    }
    
    const res = await editorApi.listNotes()
    if (res.success && res.data && res.data.length) {
      const first = res.data[0]
      
      try {
        const noteRes = await editorApi.loadNote(first.id)
        if (noteRes.success && noteRes.data) {
          setCurrentNote(noteRes.data)
          setContent(markdownToHtml(noteRes.data.content || ''))
          setLastSavedContent(noteRes.data.content || '')
          localStorage.setItem('lastOpenedNote', noteRes.data.id)
        } else {
          setCurrentNote(first)
          setContent(markdownToHtml(first.content || ''))
          setLastSavedContent(first.content || '')
          localStorage.setItem('lastOpenedNote', first.id)
        }
      } catch (error) {
        setCurrentNote(first)
        setContent(markdownToHtml(first.content || ''))
        setLastSavedContent(first.content || '')
        localStorage.setItem('lastOpenedNote', first.id)
      }
    } else {
      await createNewNote()
    }
  }

  useEffect(() => {
    if (!currentNote) return
    const md = getMarkdownContent()
    if (md === lastSavedContent) return
    
    const timer = setTimeout(saveCurrentNote, 1500)
    return () => clearTimeout(timer)
  }, [content, currentNote, lastSavedContent, getMarkdownContent])

  return {
    content,
    setContent,
    currentNote,
    lastSavedContent,
    getMarkdownContent,
    saveCurrentNote,
    createNewNote,
    handleNoteSelect,
    handleDeleteNote,
    loadInitialNote
  }
} 