import type { LLMMessage, LLMResponse, StoredApiKeys } from './types'

export async function llmCall(
  messages: LLMMessage[],
  model: string = 'anthropic/claude-3-5-sonnet-20241022',
  storedKeys: StoredApiKeys = {}
): Promise<LLMResponse> {
  try {
    const apiKey = storedKeys.anthropicApiKey

    if (!apiKey) {
      throw new Error('Anthropic API key not found. Please configure it in Settings.')
    }

    const systemMessage = messages.find(msg => msg.role === 'system')
    const userMessages = messages.filter(msg => msg.role !== 'system')
    
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
      throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text

    return { success: true, content }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
} 