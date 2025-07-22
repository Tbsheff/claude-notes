import type { TokenSet } from '../auth/claude'
import { refreshToken, isTokenExpired } from '../auth/claude'
import { logger } from '../logger'

// API Request/Response interfaces
export interface MessageContent {
  type: 'text'
  text: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | MessageContent[]
}

export interface CreateMessageRequest {
  model: string
  messages: Message[]
  system?: string
  max_tokens?: number
  temperature?: number
  top_p?: number
  top_k?: number
  metadata?: Record<string, any>
  stop_sequences?: string[]
  stream?: boolean
}

export interface CreateMessageResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: MessageContent[]
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ErrorResponse {
  type: 'error'
  error: {
    type: string
    message: string
  }
}

// Client configuration
export interface ClaudeClientConfig {
  apiKey?: string
  oauthTokens?: TokenSet
  baseUrl?: string
  maxRetries?: number
  retryDelay?: number
  onTokenRefresh?: (tokens: TokenSet) => Promise<void>
}

// Re-export types for convenience
export type { TokenSet } from '../auth/claude'

export class ClaudeClient {
  private config: ClaudeClientConfig
  private baseUrl: string
  private maxRetries: number
  private retryDelay: number

  constructor(config: ClaudeClientConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com'
    this.maxRetries = config.maxRetries || 3
    this.retryDelay = config.retryDelay || 1000
  }

  /**
   * Automatically determine which authentication method to use
   */
  private getAuthHeaders(): Record<string, string> {
    const { apiKey, oauthTokens } = this.config

    // Prefer OAuth tokens if available and valid
    if (oauthTokens?.access_token && !isTokenExpired(oauthTokens)) {
      logger.llm('Using OAuth Bearer token for authentication')
      return {
        'Authorization': `Bearer ${oauthTokens.access_token}`
      }
    }

    // Fall back to API key
    if (apiKey) {
      logger.llm('Using API key for authentication')
      return {
        'x-api-key': apiKey
      }
    }

    throw new Error('No valid authentication method available. Please provide either an API key or OAuth tokens.')
  }

  /**
   * Refresh OAuth tokens if available
   */
  private async refreshTokens(): Promise<boolean> {
    const { oauthTokens, onTokenRefresh } = this.config

    if (!oauthTokens?.refresh_token) {
      logger.llm('No refresh token available')
      return false
    }

    try {
      logger.llm('Attempting to refresh OAuth token')
      const newTokens = await refreshToken(oauthTokens.refresh_token)
      
      // Update internal config
      this.config.oauthTokens = newTokens
      
      // Call callback to persist new tokens
      if (onTokenRefresh) {
        await onTokenRefresh(newTokens)
      }
      
      logger.llm('OAuth token refreshed successfully')
      return true
    } catch (error) {
      logger.llm(`Failed to refresh token: ${error}`)
      return false
    }
  }

  /**
   * Make HTTP request with automatic retry and auth handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const authHeaders = this.getAuthHeaders()
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          ...authHeaders,
          ...options.headers
        }
      })

      // Handle successful response
      if (response.ok) {
        return await response.json() as T
      }

      const errorText = await response.text()
      
      // Handle 401 Unauthorized - try token refresh if using OAuth
      if (response.status === 401 && this.config.oauthTokens) {
        logger.llm(`Received 401 error, attempting token refresh (retry ${retryCount + 1}/${this.maxRetries})`)
        
        if (retryCount < this.maxRetries) {
          const refreshed = await this.refreshTokens()
          
          if (refreshed) {
            // Retry with new token
            return this.makeRequest<T>(endpoint, options, retryCount + 1)
          }
        }
      }

      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < this.maxRetries) {
        const retryAfter = response.headers.get('retry-after')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay * (retryCount + 1)
        
        logger.llm(`Rate limited, retrying after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return this.makeRequest<T>(endpoint, options, retryCount + 1)
      }

      // Parse error response if possible
      let errorData: ErrorResponse
      try {
        errorData = JSON.parse(errorText)
      } catch {
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      throw new Error(`API Error ${response.status}: ${errorData.error?.message || errorText}`)
    } catch (error) {
      if (error instanceof Error) {
        logger.llm(`Request failed: ${error.message}`)
        throw error
      }
      throw new Error(`Request failed: ${String(error)}`)
    }
  }

  /**
   * Create a message (chat completion)
   */
  async createMessage(request: CreateMessageRequest): Promise<CreateMessageResponse> {
    logger.llm(`Creating message with model: ${request.model}`)
    
    const body = {
      ...request,
      model: request.model.replace('anthropic/', ''), // Remove prefix if present
    }

    return this.makeRequest<CreateMessageResponse>('/v1/messages', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  /**
   * Create a streaming message (returns async iterator)
   */
  async *createMessageStream(request: CreateMessageRequest): AsyncGenerator<string, void, unknown> {
    logger.llm(`Creating streaming message with model: ${request.model}`)
    
    const body = {
      ...request,
      model: request.model.replace('anthropic/', ''),
      stream: true
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Stream API Error ${response.status}: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body available for streaming')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return
            
            try {
              const event = JSON.parse(data)
              if (event.type === 'content_block_delta' && event.delta?.text) {
                yield event.delta.text
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Update authentication method
   */
  updateAuth(config: Partial<ClaudeClientConfig>) {
    if (config.apiKey !== undefined) {
      this.config.apiKey = config.apiKey
    }
    if (config.oauthTokens !== undefined) {
      this.config.oauthTokens = config.oauthTokens
    }
    if (config.onTokenRefresh !== undefined) {
      this.config.onTokenRefresh = config.onTokenRefresh
    }
  }

  /**
   * Check if client has valid authentication
   */
  hasValidAuth(): boolean {
    const { apiKey, oauthTokens } = this.config
    
    // Check OAuth tokens
    if (oauthTokens?.access_token && !isTokenExpired(oauthTokens)) {
      return true
    }
    
    // Check API key
    if (apiKey) {
      return true
    }
    
    return false
  }

  /**
   * Get current authentication type
   */
  getAuthType(): 'oauth' | 'api-key' | 'none' {
    const { apiKey, oauthTokens } = this.config
    
    if (oauthTokens?.access_token && !isTokenExpired(oauthTokens)) {
      return 'oauth'
    }
    
    if (apiKey) {
      return 'api-key'
    }
    
    return 'none'
  }
}