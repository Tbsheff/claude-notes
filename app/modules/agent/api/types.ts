import React from 'react'
import { ClaudeEvent } from '@/lib/agent/types'
import { cleanWorkspacePath, getFileName, getDirName, truncateCommand } from '@/lib/agent/logger'

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
      const cleanContent = cleanWorkspacePath(content)
      return `Executed ${truncateCommand(cleanContent)}`
    case 'List':
      return `Listed ${getDirName(content)}`
    case 'Search':
    case 'Find':
      return 'Searched files'
    case 'Tool':
      if (content.includes('Grep:')) {
        return 'Searched files'
      }
      return truncateCommand(content)
    case 'Grep':
      return 'Searched files'
    default:
      return label
  }
}

 