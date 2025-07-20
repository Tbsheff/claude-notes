import type { LLMMessage, LLMResponse, StoredApiKeys } from './types'
import { logger } from '../logger'

export async function llmCall(
  messages: LLMMessage[],
  model: string = 'anthropic/claude-3-5-sonnet-20241022',
  storedKeys: StoredApiKeys = {}
): Promise<LLMResponse> {
  try {
    const apiKey = storedKeys.anthropicApiKey

    if (!apiKey) {
      logger.llm('ERROR: API key missing')
      throw new Error('Anthropic API key not found. Please configure it in Settings.')
    }

    const systemMessage = messages.find(msg => msg.role === 'system')
    const userMessages = messages.filter(msg => msg.role !== 'system')
    
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || 'No content'
    logger.llm(`→ ${model}: "${lastUserMessage.slice(0, 100)}..."`)
    
    const requestBody: any = {
      model: model.replace('anthropic/', ''),
      max_tokens: 2048,
      messages: userMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    }
    
    if (systemMessage) {
      requestBody.system = systemMessage.content
    }
    

    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.llm(`API Error ${response.status}: ${errorText.slice(0, 200)}`)
      throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text

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