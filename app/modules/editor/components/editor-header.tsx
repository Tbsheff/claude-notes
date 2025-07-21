import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
 import { Sparkles, Download } from 'lucide-react'
import { SettingsDialog } from './editor-settings-dialog'
import { exportTextFile } from '@/app/modules/general/api'
import { formatDate } from '@/lib/utils'

interface NoteEditorHeaderProps {
  content: string
  onToggleChat: () => void
  createdAt: Date
}

export { Sparkles } from 'lucide-react'

export function NoteEditorHeader({ content, onToggleChat, createdAt }: NoteEditorHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  const handleExport = () => {
    const filename = `note-${new Date().toISOString().split('T')[0]}`
    exportTextFile(content, filename, 'text')
  }

  return (
    <div className="border-b border-border px-6 py-2 flex items-center justify-between bg-background">
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          {formatDate(createdAt)}
        </div>
        <div className="text-sm text-muted-foreground">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="h-7 w-7 p-0 text-muted-foreground"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleChat}
          className="h-7 w-7 p-0 text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
        
        <SettingsDialog />
      </div>
    </div>
  )
} 