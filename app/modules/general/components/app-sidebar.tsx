import React, { useState, useEffect } from 'react'
import { Plus, FileText, MoreHorizontal, Download, RotateCcw, Loader2 } from 'lucide-react'
import { exportTextFile } from '../api'
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
import { Note } from '@/app/modules/editor/api'

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
      
    } finally {
      setLoading(false)
    }
  }

  const groupNotesByDate = (notes: Note[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))

    const groups = {
      today: [] as Note[],
      yesterday: [] as Note[],
      thisWeek: [] as Note[],
      older: [] as Note[]
    }

    notes.forEach(note => {
      const noteDate = new Date(note.updatedAt || note.createdAt)
      const noteDay = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate())

      if (noteDay.getTime() === today.getTime()) {
        groups.today.push(note)
      } else if (noteDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(note)
      } else if (noteDay.getTime() >= thisWeekStart.getTime()) {
        groups.thisWeek.push(note)
      } else {
        groups.older.push(note)
      }
    })

    return groups
  }

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await onDeleteNote(noteId)
        setNotes(notes.filter(n => n.id !== noteId))
      } catch (error) {
        
      }
    }
  }



  const handleExportNote = async (note: Note) => {
    try {
      console.log('Exporting note:', note.title, 'Content length:', note.content?.length || 0)
      if (!note.content || !note.content.trim()) {
        alert('This note has no content to export')
        return
      }
      exportTextFile(note.content, note.title, 'markdown')
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleCreateNote = async () => {
    try {
      await onCreateNote()
      await loadNotes()
    } catch (error) {
      
    }
  }

  const handleExportWorkspace = async () => {
    setIsExporting(true)
    try {
      const result = await generalApi.exportWorkspace()
      if (result.success) {
        
      } else {
        
      }
    } catch (error) {
      
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
      await generalApi.resetFeatures('https://github.com/diko0071/ai-editor')
    } catch (error) {
      
    } finally {
      setIsResetting(false)
    }
  }

  const renderNoteGroup = (groupNotes: Note[]) => (
    <SidebarMenu>
      {groupNotes.map((note) => (
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExportNote(note)
                  }}
                >
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNote(note.id)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuAction>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )

  const groupedNotes = groupNotesByDate(notes)

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarContent className="flex flex-col h-full">
        <div className="flex-1">
          {loading ? (
            <SidebarGroup>
              <SidebarGroupLabel>Recent Notes</SidebarGroupLabel>
              <SidebarGroupAction onClick={handleCreateNote}>
                <Plus className="h-4 w-4" />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : notes.length === 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>Recent Notes</SidebarGroupLabel>
              <SidebarGroupAction onClick={handleCreateNote}>
                <Plus className="h-4 w-4" />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No notes yet
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <>
              {groupedNotes.today.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Today</SidebarGroupLabel>
                  <SidebarGroupAction onClick={handleCreateNote}>
                    <Plus className="h-4 w-4" />
                  </SidebarGroupAction>
                  <SidebarGroupContent>
                    {renderNoteGroup(groupedNotes.today)}
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              
              {groupedNotes.yesterday.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
                  {groupedNotes.today.length === 0 && (
                    <SidebarGroupAction onClick={handleCreateNote}>
                      <Plus className="h-4 w-4" />
                    </SidebarGroupAction>
                  )}
                  <SidebarGroupContent>
                    {renderNoteGroup(groupedNotes.yesterday)}
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              
              {groupedNotes.thisWeek.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>This Week</SidebarGroupLabel>
                  {groupedNotes.today.length === 0 && groupedNotes.yesterday.length === 0 && (
                    <SidebarGroupAction onClick={handleCreateNote}>
                      <Plus className="h-4 w-4" />
                    </SidebarGroupAction>
                  )}
                  <SidebarGroupContent>
                    {renderNoteGroup(groupedNotes.thisWeek)}
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              
              {groupedNotes.older.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Older</SidebarGroupLabel>
                  {groupedNotes.today.length === 0 && groupedNotes.yesterday.length === 0 && groupedNotes.thisWeek.length === 0 && (
                    <SidebarGroupAction onClick={handleCreateNote}>
                      <Plus className="h-4 w-4" />
                    </SidebarGroupAction>
                  )}
                  <SidebarGroupContent>
                    {renderNoteGroup(groupedNotes.older)}
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="space-y-2 p-2">
              <Button
                variant="ghost"
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
                variant="ghost"
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