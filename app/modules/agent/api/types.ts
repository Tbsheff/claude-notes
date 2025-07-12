import React from 'react'
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
}

export interface CollapseToolActionProps {
  icon: React.ReactNode
  title: string
} 