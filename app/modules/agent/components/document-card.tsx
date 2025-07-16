import { FileText } from 'lucide-react'

interface DocumentPreviewProps {
  currentNote?: {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
  }
}

export function DocumentPreview({ currentNote }: DocumentPreviewProps) {
  if (!currentNote) return null
  
  return (
    <div className="w-full flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1 text-xs text-muted-foreground">
      <FileText className="h-3 w-3 flex-shrink-0" />
      <span className="truncate flex-1">{currentNote.title}</span>
    </div>
  )
} 