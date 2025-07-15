import { useState, useEffect, useRef } from 'react'
import { FileText, Loader2, Edit, Plus, Replace, Minus } from 'lucide-react'
import { CollapsibleTool } from './collapsible-tool'
import { ToolBlock } from '@/lib/agent/types'
import { toolRegistry } from '@/lib/agent/tool-registry'

export function DocumentEditorChatBlock({ block }: { block: ToolBlock }) {
  const { args, result } = block.data
  const isExecuting = block.status === 'executing'
  const [streamingText, setStreamingText] = useState('')
  const savedArgsRef = useRef<any>(null)
  
  useEffect(() => {
    if (!savedArgsRef.current && args && args.action && args.text) {
      savedArgsRef.current = args
    }
  }, [args])

  useEffect(() => {
    if (!savedArgsRef.current && block.data?.args?.action && block.data?.args?.text) {
      savedArgsRef.current = block.data.args
    }
  }, [block.data?.args])
  
  useEffect(() => {
    if (isExecuting && args?.text) {
      let index = 0
      const text = args.text
      
      const interval = setInterval(() => {
        if (index < text.length) {
          setStreamingText(text.slice(0, index + 1))
          index++
        } else {
          clearInterval(interval)
        }
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [isExecuting, args?.text])
  
  const getTitle = () => {
    if (isExecuting) {
      const action = args?.action || 'editing'
      const actionMessages: Record<string, string> = {
        'append': 'Writing',
        'replace': 'Updating',
        'insert': 'Inserting'
      }
      return `Document Editor (${actionMessages[action] || action}...)`
    }
    return 'Document Editor'
  }

  const getIcon = () => {
    if (isExecuting) {
      return <Loader2 className="h-3 w-3 animate-spin" />
    }
    
    const action = args?.action || result?.action || savedArgsRef.current?.action
    switch (action) {
      case 'append':
        return <Plus className="h-3 w-3" />
      case 'replace':
        return <Replace className="h-3 w-3" />
      case 'insert':
        return <Edit className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const renderDiffLog = () => {
    console.log('🔍 renderDiffLog - args:', args)
    console.log('🔍 renderDiffLog - result:', result)
    console.log('🔍 renderDiffLog - savedArgsRef:', savedArgsRef.current)
    console.log('🔍 renderDiffLog - block.data:', block.data)
    console.log('🔍 renderDiffLog - isExecuting:', isExecuting)
    
    if (isExecuting) {
      return (
        <div className="space-y-1 text-sm">
          <div className="text-muted-foreground font-medium">
            Action: {args?.action || 'editing'}
          </div>
          {streamingText && (
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Preview:</div>
              <div className="font-mono text-sm whitespace-pre-wrap">
                {streamingText}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          )}
        </div>
      )
    }

    const logs = []
    
    const finalAction = args?.action || result?.action || savedArgsRef.current?.action
    const finalText = args?.text || savedArgsRef.current?.text
    
    const action = finalAction
    const text   = finalText
    
    console.log('🔍 Final action:', action)
    console.log('🔍 Final text:', text)
    
    if (action) {
      switch (action) {
        case 'append':
          if (text) {
            logs.push(`+ Added: "${text}"`)
          }
          break
        case 'replace':
          logs.push(`- Replaced all content`)
          if (text) {
            logs.push(`+ New content: "${text}"`)
          }
          break
        case 'insert':
          if (text) {
            logs.push(`+ Inserted: "${text}"${args?.position ? ` at position ${args.position}` : ''}`)
          }
          break
        default:
          logs.push(`~ Action: ${action}`)
          if (text) {
            logs.push(`  Content: "${text}"`)
          }
      }
    } else {
      logs.push(`~ No action specified`)
    }
    
    if (result?.textLength) {
      logs.push(`✓ ${result.textLength} characters processed`)
    } else if (result?.message) {
      logs.push(`✓ ${result.message}`)
    }

    if (logs.length === 0) {
      logs.push('✓ Operation completed')
    }

    console.log('🔍 Final logs:', logs)

    return (
      <div className="space-y-1 text-sm">
        {logs.map((line, idx) => (
          <div key={idx} className="flex gap-1 text-xs font-mono break-all">
            <span className={
              line.startsWith('+') ? 'text-green-600' : 
              line.startsWith('-') ? 'text-red-600' : 
              line.startsWith('✓') ? 'text-green-600' : 
              line.startsWith('~') ? 'text-yellow-600' :
              'text-muted-foreground'
            }>
              {line.slice(0, 2)}
            </span>
            <span className="flex-1">{line.slice(2)}</span>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <CollapsibleTool
      title={getTitle()}
      icon={getIcon()}
      dataTestId={isExecuting ? 'document-editor-executing' : 'document-editor-completed'}
    >
      {renderDiffLog()}
    </CollapsibleTool>
  )
}

toolRegistry.register('document-editor', DocumentEditorChatBlock) 