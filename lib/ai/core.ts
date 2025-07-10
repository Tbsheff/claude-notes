interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  success: boolean
  content?: string
  error?: string
}

export async function llmCall(messages: LLMMessage[], model: string = 'anthropic/claude-3.5-sonnet'): Promise<LLMResponse> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    return { success: true, content }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}
