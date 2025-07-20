import React, { useState, useEffect } from 'react'
import { Plus, FileText, MoreHorizontal, Download, RotateCcw, Loader2, Trash2 } from 'lucide-react'
import { exportTextFile } from '../api'
import { groupItemsByDate, DATE_GROUPS } from '@/lib/utils'
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
  const [isClearing, setIsClearing] = useState(false)


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

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This will delete all notes, chats, and settings. This action cannot be undone.')) {
      return
    }
    
    setIsClearing(true)
    try {
      const result = await generalApi.clearDatabase()
      if (result.success) {
        setNotes([])
        alert('Database cleared successfully')
      } else {
        alert('Failed to clear database: ' + result.error)
      }
    } catch (error) {
      alert('Failed to clear database')
    } finally {
      setIsClearing(false)
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

  const groupedNotes = groupItemsByDate(notes, (note) => new Date(note.updatedAt || note.createdAt))

  const renderNoteGroups = () => {
    let hasShownCreateButton = false

    return DATE_GROUPS.map((group: string) => {
      if (!groupedNotes[group] || groupedNotes[group].length === 0) return null
      
      const showCreateButton = !hasShownCreateButton
      if (showCreateButton) {
        hasShownCreateButton = true
      }

      return (
        <SidebarGroup key={group}>
          <SidebarGroupLabel>{group}</SidebarGroupLabel>
          {showCreateButton && (
            <SidebarGroupAction onClick={handleCreateNote}>
              <Plus className="h-4 w-4" />
            </SidebarGroupAction>
          )}
          <SidebarGroupContent>
            {renderNoteGroup(groupedNotes[group])}
          </SidebarGroupContent>
        </SidebarGroup>
      )
    })
  }

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
            renderNoteGroups()
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDatabase}
                disabled={isClearing}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Clear All Data
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 