import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Edit3, Search, FolderOpen, Terminal, Wrench, CheckSquare } from 'lucide-react'
import { ClaudeEvent } from '@/lib/ai/agent/types'

interface AgentLogToolsViewProps {
  events: ClaudeEvent[]
  formatTime: (timestamp: number) => string
}

const parseJSON = (str: string) => {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

const extractJSONFromMessage = (message: string) => {
  const match = message.match(/:\s*(\{.*\})$/)
  return match ? parseJSON(match[1]) : null
}

const AgentMessage = ({ event, formatTime }: { event: ClaudeEvent, formatTime: (timestamp: number) => string }) => (
  <div className="py-2 px-3 border-b border-gray-100 last:border-0">
    <div className="flex items-start gap-2">
      <span className="text-sm">💭</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800 break-words leading-relaxed">
          {event.message.replace('Agent: ', '')}
        </div>
        <div className="text-xs text-gray-400 mt-1 font-mono">
          {formatTime(event.timestamp)}
        </div>
      </div>
    </div>
  </div>
)

const SimpleToolAction = ({ event, formatTime, icon, label }: { 
  event: ClaudeEvent, 
  formatTime: (timestamp: number) => string,
  icon: React.ReactNode,
  label: string
}) => {
  const content = event.message.replace(`${label}: `, '')
  
  return (
    <div className="py-2 px-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-2">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
          <div className="text-sm text-gray-800 break-all font-mono">
            {content}
          </div>
          <div className="text-xs text-gray-400 mt-1 font-mono">
            {formatTime(event.timestamp)}
          </div>
        </div>
      </div>
    </div>
  )
}

const CollapseToolAction = ({ event, formatTime, icon, title, children }: {
  event: ClaudeEvent,
  formatTime: (timestamp: number) => string,
  icon: React.ReactNode,
  title: string,
  children: React.ReactNode
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className="py-2 px-3 flex items-center gap-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-gray-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-400" />
        )}
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800">{title}</div>
          <div className="text-xs text-gray-400 font-mono">
            {formatTime(event.timestamp)}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="pb-3 px-8">
          {children}
        </div>
      )}
    </div>
  )
}

const TodoWriteContent = ({ message }: { message: string }) => {
  const json = extractJSONFromMessage(message)
  if (!json || !json.todos) {
    return <div className="text-xs font-mono text-gray-600">{message}</div>
  }
  
  return (
    <div className="space-y-2">
      {json.todos.map((todo: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full mt-1.5 ${
            todo.status === 'completed' ? 'bg-green-500' :
            todo.status === 'in_progress' ? 'bg-blue-500' :
            'bg-gray-300'
          }`} />
          <div className="flex-1">
            <div className={`${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
              {todo.content}
            </div>
            {todo.priority && (
              <div className={`text-xs mt-0.5 ${
                todo.priority === 'high' ? 'text-red-600' :
                todo.priority === 'medium' ? 'text-yellow-600' :
                'text-gray-500'
              }`}>
                {todo.priority} priority
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const TaskContent = ({ message }: { message: string }) => {
  const json = extractJSONFromMessage(message)
  if (!json) {
    return <div className="text-xs font-mono text-gray-600 break-words">{message}</div>
  }
  
  return (
    <div className="space-y-2 text-xs">
      {json.description && (
        <div>
          <span className="font-medium text-gray-700">Description:</span>
          <div className="text-gray-600 mt-1">{json.description}</div>
        </div>
      )}
      {json.prompt && (
        <div>
          <span className="font-medium text-gray-700">Prompt:</span>
          <div className="text-gray-600 mt-1 break-words">{json.prompt}</div>
        </div>
      )}
      {json.path && (
        <div>
          <span className="font-medium text-gray-700">Path:</span>
          <div className="text-gray-600 mt-1 font-mono">{json.path}</div>
        </div>
      )}
    </div>
  )
}

export function AgentLogToolsView({ events, formatTime }: AgentLogToolsViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <div className="text-sm">No activity yet</div>
      </div>
    )
  }

  return (
    <div>
      {events.map((event, index) => {
        if (event.type === 'assistant_message') {
          return <AgentMessage key={index} event={event} formatTime={formatTime} />
        }
        
        if (event.type === 'tool_action') {
          const message = event.message
          
          // Edit actions - collapse
          if (message.includes('Edit:')) {
            const filePath = message.replace('Edit: ', '')
            return (
              <CollapseToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Edit3 className="h-3 w-3 text-orange-500" />}
                title={`Editing File ${filePath.split('/').pop()}`}
              >
                <div className="text-xs font-mono text-gray-600 break-all">{filePath}</div>
              </CollapseToolAction>
            )
          }
          
          // TodoWrite - collapse with formatted tasks
          if (message.includes('TodoWrite:')) {
            return (
              <CollapseToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<CheckSquare className="h-3 w-3 text-blue-500" />}
                title="Writing Tasks"
              >
                <TodoWriteContent message={message} />
              </CollapseToolAction>
            )
          }
          
          // Task - collapse with formatted content
          if (message.includes('Task:')) {
            return (
              <CollapseToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Wrench className="h-3 w-3 text-purple-500" />}
                title="Task"
              >
                <TaskContent message={message} />
              </CollapseToolAction>
            )
          }
          
          // Simple actions - no collapse
          if (message.includes('Read:')) {
            return (
              <SimpleToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<FileText className="h-3 w-3 text-blue-500" />}
                label="Read"
              />
            )
          }
          
          if (message.includes('Write:')) {
            return (
              <SimpleToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Edit3 className="h-3 w-3 text-green-500" />}
                label="Write"
              />
            )
          }
          
          if (message.includes('Bash:')) {
            return (
              <SimpleToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Terminal className="h-3 w-3 text-gray-600" />}
                label="Bash"
              />
            )
          }
          
          if (message.includes('List:') || message.includes('LS:')) {
            return (
              <SimpleToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<FolderOpen className="h-3 w-3 text-yellow-600" />}
                label="List"
              />
            )
          }
          
          if (message.includes('Search:') || message.includes('Find:')) {
            return (
              <SimpleToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Search className="h-3 w-3 text-purple-500" />}
                label="Search"
              />
            )
          }
          
          // Default tool action
          return (
            <SimpleToolAction
              key={index}
              event={event}
              formatTime={formatTime}
              icon={<Wrench className="h-3 w-3 text-gray-500" />}
              label="Tool"
            />
          )
        }
        
        // Other event types
        return (
          <div key={index} className="py-2 px-3 border-b border-gray-100 last:border-0">
            <div className="flex items-start gap-2">
              <span className="text-sm">{event.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 break-words">
                  {event.message}
                </div>
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  {formatTime(event.timestamp)}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
