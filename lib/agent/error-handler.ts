export function getErrorMessage(error: any): string {
  const errorMessage = error?.message || error?.toString() || ''
  
  if (errorMessage.includes('Anthropic API key is missing') || errorMessage.includes('LoadAPIKeyError') || errorMessage.includes('AI_LoadAPIKeyError')) {
    return 'Anthropic API key is missing. Please add your API key in Settings to continue using the AI features.'
  }
  
  if (errorMessage.includes('APICallError') && (errorMessage.includes('not_found_error') || errorMessage.includes('model:') || error?.statusCode === 404)) {
    return 'AI model not found or invalid. Please check your configuration and try again.'
  }
  
  if (errorMessage.includes('can only afford') || errorMessage.includes('requires more credits')) {
    return 'Insufficient credits to continue. Please check your Anthropic account balance and add credits if needed.'
  }
  
  if (errorMessage.includes('maximum context length') || (errorMessage.includes('tokens') && errorMessage.includes('context'))) {
    return 'The conversation has exceeded the maximum context length. Please start a new chat to continue.'
  }
  
  if (errorMessage.includes('rate limit')) {
    return 'Rate limit exceeded. Please wait a moment before trying again.'
  }
  
  if (errorMessage.includes('timeout')) {
    return 'Request timed out. Please try again with a simpler request.'
  }
  
  return 'Something went wrong while processing your request. Please try again.'
} 