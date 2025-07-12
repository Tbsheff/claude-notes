import React, { useState, useEffect } from 'react'
import { Plus, FileText, Trash2 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenuAction,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import { editorApi } from '../api'
import { Note } from '@/types/electron'

interface NotesSidebarProps {
  currentNote: Note | null
  onNoteSelect: (note: Note) => void
  onCreateNote: () => Promise<void>
  onDeleteNote: (noteId: string) => void
}

export function NotesSidebar({ 
  currentNote, 
  onNoteSelect, 
  onCreateNote, 
  onDeleteNote 
}: NotesSidebarProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const result = await editorApi.listNotes()
      if (result.success && result.data) {
        setNotes(result.data)
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await onDeleteNote(noteId)
        setNotes(notes.filter(n => n.id !== noteId))
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
  }

  const handleCreateNote = async () => {
    try {
      await onCreateNote()
      await loadNotes()
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Recent Notes</SidebarGroupLabel>
          <SidebarGroupAction onClick={handleCreateNote}>
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))
              ) : notes.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No notes yet
                  </div>
                </SidebarMenuItem>
              ) : (
                notes.map((note) => (
                  <SidebarMenuItem key={note.id} className="cursor-pointer">
                    <SidebarMenuButton
                      isActive={currentNote?.id === note.id}
                      onClick={() => onNoteSelect(note)}
                    >
                      <FileText className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">
                          {note.title}
                        </div>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      showOnHover
                    >
                      <Trash2 className="h-4 w-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 