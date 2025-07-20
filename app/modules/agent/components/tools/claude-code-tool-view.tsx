import { useEffect, useRef } from 'react'
import { FileText, Edit3, Search, FolderOpen, Code, Wrench, CheckSquare, Loader2 } from 'lucide-react'
import { AgentLogToolsViewProps } from '@/app/modules/agent/api/types'
import { TreeToolAction, CollapseToolAction } from './tool-actions'
import { ToolBlock } from '@/lib/agent/types'
import { toolRegistry } from '@/lib/agent/tool-registry'
import { MarkdownRenderer } from '@/lib/markdown'
import { cleanMessagePrefix } from '@/lib/utils'


export function ClaudeCodeToolView({ events }: AgentLogToolsViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-sm">No activity yet</div>
      </div>
    )
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {events.map((event, index) => {
        if (event.type === 'assistant_message') {
          return (
            <div key={index} className="py-2 px-3 border-b border-border last:border-0">
              <div className="text-sm text-foreground leading-relaxed">
                {(cleanMessagePrefix(event.message, 'Agent') || 'No message')
                  .replace(/([^\s])\n([^\s])/g, '$1$2')
                  .replace(/\s+/g, ' ')
                  .trim()}
              </div>
            </div>
          )
        }
        
        if (event.type === 'tool_result') {
          return null 
        }
        
        if (event.type === 'tool_action') {
          const message = event.message || ''
          
          if (message.includes('Edit:')) {
            const filePath = cleanMessagePrefix(message, 'Edit')
            const fileName = filePath.split('/').pop() || filePath
            
            return (
              <CollapseToolAction
                key={index}
                icon={<Edit3 className="h-3 w-3 text-orange-500 dark:text-orange-400" />}
                title={`Modified ${fileName}`}
              />
            )
          }
          
          if (message.includes('TodoWrite:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<CheckSquare className="h-3 w-3 text-blue-500 dark:text-blue-400" />}
                label="TodoWrite"
              />
            )
          }
          
          if (message.includes('Task:')) {
            return (
              <CollapseToolAction
                key={index}
                icon={<Wrench className="h-3 w-3 text-purple-500 dark:text-purple-400" />}
                title="Task"
              />
            )
          }
          
          if (message.includes('Read:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<FileText className="h-3 w-3 text-blue-500 dark:text-blue-400" />}
                label="Read"
              />
            )
          }
          
          if (message.includes('Write:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Edit3 className="h-3 w-3 text-green-500 dark:text-green-400" />}
                label="Write"
              />
            )
          }
          
          if (message.includes('Bash:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Code className="h-3 w-3 text-gray-600 dark:text-gray-400" />}
                label="Bash"
              />
            )
          }
          
          if (message.includes('List:') || message.includes('LS:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<FolderOpen className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />}
                label="List"
              />
            )
          }
          
          if (message.includes('Search:') || message.includes('Find:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Search className="h-3 w-3 text-purple-500 dark:text-purple-400" />}
                label="Search"
              />
            )
          }
          
          if (message.includes('Grep:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Search className="h-3 w-3 text-purple-500 dark:text-purple-400" />}
                label="Grep"
              />
            )
          }
          
          return (
            <TreeToolAction
              key={index}
              event={event}
              icon={<Wrench className="h-3 w-3 text-gray-500 dark:text-gray-400" />}
              label="Tool"
            />
          )
        }
        
        return (
          <div key={index} className="py-2 px-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-start gap-2">
              <span className="text-sm">{event.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 dark:text-gray-200 break-words max-w-full overflow-hidden">
                  {event.message}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 

export function ClaudeCodeChatBlock({ block }: { block: ToolBlock }) {
  const { args, logs = [], currentStatus } = block.data
  const isExecuting = block.status === 'executing'
  const logsContainerRef = useRef<HTMLDivElement>(null)
  
  const getStatusText = () => {
    if (currentStatus) {
      return currentStatus
    }
    
    const featureName = args?.feature_name
    if (featureName) {
      return isExecuting ? `${featureName}: Processing request...` : `${featureName}: Ready`
    }
    
    return isExecuting ? 'Processing request...' : 'Ready'
  }

  useEffect(() => {
    if (logsContainerRef.current && logs.length > 0) {
      const container = logsContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }, [logs])

  return (
    <div className="bg-muted/30 rounded-md p-3 space-y-2 border border-border/50">
      <div className="flex items-center gap-2">
        {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Code className="h-3 w-3" />}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      
      {logs && logs.length > 0 ? (
        <div 
          ref={logsContainerRef}
          className="space-y-1 max-h-32 overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {logs.map((line: string, idx: number) => (
            <div key={idx} className="flex gap-2 text-xs font-mono">
              <span className="text-muted-foreground shrink-0">{line.slice(0,2)}</span>
              <span className="break-all">{line.slice(2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-xs">
          {isExecuting ? 'Initializing...' : 'No logs available'}
        </div>
      )}
    </div>
  )
}

toolRegistry.register('claude-code', ClaudeCodeChatBlock) 