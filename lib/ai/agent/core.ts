import { query, type SDKMessage } from '@anthropic-ai/claude-code'
import { AgentConfig, AgentResponse, WorkspaceConfig, WorkspaceResult } from './types'
import { MAIN_SYSTEM_PROMPT, createWorkspacePrompt } from './main-prompt'
import { ClaudeCodeLogger, getQueryOptions } from './utils'
import { WorkspaceManager } from '../workspace/manager'
import { Validator } from '../workspace/validator'

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

  private async processMessages(queryOptions: any): Promise<SDKMessage[]> {
    const messages: SDKMessage[] = []
    
    for await (const msg of query(queryOptions)) {
      ClaudeCodeLogger.logMessage(msg)
      messages.push(msg)
    }
    
    return messages
  }

  private extractResponse(messages: SDKMessage[]): string {
    const resultMessage = messages.find((msg: SDKMessage) => msg.type === 'result')
    return (resultMessage?.type === 'result' && resultMessage.subtype === 'success') 
      ? resultMessage.result 
      : 'Task completed'
  }

  async processRequest(
    prompt: string, 
    workspaceConfig: WorkspaceConfig
  ): Promise<AgentResponse & { workspaceResult?: WorkspaceResult }> {
    const manager = new WorkspaceManager(workspaceConfig, this.config.cwd || process.cwd())
    let workspaceResult: WorkspaceResult | undefined

    try {
      if (!this.initialized) {
        throw new Error('Agent not initialized. Call initialize() first.')
      }

      console.log('🚀 Starting workspace-isolated AI processing...')

      workspaceResult = await manager.create()
      if (!workspaceResult.success) {
        throw new Error(`Failed to create workspace: ${workspaceResult.error}`)
      }

      console.log('📁 Workspace created at:', workspaceResult.workspacePath)
      ClaudeCodeLogger.logStart()

      const workspacePrompt = createWorkspacePrompt(workspaceResult.workspacePath!)

      const messages = await this.processMessages({
        prompt,
        abortController: new AbortController(),
        options: getQueryOptions(this.config, workspaceResult.workspacePath!, workspacePrompt)
      })

      if (workspaceConfig.validateAfter) {
        console.log('🔍 Validating workspace changes...')
        const validator = new Validator(workspaceResult.workspacePath!, workspaceConfig.timeoutMs)
        const validationResult = await validator.validate()
        
        workspaceResult.validationResult = validationResult
        
        if (!validationResult.success) {
          console.log('❌ Validation failed - changes will NOT be applied to main project')
          console.log('🔍 Validation error:', validationResult.error)
          throw new Error(`Validation failed: ${validationResult.error}`)
        }
        
        console.log('✅ Validation passed - safe to apply changes!')
      }

      console.log('📋 Applying changes to main codebase...')
      await manager.applyChanges()

      const response = this.extractResponse(messages)
      
      console.log('✅ Workspace processing completed successfully!')
      ClaudeCodeLogger.logComplete()
      
      return { 
        success: true, 
        response,
        workspaceResult
      }

    } catch (error) {
      ClaudeCodeLogger.logError(error)
      console.log('❌ Workspace processing failed:', error)
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        workspaceResult
      }
    } finally {
      if (workspaceResult?.workspacePath) {
        console.log('🧹 Cleaning up workspace...')
        await manager.cleanup()
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