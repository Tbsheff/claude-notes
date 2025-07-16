import { useState, useEffect, useRef } from 'react'
import { FileText, Loader2, Edit, Plus, Replace, Minus } from 'lucide-react'
import { CollapsibleTool } from './collapsible-tool'
import { ToolBlock } from '@/lib/agent/types'
import { toolRegistry } from '@/lib/agent/tool-registry'

export function DocumentEditorChatBlock({ block }: { block: ToolBlock }) {
  const { args, result } = block.data
  const isExecuting = block.status === 'executing'
  const [displayText, setDisplayText] = useState('')
  const [displayAction, setDisplayAction] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  
  // Handle args updates (AI SDK 4.0 progressively builds the args)
  useEffect(() => {
    if (args) {
      if (typeof args === 'string') {
        // Still accumulating JSON, try to extract partial info
        const textMatch = args.match(/"text":\s*"([^"]*(?:\\.[^"]*)*)"/)
        const actionMatch = args.match(/"action":\s*"([^"]*)"/)
        
        if (textMatch) {
          const text = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
          setDisplayText(text)
        }
        if (actionMatch) {
          setDisplayAction(actionMatch[1])
        }
      } else if (typeof args === 'object') {
        // Complete parsed object
        setDisplayText(args.text || '')
        setDisplayAction(args.action || '')
      }
    }
  }, [args])

  // Handle final result
  useEffect(() => {
    if (result?.args) {
      const finalArgs = typeof result.args === 'string' ? JSON.parse(result.args) : result.args
      setDisplayText(finalArgs.text || '')
      setDisplayAction(finalArgs.action || '')
    }
  }, [result])

  // Typing animation for streaming
  useEffect(() => {
    if (isExecuting && displayText) {
      const text = displayText
      let index = 0
      setCursorPosition(0)
      
      const interval = setInterval(() => {
        if (index < text.length) {
          setCursorPosition(index + 1)
          index++
        } else {
          clearInterval(interval)
        }
      }, 20)
      
      return () => clearInterval(interval)
    }
  }, [displayText, isExecuting])

  const getActionIcon = () => {
    switch (displayAction) {
      case 'replace': return <Replace className="h-4 w-4" />
      case 'append': return <Plus className="h-4 w-4" />
      case 'prepend': return <Plus className="h-4 w-4" />
      case 'delete': return <Minus className="h-4 w-4" />
      default: return <Edit className="h-4 w-4" />
    }
  }

  const getActionText = () => {
    switch (displayAction) {
      case 'replace': return 'replacing'
      case 'append': return 'appending'
      case 'prepend': return 'prepending'
      case 'delete': return 'deleting'
      default: return 'editing'
    }
  }

  const getTitle = () => {
    if (isExecuting) {
      return `Document Editor (${getActionText()}...)`
    }
    return 'Document Editor'
  }

  const getStatusText = () => {
    if (isExecuting) {
      return `Action: ${getActionText()}`
    }
    return `Action: ${displayAction || 'completed'}`
  }

  const previewText = isExecuting ? displayText.slice(0, cursorPosition) : displayText

  return (
    <div className="w-full max-w-lg md:max-w-2xl">
      <CollapsibleTool 
        title={getTitle()}
        icon={isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : getActionIcon()}
        dataTestId={isExecuting ? 'document-editor-executing' : 'document-editor-completed'}
      >
        <div className="space-y-3 text-sm">
          <div className="text-muted-foreground">
            {getStatusText()}
          </div>
          
          {displayText && (
            <div className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <FileText className="h-3 w-3" />
                Content Preview
              </div>
              <div className="text-sm whitespace-pre-wrap font-mono">
                {previewText}
                {isExecuting && <span className="animate-pulse">|</span>}
              </div>
              {isExecuting && displayText.length > cursorPosition && (
                <div className="text-xs text-muted-foreground mt-1">
                  {displayText.length - cursorPosition} more characters...
                </div>
              )}
            </div>
          )}
          
          {result && (
            <div className="text-xs text-muted-foreground">
              ✓ {displayText.length} characters processed
            </div>
          )}
        </div>
      </CollapsibleTool>
    </div>
  )
}

toolRegistry.register('document-editor', DocumentEditorChatBlock) 