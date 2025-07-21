import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface RenameNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  currentTitle: string
  onRename: (newTitle: string) => Promise<void>
}

export function RenameNoteDialog({ 
  isOpen, 
  onClose, 
  currentTitle, 
  onRename 
}: RenameNoteDialogProps) {
  const [title, setTitle] = useState(currentTitle)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setTitle(currentTitle)
  }, [currentTitle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || title.trim() === currentTitle || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onRename(title.trim())
      onClose()
    } catch (error) {
      console.error('Failed to rename note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setTitle(currentTitle)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleClose()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || title.trim() === currentTitle || isSubmitting}
            >
              {isSubmitting ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 