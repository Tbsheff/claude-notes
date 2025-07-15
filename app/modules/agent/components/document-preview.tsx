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
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
      <FileText className="h-3 w-3" />
      <span className="truncate max-w-[200px]">{currentNote.title}</span>
    </div>
  )
} 