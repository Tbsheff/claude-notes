import { useState, useEffect } from 'react'
import { NoteEditorHeader } from '../components/editor-header'
import { NoteEditorFooter } from '../components/editor-footer'
import { NotesSidebar } from '../../general/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Editor } from '../components/editor'
import { Note } from '@/app/modules/editor/api'
import { markdownToHtml } from '@/lib/markdown'
import { AgentChat } from '@/app/modules/agent/components/agent-chat'
import { useNoteManager } from '@/hooks/use-note-manager'
import { useDocumentSync } from '@/hooks/use-document-sync'
import { stripHtmlTags } from '@/lib/utils'


function EditorContent() {
  const [aiInitialized, setAiInitialized] = useState(false)
  const [createdAt] = useState(new Date())
  const [sidebarKey, setSidebarKey] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const {
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
  } = useNoteManager()

  useDocumentSync({ setContent })

  const reloadSidebar = () => setSidebarKey((k) => k + 1)
  const toggleChat = () => setIsChatOpen(!isChatOpen)

  const getPlainTextContent = () => stripHtmlTags(content || '')
  
  useEffect(() => {
    if (!window.electronAPI) return
    
    const handleDocumentUpdate = (_event: any, request: any) => {
      const { action, text, position } = request
      
      setContent(currentContent => {
        switch (action) {
          case 'append':
            return currentContent + markdownToHtml(text)
          case 'replace':
            return markdownToHtml(text)
          case 'insert':
            if (position !== undefined) {
              return currentContent.slice(0, position) + markdownToHtml(text) + currentContent.slice(position)
            }
            return currentContent + markdownToHtml(text)
          default:
            return currentContent
        }
      })
    }
    
    const handleGetDocumentContent = (_event: any, { noteId }: { noteId: string }) => {
      if (currentNote && currentNote.id === noteId) {
        window.electronAPI.ipcRenderer.send(`document-content-response-${noteId}`, getMarkdownContent())
      }
    }
    
    window.electronAPI.ipcRenderer.on('document-update', handleDocumentUpdate)
    window.electronAPI.ipcRenderer.on('get-document-content', handleGetDocumentContent)
    
    return () => {
      window.electronAPI.ipcRenderer.removeListener('document-update', handleDocumentUpdate)
      window.electronAPI.ipcRenderer.removeListener('get-document-content', handleGetDocumentContent)
    }
  }, [content, currentNote, getMarkdownContent])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        toggleChat()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleChat])

  const handleNoteSelectWithReload = async (note: Note) => {
    await handleNoteSelect(note)
    reloadSidebar()
  }

  const handleDeleteNoteWithReload = async (id: string) => {
    await handleDeleteNote(id)
    reloadSidebar()
  }

  const createNewNoteWithReload = async () => {
    await createNewNote()
    reloadSidebar()
  }

  useEffect(() => {
    const initAI = async () => {
      if (!window.electronAPI?.ai) return
      const res = await window.electronAPI.ai.initialize({})
      if (res.success) setAiInitialized(true)
    }
    
    const handleAIReinitialized = () => {
      setAiInitialized(true)
    }
    
    initAI()
    loadInitialNote().catch(console.error)
    
    window.addEventListener('ai-reinitialized', handleAIReinitialized)
    
    return () => {
      window.removeEventListener('ai-reinitialized', handleAIReinitialized)
    }
  }, [])

  const handleApplyChanges = async (data: { action: string; content: string; newNote?: Note }) => {
    const { action, content: newContent, newNote } = data
    
    if (action === 'create' && newNote) {
      try {
        await handleNoteSelect(newNote)
        reloadSidebar()
      } catch (error) {
        console.error('Failed to apply create changes:', error)
      }
    } else if (action === 'select' && newNote) {
      try {
        await handleNoteSelect(newNote)
        reloadSidebar()
      } catch (error) {
        console.error('Failed to select note:', error)
      }
    } else if (action === 'delete') {
      reloadSidebar()
    } else {
      setContent(markdownToHtml(newContent))
    }
  }

  return (
    <div className="w-full h-screen max-h-screen flex bg-background overflow-hidden">
      <NotesSidebar
        key={sidebarKey}
        currentNote={currentNote}
        onNoteSelect={handleNoteSelectWithReload}
        onCreateNote={createNewNoteWithReload}
        onDeleteNote={handleDeleteNoteWithReload}
      />
      <SidebarInset className="flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto">
        <NoteEditorHeader
          createdAt={createdAt}
          content={getMarkdownContent()}
          onToggleChat={toggleChat}
        />

        <Editor value={content} onChange={setContent} />
        <NoteEditorFooter content={getPlainTextContent()} />
      </SidebarInset>
      
      <AgentChat 
        isOpen={isChatOpen}
        onToggle={toggleChat} 
        currentNote={currentNote ? {
          ...currentNote,
          content: getMarkdownContent()
        } : undefined}
        onApplyChanges={handleApplyChanges}
      />
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