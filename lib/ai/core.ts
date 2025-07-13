interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  success: boolean
  content?: string
  error?: string
}

interface StoredApiKeys {
  anthropicApiKey?: string
}

export async function llmCall(messages: LLMMessage[], model: string = 'anthropic/claude-3.5-sonnet', storedKeys: StoredApiKeys = {}): Promise<LLMResponse> {
  try {
    const apiKey = storedKeys.anthropicApiKey
    
    if (!apiKey) {
      throw new Error('Anthropic API key not found. Please configure it in Settings.')
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.replace('anthropic/', ''),
        max_tokens: 2048,
        messages
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API Error: ${response.status}`)
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


