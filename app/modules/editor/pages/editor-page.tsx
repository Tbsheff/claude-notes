import { useState, useEffect } from 'react'
import { NoteEditorHeader } from '../components/editor-header'
import { NoteEditorFooter } from '../components/editor-footer'
import { NotesSidebar } from '../../general/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Editor } from '../components/editor'
import { editorApi } from '../api'
import { Note } from '@/app/modules/editor/api'
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown'

function EditorContent() {
  const [content, setContent] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [createdAt] = useState(new Date())
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [sidebarKey, setSidebarKey] = useState(0)

  const reloadSidebar = () => setSidebarKey((k) => k + 1)

  const getPlainTextContent = () => content.replace(/<[^>]+>/g, ' ').trim()
  const getMarkdownContent = () => htmlToMarkdown(content)

  const saveCurrentNote = async () => {
    if (!currentNote) return
    const markdownContent = getMarkdownContent()
    if (!markdownContent.trim() || markdownContent === lastSavedContent) return

    try {
      const result = await editorApi.saveNote({
        noteId: currentNote.id,
        content: markdownContent,
        title: currentNote.title,
      })
      if (result.success && result.data) {
        setCurrentNote(result.data)
        setLastSavedContent(markdownContent)
        reloadSidebar()
      }
    } catch (_err) {
      console.error('Save failed:', _err)
    }
  }

  const createNewNote = async () => {
    const markdownContent = getMarkdownContent()
    if (currentNote && markdownContent !== lastSavedContent) await saveCurrentNote()
    try {
      const res = await editorApi.createNote({ title: 'New Note', content: '' })
      if (res.success && res.data) {
        setCurrentNote(res.data)
        setContent('')
        setLastSavedContent('')
        reloadSidebar()
      }
    } catch (_err) {
      console.error('Create note failed:', _err)
    }
  }

  const handleNoteSelect = async (note: Note) => {
    const markdownContent = getMarkdownContent()
    if (currentNote && markdownContent !== lastSavedContent) await saveCurrentNote()
    try {
      const res = await editorApi.loadNote(note.id)
      if (res.success && res.data) {
        setCurrentNote(res.data)
        setContent(markdownToHtml(res.data.content))
        setLastSavedContent(res.data.content)
      } else {
        setCurrentNote(note)
        setContent(markdownToHtml(note.content))
        setLastSavedContent(note.content)
      }
    } catch (_err) {
      setCurrentNote(note)
      setContent(markdownToHtml(note.content))
      setLastSavedContent(note.content)
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await editorApi.deleteNote(id)
      if (!res.success) return
      reloadSidebar()
      if (currentNote?.id !== id) return
      const list = await editorApi.listNotes()
      if (list.success && list.data && list.data.length) {
        const next = list.data[0]
        setCurrentNote(next)
        setContent(markdownToHtml(next.content))
        setLastSavedContent(next.content)
      } else {
        await createNewNote()
      }
    } catch (_err) {
      console.error('Delete note failed:', _err)
    }
  }

  const handleBuild = async (selectedText: string) => {
    if (!aiInitialized) return
    if (!selectedText.trim()) return
    if (!window.electronAPI?.ai) {
      alert('Electron API not available')
      return
    }
    setIsBuilding(true)
    setBuildStatus('Building...')
    try {
      const res = await window.electronAPI.ai.processRequest(selectedText)
      if (res.success) {
        setBuildStatus('Changes applied, reloading...')
        setTimeout(() => setIsBuilding(false), 3000)
      } else {
        console.error('AI error:', res.error)
        alert('AI error: ' + res.error)
        setIsBuilding(false)
      }
    } catch (_err) {
      console.error('Build error:', _err)
      alert('Build error: ' + _err)
      setIsBuilding(false)
    }
  }

  useEffect(() => {
    const initAI = async () => {
      if (!window.electronAPI?.ai) return
      const res = await window.electronAPI.ai.initialize({})
      if (res.success) setAiInitialized(true)
    }
    const loadInitial = async () => {
      const res = await editorApi.listNotes()
      if (res.success && res.data && res.data.length) {
        const first = res.data[0]
        setCurrentNote(first)
        setContent(markdownToHtml(first.content))
        setLastSavedContent(first.content)
      } else {
        await createNewNote()
      }
    }
    initAI()
    loadInitial()
  }, [])

  useEffect(() => {
    if (!currentNote) return
    const md = getMarkdownContent()
    if (md === lastSavedContent) return
    const t = setTimeout(saveCurrentNote, 1500)
    return () => clearTimeout(t)
  }, [content, currentNote, lastSavedContent])

  return (
    <div className="w-full h-screen max-h-screen flex bg-background">
      <NotesSidebar
        key={sidebarKey}
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
          content={getMarkdownContent()}
        />
        <Editor value={content} onChange={setContent} onBuild={handleBuild} />
        <NoteEditorFooter content={getPlainTextContent()} />
      </SidebarInset>
    </div>
  )
}

export function EditorPage() {
  return (
    <SidebarProvider defaultOpen={false}>
      <EditorContent />
    </SidebarProvider>
  )
} 