import React, { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  updatedAt: Date
}

interface NoteListProps {
  notes: Note[]
  selectedNoteId: string | null
  onNoteSelect: (noteId: string) => void
  onNoteCreate: () => void
  onNoteDelete: (noteId: string) => void
}

export function NoteList({ 
  notes, 
  selectedNoteId, 
  onNoteSelect, 
  onNoteCreate, 
  onNoteDelete 
}: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    })
  }

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Notes</h2>
          <Button
            onClick={onNoteCreate}
            size="sm"
            className="h-8 w-8 p-0"
            variant="ghost"
          >
            <Plus className="h-4 w-4 text-foreground" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                selectedNoteId === note.id ? 'bg-accent' : ''
              }`}
              onClick={() => onNoteSelect(note.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate text-foreground">
                    {note.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 overflow-hidden h-10" style={{ 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical' 
                  }}>
                    {note.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(note.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notes found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 