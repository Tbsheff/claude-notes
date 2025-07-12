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
  workspaceConfig?: WorkspaceConfig
}

export interface WorkspaceConfig {
  enabled: boolean
  workspaceDir: string
  blacklistedPaths: string[]
  timeoutMs?: number
  validateAfter?: boolean
}

export interface WorkspaceResult {
  success: boolean
  workspacePath?: string
  error?: string
  validationResult?: ValidationResult
}

export interface ValidationResult {
  success: boolean
  tsCheck?: boolean
  eslintCheck?: boolean
  buildCheck?: boolean
  error?: string
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

export interface ClaudeEvent {
  type: 'assistant_message' | 'tool_action' | 'tool_result' | 'start' | 'complete' | 'error'
  message: string
  icon?: string
  timestamp: number
  tool_use_id?: string
  is_error?: boolean
} 