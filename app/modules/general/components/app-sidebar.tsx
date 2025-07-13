import React, { useState, useEffect } from 'react'
import { Plus, FileText, MoreHorizontal, Download, RotateCcw, Loader2 } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { editorApi } from '../../editor/api'
import { generalApi } from '../api'
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
  const [isExporting, setIsExporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

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

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await onDeleteNote(noteId)
        setNotes(notes.filter(n => n.id !== noteId))
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
  }

  const handleExportNote = async (note: Note) => {
    console.log('Export note:', note.title)
  }

  const handleCreateNote = async () => {
    try {
      await onCreateNote()
      await loadNotes()
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleExportWorkspace = async () => {
    setIsExporting(true)
    try {
      const result = await generalApi.exportWorkspace()
      if (result.success) {
        console.log('Workspace exported successfully')
      } else {
        console.error('Failed to export workspace:', result.error)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetFeatures = async () => {
    if (!confirm('Are you sure you want to reset all features? This will pull from the repo and rebuild the app.')) {
      return
    }
    
    setIsResetting(true)
    try {
      const result = await generalApi.resetFeatures('https://github.com/diko0071/ai-editor')
      if (result.success) {
        console.log('Features reset successfully')
      } else {
        console.error('Failed to reset features:', result.error)
      }
    } catch (error) {
      console.error('Reset failed:', error)
    } finally {
      setIsResetting(false)
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
                    <SidebarMenuAction showOnHover>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center justify-center w-full h-full cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleExportNote(note)}
                          >
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="space-y-2 p-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportWorkspace}
                disabled={isExporting}
                className="w-full justify-start"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Workspace
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFeatures}
                disabled={isResetting}
                className="w-full justify-start"
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reset All Features
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 