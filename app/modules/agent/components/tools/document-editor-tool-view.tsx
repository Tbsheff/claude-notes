import { useState, useEffect } from 'react'
import { FileText, Loader2, Edit, Plus, Replace, Minus, Check, X } from 'lucide-react'
import { CollapsibleTool } from './collapsible-tool'
import { ToolBlock, Note } from '@/lib/agent/types'
import { toolRegistry } from '@/lib/agent/tool-registry'
import * as DiffMatchPatch from 'diff-match-patch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

export function DocumentEditorChatBlock({ block, currentNote, onApplyChanges, onUpdateBlock }: { 
  block: ToolBlock, 
  currentNote?: Note,
  onApplyChanges?: (newContent: string) => void,
  onUpdateBlock?: (block: ToolBlock) => void
}) {
  const { result } = block.data
  const isExecuting = block.status === 'executing'
  const [displayAction, setDisplayAction] = useState('')
  const isApplied = result?.isApplied || false
  const isDeclined = result?.isDeclined || false

  useEffect(() => {
    if (result?.success) {
      setDisplayAction(result.action || '')
    }
  }, [result])

  const handleApply = () => {
    if (result?.success && result.newContent) {
      onApplyChanges?.(result.newContent)
      if (onUpdateBlock) {
        onUpdateBlock({ ...block, data: { ...block.data, result: { ...result, isApplied: true } } })
      }
    }
  }

  const handleDecline = () => {
    if (onUpdateBlock) {
      onUpdateBlock({ ...block, data: { ...block.data, result: { ...result, isDeclined: true } } })
    }
  }

  const getActionIcon = () => {
    return <FileText className="h-4 w-4" />
  }

  const getActionText = () => {
    switch (displayAction) {
      case 'replace': return 'replacing'
      case 'append': return 'appending'
      case 'prepend': return 'prepending'
      case 'delete': return 'deleting'
      case 'create': return 'creating'
      default: return 'editing'
    }
  }

  const getDocumentTitle = () => {
    if (result?.success && result.action === 'create' && result.newNote) {
      return result.newNote.title
    }
    if (result?.success && result.action === 'delete') {
      return currentNote?.title || 'Document'
    }
    return currentNote?.title || 'Document'
  }
  
  if (isExecuting) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 max-w-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <FileText className="h-4 w-4" />
        <span className="font-medium">{getDocumentTitle()}</span>
      </div>
    )
  }

  if (result?.success) {
    return (
      <div className="bg-muted/50 rounded-lg overflow-hidden border">
        <div className="flex items-center gap-2 text-sm p-3 border-b">
          {getActionIcon()}
          <span className="font-medium">{getDocumentTitle()}</span>
          <span className="text-xs">{result.action}</span>
        </div>
        {result.oldContent && result.newContent && (
          <>
        <div className="p-3 text-xs max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
          {renderDiff(result.oldContent, result.newContent)}
        </div>
        {!(isApplied || isDeclined) && (
          <div className="flex justify-end gap-2 p-2 border-t bg-background/50">
            <Button variant="outline" size="sm" onClick={handleDecline}><X className="h-3 w-3 mr-1" /> Decline</Button>
            <Button size="sm" onClick={handleApply}><Check className="h-3 w-3 mr-1" /> Apply</Button>
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