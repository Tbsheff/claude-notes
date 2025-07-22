export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  success: boolean
  content?: string
  error?: string
}

export interface StoredApiKeys {
  anthropicApiKey?: string
} 