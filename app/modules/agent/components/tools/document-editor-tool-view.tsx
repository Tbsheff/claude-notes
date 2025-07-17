import { useState, useEffect } from 'react'
import { FileText, Loader2, Check, X } from 'lucide-react'
import { CollapsibleTool } from './collapsible-tool'
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
        return <ins key={index} className="bg-green-100 text-green-800">{text}</ins>
      case DiffMatchPatch.DIFF_DELETE:
        return <del key={index} className="bg-red-100 text-red-800">{text}</del>
      case DiffMatchPatch.DIFF_EQUAL:
        return <span key={index}>{text}</span>
    }
  })
}

function renderNewContent(content: string) {
  return <ins className="bg-green-100 text-green-800">{content}</ins>
}

export function DocumentEditorChatBlock({ block, currentNote, onApplyChanges, onUpdateBlock }: { 
  block: ToolBlock, 
  currentNote?: Note,
  onApplyChanges?: (data: { action: string; content: string; newNote?: Note }) => void,
  onUpdateBlock?: (block: ToolBlock) => void
}) {
  const { result, args } = block.data
  const isExecuting = block.status === 'executing'
  const [isApplying, setIsApplying] = useState(false)
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

  const getExecutingTitle = () => {
    let parsedArgs = args
    
    // If args is a string, try to extract title with regex instead of JSON.parse
    if (typeof args === 'string') {
      try {
        parsedArgs = JSON.parse(args)
      } catch (e) {
        // If JSON is incomplete, try to extract values with regex
        const actionMatch = args.match(/"action":\s*"([^"]*)"/)
        const titleMatch = args.match(/"title":\s*"([^"]*)"/)
        
        parsedArgs = {
          action: actionMatch ? actionMatch[1] : undefined,
          title: titleMatch ? titleMatch[1] : undefined
        }
      }
    }
    
    const action = parsedArgs?.action
    
    if (action === 'create') {
      // Show "New Document" if no title yet, or the parsed title if available
      return parsedArgs?.title || 'New Document'
    }
    
    if (action === 'delete') {
      return currentNote?.title || 'Document'
    }
    
    // If no action yet (tool just started), assume it's likely a new document
    if (!action) {
      return 'New Document'
    }
    
    // For other actions, show current document title
    return currentNote?.title || 'Document'
  }

  const getDocumentTitle = () => {
    let parsedArgs = args
    
    // If args is a string, try to extract title with regex instead of JSON.parse
    if (typeof args === 'string') {
      try {
        parsedArgs = JSON.parse(args)
      } catch (e) {
        // If JSON is incomplete, try to extract values with regex
        const actionMatch = args.match(/"action":\s*"([^"]*)"/)
        const titleMatch = args.match(/"title":\s*"([^"]*)"/)
        
        parsedArgs = {
          action: actionMatch ? actionMatch[1] : undefined,
          title: titleMatch ? titleMatch[1] : undefined
        }
      }
    }
    
    const action = result?.action || parsedArgs?.action
    if (action === 'create') {
      return result?.title || parsedArgs?.title || 'New Document'
    }
    return currentNote?.title || 'Document'
  }
  
  if (isExecuting) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 max-w-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <FileText className="h-4 w-4" />
        <span className="font-medium">{getExecutingTitle()}</span>
      </div>
    )
  }

  if (result?.success) {
    return (
      <div className="bg-muted/50 rounded-lg overflow-hidden border">
        <div className="flex items-center gap-2 text-sm p-3 border-b">
          <FileText className="h-4 w-4" />
          <span className="font-medium">{getDocumentTitle()}</span>
        </div>
        {(result.newContent || result.oldContent) && (
          <>
            <div className="p-3 text-xs max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
              {result.action === 'create' ? (
                renderNewContent(result.newContent)
              ) : result.action === 'delete' ? (
                <del className="bg-red-100 text-red-800">{result.oldContent}</del>
              ) : (
                renderDiff(result.oldContent || '', result.newContent || '')
              )}
            </div>
            {!(isApplied || isDeclined) && (
              <div className="flex justify-end gap-2 p-2 border-t bg-background/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDecline}
                  disabled={isApplying}
                >
                  <X className="h-3 w-3 mr-1" /> Decline
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApply}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Apply
                </Button>
              </div>
            )}
            {isApplied && (
              <div className="flex justify-end gap-2 p-2 border-t bg-background/50">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Applied
                </span>
              </div>
            )}
            {isDeclined && (
              <div className="flex justify-end gap-2 p-2 border-t bg-background/50">
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Declined
                </span>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
      <X className="h-4 w-4" />
      <span className="font-medium">Document Editor</span>
      <span className="text-xs">Error: {result?.error || 'Failed'}</span>
    </div>
  )
}

toolRegistry.register('document-editor', DocumentEditorChatBlock) 