import { useState } from 'react'
import { FileText, Loader2, Check, X, Plus, Minus } from 'lucide-react'
import { ToolBlock } from '@/lib/agent/types'
import { Note } from '@/app/modules/editor/api/types'
import { toolRegistry } from '@/lib/agent/tool-registry'
import * as DiffMatchPatch from 'diff-match-patch'
import { Button } from '@/components/ui/button'

const dmp = new DiffMatchPatch.diff_match_patch()

function renderDiff(oldContent: string, newContent: string) {
  const diffs = dmp.diff_main(oldContent, newContent)
  dmp.diff_cleanupSemantic(diffs)
  
  return diffs.map(([op, text], index) => {
    switch (op) {
      case DiffMatchPatch.DIFF_INSERT:
        return <ins key={index} className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">{text}</ins>
      case DiffMatchPatch.DIFF_DELETE:
        return <del key={index} className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">{text}</del>
      case DiffMatchPatch.DIFF_EQUAL:
        return <span key={index}>{text}</span>
    }
  })
}

function renderNewContent(content: string) {
  return <ins className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">{content}</ins>
}

export function DocumentEditorChatBlock({ block, currentNote, onApplyChanges, onUpdateBlock }: { 
  block: ToolBlock, 
  currentNote?: Note,
  onApplyChanges?: (data: { action: string; content: string; newNote?: Note }) => void,
  onUpdateBlock?: (block: ToolBlock) => void
}) {
  const [isApplying, setIsApplying] = useState(false)
  
  const { result, args } = block.data
  if (!result && !args) {
    return null
  }
  const isExecuting = block.status === 'executing'
  const isApplied = result?.isApplied || false
  const isDeclined = result?.isDeclined || false

  const handleApply = async () => {
    if (!result?.success) return
    
    setIsApplying(true)
    
    try {
      const { action } = result
      
      if (action === 'create') {
        const response = await window.electronAPI.notes.create(
          result.title || 'New Document', 
          result.newContent || ''
        )
        
        if (response.success && response.note) {
          const applyData = {
            action: 'create',
            content: result.newContent || '',
            newNote: response.note
          }
          onApplyChanges?.(applyData)
          
          if (onUpdateBlock) {
            onUpdateBlock({ 
              ...block, 
              data: { 
                ...block.data, 
                result: { 
                  ...result, 
                  isApplied: true,
                  newNote: response.note
                } 
              } 
            })
          }
        } else {
          console.error('Failed to create document:', response.error)
        }
      } else if (action === 'delete') {
        if (!currentNote) return
        
        const response = await window.electronAPI.notes.delete(currentNote.id)
        
        if (response.success) {
          const applyData = {
            action: 'delete',
            content: '',
            newNote: undefined
          }
          onApplyChanges?.(applyData)
          
          if (onUpdateBlock) {
            onUpdateBlock({ 
              ...block, 
              data: { 
                ...block.data, 
                result: { ...result, isApplied: true } 
              } 
            })
          }
        } else {
          console.error('Failed to delete document:', response.error)
        }
      } else {
        if (!currentNote) return
        
        const response = await window.electronAPI.notes.save(
          currentNote.id,
          result.newContent || '',
          currentNote.title
        )
        
        if (response.success) {
          const applyData = {
            action: action,
            content: result.newContent || '',
            newNote: undefined
          }
          onApplyChanges?.(applyData)
          
          if (onUpdateBlock) {
            onUpdateBlock({ 
              ...block, 
              data: { 
                ...block.data, 
                result: { ...result, isApplied: true } 
              } 
            })
          }
        } else {
          console.error('Failed to update document:', response.error)
        }
      }
    } catch (error) {
      console.error('Apply failed:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDecline = () => {
    if (onUpdateBlock) {
      onUpdateBlock({ ...block, data: { ...block.data, result: { ...result, isDeclined: true } } })
    }
  }

  const getActualTitle = () => {
    let parsedArgs = args
    
    if (typeof args === 'string') {
      try {
        parsedArgs = JSON.parse(args)
      } catch (_e) {
        const actionMatch = args.match(/"action":\s*"([^"]*)"/)
        const titleMatch = args.match(/"title":\s*"([^"]*)"/)
        
        parsedArgs = {
          action: actionMatch ? actionMatch[1] : undefined,
          title: titleMatch ? titleMatch[1] : undefined
        }
      }
    }
    
    const action = result?.action || parsedArgs?.action
    
    const argsString = typeof args === 'string' ? args : JSON.stringify(args)
    const isCreateAction = (action === 'create') || argsString.toLowerCase().includes('create')
    
    if (isCreateAction) {
      return result?.title || parsedArgs?.title || null
    }
    
    return currentNote?.title
  }

  const actualTitle = getActualTitle() || 'New Document'
  
  if (isExecuting) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md p-2 max-w-md border border-border/50">
        <Loader2 className="h-3 w-3 animate-spin" />
        <FileText className="h-3 w-3" />
        <span className="font-medium truncate">{actualTitle}</span>
      </div>
    )
  }

  if (result?.success) {
    const action = result.action
    
    const getActionIcon = () => {
      if (action === 'create') return <Plus className="h-3 w-3 text-green-600 dark:text-green-400" />
      if (action === 'delete') return <Minus className="h-3 w-3 text-red-600 dark:text-red-400" />
      return null
    }
    
    const getStatusBadge = () => {
      if (isApplied) return <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
      if (isDeclined) return <X className="h-3 w-3 text-red-600 dark:text-red-400" />
      return null
    }
    
    return (
      <div className="bg-muted/30 rounded-md overflow-hidden border border-border/50">
        <div className="flex items-center justify-between gap-2 text-xs p-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText 
              className="h-3 w-3 flex-shrink-0 cursor-pointer" 
              onClick={() => {
                if (result?.newNote) {
                  onApplyChanges?.({
                    action: 'select',
                    content: result.newNote.content || '',
                    newNote: result.newNote
                  })
                } else if (currentNote) {
                  onApplyChanges?.({
                    action: 'select',
                    content: currentNote.content || '',
                    newNote: currentNote
                  })
                }
              }}
            />
            <span className="font-medium truncate">{actualTitle}</span>
            {getActionIcon()}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getStatusBadge()}
          </div>
        </div>
        
        {(result.newContent || result.oldContent) && (
          <>
            <div className="px-2 pb-2 text-xs max-h-32 overflow-y-auto font-mono whitespace-pre-wrap break-all text-muted-foreground">
              {result.action === 'create' ? (
                renderNewContent(result.newContent)
              ) : result.action === 'delete' ? (
                <del className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">{result.oldContent}</del>
              ) : (
                renderDiff(result.oldContent || '', result.newContent || '')
              )}
            </div>
            
            {!(isApplied || isDeclined) && (
              <div className="flex justify-end gap-1 px-2 pb-1">
                <Button 
                  size="sm" 
                  onClick={handleDecline}
                  disabled={isApplying}
                  className="h-5 px-1.5 text-xs bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApply}
                  disabled={isApplying}
                  className="h-5 px-1.5 text-xs bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
                >
                  {isApplying ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Check className="h-2.5 w-2.5" />
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="text-xs text-red-500 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 rounded-md p-2">
      <span>Error: {result?.error || 'Failed'}</span>
    </div>
  )
}

toolRegistry.register('document-editor', DocumentEditorChatBlock) 