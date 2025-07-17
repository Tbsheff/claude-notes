import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      schema: z.object({
        title: z.string().describe('A short, descriptive title for the chat (3-5 words).')
      }),
      prompt: `Summarize the following user message into a short, descriptive chat title (3-5 words): "${userMessage}"`
    })
    return object.title
  } catch (error) {
    console.error('Error generating chat title:', error)
    return 'New Chat'
  }
} 