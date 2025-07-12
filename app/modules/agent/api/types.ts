import { ClaudeEvent } from '@/lib/ai/agent/types'

export interface AgentLogToolsViewProps {
  events: ClaudeEvent[]
}

export interface AgentMessageProps {
  event: ClaudeEvent
}

export interface TreeToolActionProps {
  event: ClaudeEvent
  icon: React.ReactNode
  label: string
  toolResults: Record<string, ClaudeEvent>
}

export interface CollapseToolActionProps {
  event: ClaudeEvent
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

export interface ContentRendererProps {
  message: string
}

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'high' | 'medium' | 'low'
  id?: string
}

export interface TodoData {
  todos: TodoItem[]
  merge?: boolean
}

export interface TaskData {
  description?: string
  prompt?: string
  path?: string
  [key: string]: any
} 