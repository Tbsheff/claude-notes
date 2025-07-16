import { useState, useEffect } from 'react'
import { NoteEditorHeader } from '../components/editor-header'
import { NoteEditorFooter } from '../components/editor-footer'
import { NotesSidebar } from '../../general/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Editor } from '../components/editor'
import { editorApi } from '../api'
import { Note } from '@/app/modules/editor/api'
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown'
import { AgentChat } from '@/app/modules/agent/components/agent-chat'

function EditorContent() {
  const [content, setContent] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [createdAt] = useState(new Date())
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [sidebarKey, setSidebarKey] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const reloadSidebar = () => setSidebarKey((k) => k + 1)
  const toggleChat = () => setIsChatOpen(!isChatOpen)

  const getPlainTextContent = () => (content || '').replace(/<[^>]+>/g, ' ').trim()
  const getMarkdownContent = () => htmlToMarkdown(content)
  
  useEffect(() => {
    if (!window.electronAPI) return
    
    const handleDocumentUpdate = (_event: any, request: any) => {
      const { action, text, position } = request
      
      switch (action) {
        case 'append':
          setContent(prev => prev + text)
          break
        case 'replace':
          setContent(text)
          break
        case 'insert':
          if (position !== undefined) {
            setContent(prev => prev.slice(0, position) + text + prev.slice(position))
          } else {
            setContent(prev => prev + text)
          }
          break
      }
    }
    
    window.electronAPI.ipcRenderer.on('document-update', handleDocumentUpdate)
    
    return () => {
      window.electronAPI.ipcRenderer.removeListener('document-update', handleDocumentUpdate)
    }
  }, [content])

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
        setContent(markdownToHtml(res.data.content || ''))
        setLastSavedContent(res.data.content || '')
      } else {
        setCurrentNote(note)
        setContent(markdownToHtml(note.content || ''))
        setLastSavedContent(note.content || '')
      }
    } catch (_err) {
      setCurrentNote(note)
      setContent(markdownToHtml(note.content || ''))
      setLastSavedContent(note.content || '')
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
    console.log('🔧 Build triggered with text:', selectedText.substring(0, 50) + '...')
    console.log('🔧 AI initialized:', aiInitialized)
    console.log('🔧 Electron API available:', !!window.electronAPI?.ai)
    
    if (!aiInitialized) return
    if (!selectedText.trim()) return
    if (!window.electronAPI?.ai) {
      alert('Electron API not available')
      return
    }
    console.log('🔧 Setting isBuilding to true')
    setIsBuilding(true)
    setBuildStatus('Building...')
    try {
      console.log('🔧 Calling AI processRequest...')
      const res = await window.electronAPI.ai.processRequest(selectedText)
      console.log('🔧 AI response:', res)
      if (res.success) {
        if (res.workspaceResult && res.workspaceResult.changedFilesCount === 0) {
          setBuildStatus('No files were changed.')
          setTimeout(() => setIsBuilding(false), 2000)
        } else {
          setBuildStatus('Changes applied, reloading...')
          setTimeout(() => setIsBuilding(false), 3000)
        }
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
        
        try {
          const noteRes = await editorApi.loadNote(first.id)
          if (noteRes.success && noteRes.data) {
            setCurrentNote(noteRes.data)
            setContent(markdownToHtml(noteRes.data.content || ''))
            setLastSavedContent(noteRes.data.content || '')
          } else {
            setCurrentNote(first)
            setContent(markdownToHtml(first.content || ''))
            setLastSavedContent(first.content || '')
          }
        } catch (err) {
          setCurrentNote(first)
          setContent(markdownToHtml(first.content || ''))
          setLastSavedContent(first.content || '')
        }
      } else {
        await createNewNote()
      }
    }
    
    const handleAIReinitialized = () => {
      setAiInitialized(true)
      console.log('🔧 AI state updated after reinitialization')
    }
    
    initAI()
    loadInitial()
    
    window.addEventListener('ai-reinitialized', handleAIReinitialized)
    
    return () => {
      window.removeEventListener('ai-reinitialized', handleAIReinitialized)
    }
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
      <SidebarInset className="flex flex-col flex-1">
        <NoteEditorHeader
          createdAt={createdAt}
          isBuilding={isBuilding}
          buildStatus={buildStatus}
          content={getMarkdownContent()}
          onToggleChat={toggleChat}
        />
        <Editor value={content} onChange={setContent} onBuild={handleBuild} />
        <NoteEditorFooter content={getPlainTextContent()} />
      </SidebarInset>
      {isChatOpen && (
        <AgentChat 
          onToggle={toggleChat} 
          currentNote={currentNote ? {
            ...currentNote,
            content: getMarkdownContent()
          } : undefined}
        />
      )}
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