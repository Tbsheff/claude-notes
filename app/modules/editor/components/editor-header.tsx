import React from 'react'
import { Download, Menu, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BuildStatusBadge } from '@/components/ui/build-status-badge'
import { SettingsDialog } from './editor-settings-dialog'

interface NoteEditorHeaderProps {
  isBuilding: boolean
  buildStatus: string
  content: string
  onToggleChat: () => void
  createdAt: Date
}

export function NoteEditorHeader({ isBuilding, buildStatus, content, onToggleChat, createdAt }: NoteEditorHeaderProps) {
  console.log('🎯 Header render - isBuilding:', isBuilding, 'buildStatus:', buildStatus)
  
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
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
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {formatDateTime(createdAt)}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {isBuilding ? (
          <BuildStatusBadge status="building">{buildStatus}</BuildStatusBadge>
        ) : buildStatus.includes('Changes applied') ? (
          <BuildStatusBadge status="success">{buildStatus}</BuildStatusBadge>
        ) : buildStatus === 'Reloading...' ? (
          <BuildStatusBadge status="reloading">{buildStatus}</BuildStatusBadge>
        ) : null}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="flex items-center"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleChat}
          className="flex items-center"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        
        <SettingsDialog />
      </div>
    </div>
  )
} 