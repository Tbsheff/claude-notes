import type { SDKMessage } from '@anthropic-ai/claude-code'

export type { SDKMessage } from '@anthropic-ai/claude-code'

export interface AgentConfig {
  apiKey?: string
  maxTurns?: number
  cwd?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  customSystemPrompt?: string
  appendSystemPrompt?: string
}

export interface AgentResponse {
  success: boolean
  response?: string
  error?: string
}

export interface AgentRequest {
  prompt: string
  options?: {
    maxTurns?: number
    cwd?: string
    allowedTools?: string[]
    disallowedTools?: string[]
    permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
    customSystemPrompt?: string
    appendSystemPrompt?: string
  }
}

export type QueryFunction = (props: AgentRequest) => AsyncGenerator<SDKMessage> 