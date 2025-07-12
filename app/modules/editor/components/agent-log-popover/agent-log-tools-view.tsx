import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Edit3, Search, FolderOpen, Terminal, Wrench, CheckSquare, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
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

const AgentMessage = ({ event, formatTime }: { event: ClaudeEvent, formatTime: (timestamp: number) => string }) => {
  const message = event.message.replace('Agent: ', '')
  
  return (
    <div className="py-2 px-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800 break-words leading-relaxed whitespace-pre-wrap max-w-full overflow-hidden">
            {message}
          </div>
        </div>
      </div>
    </div>
  )
}

const TreeToolAction = ({ event, formatTime, icon, label, toolResults }: { 
  event: ClaudeEvent, 
  formatTime: (timestamp: number) => string,
  icon: React.ReactNode,
  label: string,
  toolResults: Record<string, ClaudeEvent>
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const content = event.message.replace(`${label}: `, '')
  const result = event.tool_use_id ? toolResults[event.tool_use_id] : null
  const hasResult = !!result
  
  // Краткие названия как в Cursor
  const getShortLabel = (label: string, content: string) => {
    const getFileName = (path: string) => {
      // Берем последнюю часть пути после /
      const parts = path.trim().split('/')
      return parts[parts.length - 1] || path
    }
    
    switch (label) {
      case 'Read':
        return `Read ${getFileName(content)}`
      case 'Write':
        return `Created ${getFileName(content)}`
      case 'Edit':
        return `Modified ${getFileName(content)}`
      case 'Bash':
        return `Executed ${content}` 
      case 'List':
        return `Listed ${getFileName(content) || 'directory'}`
      case 'Search':
      case 'Find':
        return 'Searched files'
      case 'Tool':
        if (content.includes('Grep:')) {
          return 'Searched files'
        }
        return content
      case 'Grep':
        return 'Searched files'
      default:
        return label
    }
  }
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className={`px-3 py-1.5 flex items-center gap-2 text-sm ${hasResult ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
        onClick={() => hasResult && setIsExpanded(!isExpanded)}
      >
        {hasResult ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )
        ) : (
          <div className="w-3 h-3 flex-shrink-0" />
        )}
        <div className="h-3 w-3 flex-shrink-0">{icon}</div>
        <span className="text-gray-700 text-sm">{getShortLabel(label, content)}</span>
      </div>
      
      {isExpanded && (
        <div className="px-6 pb-2 bg-gray-50">
          <div className="text-xs text-gray-600 font-mono mb-2">{content}</div>
          {result && (
            <div className="flex items-start gap-2">
              {result.is_error ? (
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 font-mono break-words max-w-full overflow-hidden whitespace-pre-wrap">
                  {result.message}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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
    return <div className="text-xs font-mono text-gray-600 break-words max-w-full overflow-hidden">{message}</div>
  }
  
  return (
    <div className="space-y-2">
      {json.todos.map((todo: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            todo.status === 'completed' ? 'bg-green-500' :
            todo.status === 'in_progress' ? 'bg-blue-500' :
            'bg-gray-300'
          }`} />
          <div className="flex-1 min-w-0">
            <div className={`break-words max-w-full overflow-hidden ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
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
    return <div className="text-xs font-mono text-gray-600 break-words max-w-full overflow-hidden">{message}</div>
  }
  
  return (
    <div className="space-y-2 text-xs">
      {json.description && (
        <div>
          <span className="font-medium text-gray-700">Description:</span>
          <div className="text-gray-600 mt-1 break-words max-w-full overflow-hidden">{json.description}</div>
        </div>
      )}
      {json.prompt && (
        <div>
          <span className="font-medium text-gray-700">Prompt:</span>
          <div className="text-gray-600 mt-1 break-words max-w-full overflow-hidden">{json.prompt}</div>
        </div>
      )}
      {json.path && (
        <div>
          <span className="font-medium text-gray-700">Path:</span>
          <div className="text-gray-600 mt-1 font-mono break-all max-w-full overflow-hidden">{json.path}</div>
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

  const toolResults = events
    .filter(e => e.type === 'tool_result')
    .reduce((acc, event) => {
      if (event.tool_use_id) {
        acc[event.tool_use_id] = event
      }
      return acc
    }, {} as Record<string, ClaudeEvent>)

  return (
    <div className="max-h-96 overflow-y-auto">
      {events.map((event, index) => {
        if (event.type === 'assistant_message') {
          return <AgentMessage key={index} event={event} formatTime={formatTime} />
        }
        
        if (event.type === 'tool_result') {
          return null 
        }
        
        if (event.type === 'tool_action') {
          const message = event.message
          
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
                <div className="text-xs font-mono text-gray-600 break-all max-w-full overflow-hidden">{filePath}</div>
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
          
          if (message.includes('Read:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<FileText className="h-3 w-3 text-blue-500" />}
                label="Read"
                toolResults={toolResults}
              />
            )
          }
          
          if (message.includes('Write:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Edit3 className="h-3 w-3 text-green-500" />}
                label="Write"
                toolResults={toolResults}
              />
            )
          }
          
          if (message.includes('Bash:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Terminal className="h-3 w-3 text-gray-600" />}
                label="Bash"
                toolResults={toolResults}
              />
            )
          }
          
          if (message.includes('List:') || message.includes('LS:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<FolderOpen className="h-3 w-3 text-yellow-600" />}
                label="List"
                toolResults={toolResults}
              />
            )
          }
          
          if (message.includes('Search:') || message.includes('Find:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Search className="h-3 w-3 text-purple-500" />}
                label="Search"
                toolResults={toolResults}
              />
            )
          }
          
          if (message.includes('Grep:')) {
            return (
              <TreeToolAction
                key={index}
                event={event}
                formatTime={formatTime}
                icon={<Search className="h-3 w-3 text-purple-500" />}
                label="Grep"
                toolResults={toolResults}
              />
            )
          }
          
          return (
            <TreeToolAction
              key={index}
              event={event}
              formatTime={formatTime}
              icon={<Wrench className="h-3 w-3 text-gray-500" />}
              label="Tool"
              toolResults={toolResults}
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
