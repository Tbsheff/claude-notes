import { FileText, Edit3, Search, FolderOpen, Code, Wrench, CheckSquare } from 'lucide-react'
import { AgentLogToolsViewProps } from '@/app/modules/agent/api/types'
import { TreeToolAction, CollapseToolAction } from './tool-actions'

export function ClaudeCodeToolView({ events }: AgentLogToolsViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
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
              <div className="text-sm text-foreground">
                {event.message.replace('Agent: ', '')}
              </div>
            </div>
          )
        }
        
        if (event.type === 'tool_result') {
          return null 
        }
        
        if (event.type === 'tool_action') {
          const message = event.message
          
          if (message.includes('Edit:')) {
            const filePath = message.replace('Edit: ', '')
            const fileName = filePath.split('/').pop() || filePath
            
            return (
              <CollapseToolAction
                key={index}
                icon={<Edit3 className="h-3 w-3 text-orange-500" />}
                title={`Modified ${fileName}`}
              />
            )
          }
          
          if (message.includes('TodoWrite:')) {
            return (
              <CollapseToolAction
                key={index}
                icon={<CheckSquare className="h-3 w-3 text-blue-500" />}
                title="Writing Tasks"
              />
            )
          }
          
          if (message.includes('Task:')) {
            return (
              <CollapseToolAction
                key={index}
                icon={<Wrench className="h-3 w-3 text-purple-500" />}
                title="Task"
              />
            )
          }
          
          if (message.includes('Read:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<FileText className="h-3 w-3 text-blue-500" />}
                label="Read"
              />
            )
          }
          
          if (message.includes('Write:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Edit3 className="h-3 w-3 text-green-500" />}
                label="Write"
              />
            )
          }
          
          if (message.includes('Bash:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Code className="h-3 w-3 text-gray-600" />}
                label="Bash"
              />
            )
          }
          
          if (message.includes('List:') || message.includes('LS:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<FolderOpen className="h-3 w-3 text-yellow-600" />}
                label="List"
              />
            )
          }
          
          if (message.includes('Search:') || message.includes('Find:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Search className="h-3 w-3 text-purple-500" />}
                label="Search"
              />
            )
          }
          
          if (message.includes('Grep:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                icon={<Search className="h-3 w-3 text-purple-500" />}
                label="Grep"
              />
            )
          }
          
          return (
            <TreeToolAction
              key={index}
              event={event}
              icon={<Wrench className="h-3 w-3 text-gray-500" />}
              label="Tool"
            />
          )
        }
        
        return (
          <div key={index} className="py-2 px-3 border-b border-gray-100 last:border-0">
            <div className="flex items-start gap-2">
              <span className="text-sm">{event.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 break-words max-w-full overflow-hidden">
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