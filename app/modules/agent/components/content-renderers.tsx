import React from 'react'
import { extractJSONFromMessage } from '@/app/modules/agent/utils'
import { ContentRendererProps, TodoItem, TodoData, TaskData } from '@/app/modules/agent/api/types'

export const TodoWriteContent = ({ message }: ContentRendererProps) => {
  const json = extractJSONFromMessage(message)
  
  if (!json) {
    return <div className="text-xs font-mono text-gray-600 break-words max-w-full overflow-hidden">{message}</div>
  }
  
  let todos: TodoItem[] = []
  
  if (Array.isArray(json)) {
    todos = json.filter(item => item.content)
  } else if (json.todos && Array.isArray(json.todos)) {
    todos = json.todos
  } else if (json.content) {
    todos = [json]
  }
  
  if (todos.length === 0) {
    return <div className="text-xs font-mono text-gray-600 break-words max-w-full overflow-hidden">{message}</div>
  }
  
  return (
    <div className="space-y-2">
      {todos.map((todo: TodoItem, i: number) => (
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

export const TaskContent = ({ message }: ContentRendererProps) => {
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