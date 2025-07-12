import { ClaudeEvent } from '@/lib/ai/agent/types'

export const parseJSON = (str: string) => {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const extractJSONFromMessage = (message: string) => {
  const match = message.match(/:\s*(\[.*\]|\{.*\})$/)
  return match ? parseJSON(match[1]) : null
}

export const getFileName = (path: string) => {
  return path.split('/').pop() || path
}

export const getShortLabel = (label: string, content: string) => {
  switch (label) {
    case 'Read':
      return `Read ${getFileName(content)}`
    case 'Write':
      return `Created ${getFileName(content)}`
    case 'Edit':
      return `Modified ${getFileName(content)}`
    case 'Bash':
      return `Executed ${content}`
    case 'List':
      return `Listed ${getFileName(content) || 'directory'}`
    case 'Search':
    case 'Find':
      return 'Searched files'
    case 'Tool':
      if (content.includes('Grep:')) {
        return 'Searched files'
      }
      return content
    case 'Grep':
      return 'Searched files'
    default:
      return label
  }
}

export const groupToolResults = (events: ClaudeEvent[]) => {
  return events
    .filter(e => e.type === 'tool_result')
    .reduce((acc, event) => {
      if (event.tool_use_id) {
        acc[event.tool_use_id] = event
      }
      return acc
    }, {} as Record<string, ClaudeEvent>)
} 