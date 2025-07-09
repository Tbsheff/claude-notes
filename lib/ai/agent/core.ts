import { query, type SDKMessage } from '@anthropic-ai/claude-code'
import { AgentConfig, AgentResponse } from './types'
import { MAIN_SYSTEM_PROMPT } from '../prompts/main-prompt'
import { ClaudeCodeLogger } from './utils'

export class ClaudeCodeAgent {
  private config: AgentConfig
  private initialized = false

  constructor(config: AgentConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    if (this.config.apiKey) {
      process.env.ANTHROPIC_API_KEY = this.config.apiKey
    }

    this.initialized = true
    ClaudeCodeLogger.logReady()
  }

  async processRequest(prompt: string): Promise<AgentResponse> {
    try {
      if (!this.initialized) {
        throw new Error('Agent not initialized. Call initialize() first.')
      }

      ClaudeCodeLogger.logStart()

      const messages: SDKMessage[] = []
      
      for await (const msg of query({
        prompt,
        options: {
          maxTurns: this.config.maxTurns || 50,
          cwd: this.config.cwd || process.cwd(),
          allowedTools: this.config.allowedTools,
          disallowedTools: this.config.disallowedTools,
          permissionMode: this.config.permissionMode || 'acceptEdits',
          customSystemPrompt: this.config.customSystemPrompt || MAIN_SYSTEM_PROMPT,
          appendSystemPrompt: this.config.appendSystemPrompt
        }
      })) {
        ClaudeCodeLogger.logMessage(msg)
        messages.push(msg)
      }
      
      const resultMessage = messages.find((msg: SDKMessage) => msg.type === 'result')
      const response = (resultMessage?.type === 'result' && resultMessage.subtype === 'success') 
        ? resultMessage.result 
        : 'Task completed'
      
      ClaudeCodeLogger.logComplete()
      
      return { success: true, response }
    } catch (error) {
      ClaudeCodeLogger.logError(error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getConfig(): AgentConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
} 