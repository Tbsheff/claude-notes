import type { LLMMessage, LLMResponse, StoredApiKeys } from './types'
import { ClaudeClient, type CreateMessageRequest } from './claude-client'
import { logger } from '../logger'
import { authService } from '../../electron/services/auth-service'

// Singleton client instance
let claudeClient: ClaudeClient | null = null

/**
 * Get or create Claude client instance
 */
async function getClaudeClient(storedKeys: StoredApiKeys = {}): Promise<ClaudeClient> {
  if (!claudeClient) {
    // Try to get OAuth tokens first
    let oauthTokens = null
    try {
      oauthTokens = await authService.getTokens()
    } catch (error) {
      logger.llm('Failed to retrieve OAuth tokens, will use API key if available')
    }

    claudeClient = new ClaudeClient({
      apiKey: storedKeys.anthropicApiKey,
      oauthTokens: oauthTokens || undefined,
      onTokenRefresh: async (tokens) => {
        // Persist refreshed tokens
        try {
          await authService.storeTokens(tokens)
          logger.llm('Refreshed tokens stored successfully')
        } catch (error) {
          logger.llm(`Failed to store refreshed tokens: ${error}`)
        }
      }
    })
  } else {
    // Update auth if needed
    claudeClient.updateAuth({
      apiKey: storedKeys.anthropicApiKey
    })
  }

  return claudeClient
}

/**
 * Updated llmCall function using ClaudeClient
 */
export async function llmCall(
  messages: LLMMessage[],
  model: string = 'anthropic/claude-3-5-sonnet-20241022',
  storedKeys: StoredApiKeys = {}
): Promise<LLMResponse> {
  try {
    const client = await getClaudeClient(storedKeys)
    
    // Check if we have valid authentication
    if (!client.hasValidAuth()) {
      const authType = client.getAuthType()
      logger.llm(`ERROR: No valid authentication (current: ${authType})`)
      throw new Error('No valid authentication found. Please configure API key in Settings or login with OAuth.')
    }

    const systemMessage = messages.find(msg => msg.role === 'system')
    const userMessages = messages.filter(msg => msg.role !== 'system')
    
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || 'No content'
    logger.llm(`→ ${model}: "${lastUserMessage}" (auth: ${client.getAuthType()})`)
    
    const request: CreateMessageRequest = {
      model: model,
      max_tokens: 2048,
      messages: userMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    }
    
    if (systemMessage) {
      request.system = systemMessage.content
    }
    
    const response = await client.createMessage(request)
    const content = response.content?.[0]?.text

    logger.llm(`← Response: "${content || 'Empty'}"`)
    return { success: true, content }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.llm(`ERROR: ${errorMsg}`)
    return {
      success: false,
      error: errorMsg
    }
  }
}

/**
 * Streaming version of llmCall using ClaudeClient
 */
export async function* llmCallStream(
  messages: LLMMessage[],
  model: string = 'anthropic/claude-3-5-sonnet-20241022',
  storedKeys: StoredApiKeys = {}
): AsyncGenerator<string, void, unknown> {
  const client = await getClaudeClient(storedKeys)
  
  if (!client.hasValidAuth()) {
    throw new Error('No valid authentication found. Please configure API key in Settings or login with OAuth.')
  }

  const systemMessage = messages.find(msg => msg.role === 'system')
  const userMessages = messages.filter(msg => msg.role !== 'system')
  
  logger.llm(`→ Stream ${model} (auth: ${client.getAuthType()})`)
  
  const request: CreateMessageRequest = {
    model: model,
    max_tokens: 2048,
    messages: userMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    stream: true
  }
  
  if (systemMessage) {
    request.system = systemMessage.content
  }
  
  yield* client.createMessageStream(request)
}

/**
 * Force update authentication (useful when settings change)
 */
export async function updateAuthentication(storedKeys?: StoredApiKeys) {
  if (!claudeClient) {
    await getClaudeClient(storedKeys)
    return
  }

  // Try to get latest OAuth tokens
  let oauthTokens = null
  try {
    oauthTokens = await authService.getTokens()
  } catch (error) {
    logger.llm('No OAuth tokens available')
  }

  claudeClient.updateAuth({
    apiKey: storedKeys?.anthropicApiKey,
    oauthTokens: oauthTokens || undefined
  })
  
  logger.llm(`Authentication updated (type: ${claudeClient.getAuthType()})`)
}

/**
 * Get current authentication status
 */
export async function getAuthStatus(): Promise<{
  hasAuth: boolean
  authType: 'oauth' | 'api-key' | 'none'
}> {
  const client = await getClaudeClient()
  return {
    hasAuth: client.hasValidAuth(),
    authType: client.getAuthType()
  }
}