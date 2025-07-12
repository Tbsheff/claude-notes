import React from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from './settings-dialog'
import { AgentLogPopover } from './agent-log-popover/agent-log-popover'

interface NoteEditorHeaderProps {
  createdAt: Date
  isBuilding: boolean
  buildStatus: string
  content: string
}

export function NoteEditorHeader({ createdAt, isBuilding, buildStatus, content }: NoteEditorHeaderProps) {
  
  const handleExport = () => {
    if (!content.trim()) {
      alert('No content to export')
      return
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `note-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-background">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {createdAt.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })} at {createdAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {isBuilding ? (
          <AgentLogPopover buildStatus={buildStatus} />
        ) : buildStatus.includes('Changes applied') ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">{buildStatus}</span>
          </div>
        ) : buildStatus === 'Reloading...' ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">{buildStatus}</span>
          </div>
        ) : null}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <SettingsDialog />
      </div>
    </div>
  )
} 