import React from 'react'
import { ClaudeEvent } from '@/lib/tools/claude-code/types'
import { cleanWorkspacePath, getFileName, getDirName, truncateCommand } from '@/lib/tools/claude-code/logger'
import { UnifiedMessage } from '@/lib/agent/types'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  parts?: Array<{
    type: string
    text?: string
    toolInvocation?: {
      toolName: string
      toolCallId: string
      state: 'call' | 'result'
      args?: any
      result?: any
    }
  }>
}

export interface AgentChatProps {
  isOpen: boolean
  onToggle: () => void
  currentNote?: {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
  }
}

export interface SessionState {
  sessionId: string | null
  hasFileChanges: boolean
  canContinue: boolean
  messages: ChatMessage[]
}

export interface AgentLogToolsViewProps {
  events: ClaudeEvent[]
}

export interface AgentMessageProps {
  event: ClaudeEvent
}

export interface ChatMessageProps {
  message: UnifiedMessage
}

export interface TreeToolActionProps {
  event: ClaudeEvent
  icon: React.ReactNode
  label: string
}

export interface CollapseToolActionProps {
  icon: React.ReactNode
  title: string
} 

export const getShortLabel = (label: string, content: string) => {
  switch (label) {
    case 'Read':
      return `Read ${getFileName(content)}`
    case 'Write':
      return `Created ${getFileName(content)}`
    case 'Edit':
      return `Modified ${getFileName(content)}`
    case 'Bash':
      return `Run ${truncateCommand(content)}`
    case 'List':
      return `List ${getDirName(content)}`
    case 'Search':
      return `Search ${truncateCommand(content)}`
    case 'Grep':
      return `Grep ${truncateCommand(content)}`
    default:
      return content
  }
}

export const cleanWorkspacePathForDisplay = (path: string) => {
  return cleanWorkspacePath(path)
}

 