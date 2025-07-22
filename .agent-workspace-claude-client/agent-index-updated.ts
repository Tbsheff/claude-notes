import { streamText } from 'ai'
import { anthropic, createAnthropic } from '@ai-sdk/anthropic'
import { createClaudeCodeTool } from '../tools/claude-code'
import { createDocumentEditorTool } from '../tools/document-editor'
import { AgentPrompt } from './prompt'
import { getErrorMessage } from './error-handler'
import { logger } from '../logger'
import { authService } from '../../electron/services/auth-service'
import type { TokenSet } from '../auth/claude'

// Cache for anthropic provider instance
let anthropicProvider: any = null
let lastAuthType: 'oauth' | 'api-key' | null = null

/**
 * Get or create Anthropic provider with the correct authentication
 */
async function getAnthropicProvider() {
  // Check current auth type
  let currentAuthType: 'oauth' | 'api-key' | null = null
  let authHeaders: Record<string, string> = {}
  
  // Try OAuth first
  try {
    const tokens: TokenSet | null = await authService.getTokens()
    if (tokens?.access_token) {
      currentAuthType = 'oauth'
      authHeaders = {
        'Authorization': `Bearer ${tokens.access_token}`
      }
      logger.agent('Using OAuth Bearer token for agent')
    }
  } catch (error) {
    // No OAuth tokens available
  }
  
  // Fall back to API key
  if (!currentAuthType && process.env.ANTHROPIC_API_KEY) {
    currentAuthType = 'api-key'
    logger.agent('Using API key for agent')
  }
  
  // Create new provider if auth type changed or no provider exists
  if (!anthropicProvider || currentAuthType !== lastAuthType) {
    if (currentAuthType === 'oauth') {
      // Create custom provider with Bearer token
      anthropicProvider = createAnthropic({
        headers: authHeaders,
        // Override the default auth behavior
        apiKey: 'dummy', // SDK requires this but we'll use headers instead
      })
    } else if (currentAuthType === 'api-key') {
      // Use default provider which reads from ANTHROPIC_API_KEY env
      anthropicProvider = anthropic
    } else {
      throw new Error('No valid authentication available for agent')
    }
    
    lastAuthType = currentAuthType
  }
  
  return anthropicProvider
}

export async function createAgentStream(messages: any[], options: { noteId?: string, noteContent?: string, mainWindow?: any } = {}) {
  const tools: any = {
    'claude-code': createClaudeCodeTool(options.mainWindow),
    'document-editor': createDocumentEditorTool({ 
      noteId: options.noteId || '',
      noteContent: options.noteContent || ''
    })
  }

  const filteredMessages = messages.filter(msg => 
    msg && msg.content && msg.content.trim() !== ''
  )

  const lastUserMessage = filteredMessages[filteredMessages.length - 1]?.content || 'No message'
  logger.agent(`Stream started: "${lastUserMessage}"`)

  try {
    // Get the appropriate provider
    const provider = await getAnthropicProvider()
    
    return streamText({
      model: provider('claude-3-5-sonnet-20241022'),
      system: AgentPrompt,
      messages: filteredMessages,
      toolCallStreaming: true,
      tools,
      maxSteps: 15,
      onError: (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error)
        logger.agent(`ERROR: ${errorMsg}`)
        
        if (options.mainWindow) {
          const friendlyMessage = getErrorMessage(error)
          options.mainWindow.webContents.send('ai-stream-error', { 
            error: errorMsg,
            friendlyMessage,
            timestamp: new Date().toISOString()
          })
        }
      },
      ...options
    })
  } catch (error) {
    logger.agent(`Failed to create stream: ${error}`)
    throw error
  }
}

/**
 * Force refresh the provider (useful when auth changes)
 */
export function refreshProvider() {
  anthropicProvider = null
  lastAuthType = null
  logger.agent('Anthropic provider cache cleared')
}

export * from './types'
export * from './part-processor'