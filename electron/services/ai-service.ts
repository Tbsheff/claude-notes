import path from 'path'
import os from 'os'
import { BrowserWindow } from 'electron'
import { loadSettings } from './settings-service'

let aiAgent: any = null
let _claudeIsWorking = false
let changedFiles = new Set<string>()
let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win
}

export function getChangedFiles() {
  return changedFiles
}

export function getMainWindow() {
  return mainWindow
}

async function getStoredApiKeys() {
  const { settings } = await loadSettings()
  return { anthropicApiKey: settings?.apiKeys?.anthropicApiKey || '' }
}

export async function initializeAI(config: any = {}) {
  const stored = await getStoredApiKeys()
  const apiKey = stored.anthropicApiKey || process.env.ANTHROPIC_API_KEY || config.apiKey
  if (!apiKey) return { success: false, error: 'Anthropic API key not found. Please configure it in Settings.' }
  try {
    const { ClaudeCodeAgent } = await import('../../lib/tools/claude-code/core')
    const projectRoot = path.resolve(__dirname, '../../../')
    aiAgent = new ClaudeCodeAgent({ apiKey })
    await aiAgent.initialize()
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function processRequest(message: string, rebuildCallback: () => void) {
  if (!aiAgent) return { success: false, error: 'AI Agent not initialized' }
  _claudeIsWorking = true
  try {
    const workspaceConfig = {
      enabled: true,
      workspaceDir: path.join(os.tmpdir(), `.agent-workspace-${Date.now()}`),
      blacklistedPaths: [],
      timeoutMs: 120000,
      validateAfter: true,
    }
    const result = await aiAgent.processRequest(message, workspaceConfig)
    _claudeIsWorking = false
    if (result.success) {
      if (result.workspaceResult && result.workspaceResult.changedFilesCount && result.workspaceResult.changedFilesCount > 0) {
        setTimeout(async () => {
          const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
          ClaudeCodeLogger.emitGlobalEvent({ 
            type: 'tool_action', 
            message: 'Rebuilding project...', 
            icon: '●' 
          })
          rebuildCallback()
        }, 500)
      }
      return { success: true, response: result.response, workspaceResult: result.workspaceResult }
    }
    return result
  } catch (e) {
    _claudeIsWorking = false
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function llmCall(messages: any, model: string) {
  try {
    const stored = await getStoredApiKeys()
    const { llmCall } = await import('../../lib/llm/core')
    return await llmCall(messages, model, stored)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function generateTitleForChat(userMessage: string) {
  try {
    const stored = await getStoredApiKeys()
    const messages = [
      { role: 'user' as const, content: `Create a short, descriptive chat title 2-4 words) for this message: "${userMessage}"\n\nIMPORTANT: Return ONLY the title text without quotes, punctuation, or any formatting. Just plain text that summarize intent of the message. Use Title Case (Capital Letters For Each Word). It should be human readble with spaces.` }
    ]
    const { llmCall } = await import('../../lib/llm/core')
    const result = await llmCall(messages, 'anthropic/claude-3-haiku-20240307', stored)
    
    if (result.success && result.content) {
      return { success: true, title: result.content.trim() }
    } else {
      return { success: false, error: result.error || 'Failed to generate title' }
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

let conversationHistories: Record<string, any[]> = {}

export async function createAgentStream(payload: { messages: any[], noteId?: string, noteContent?: string, streamId?: string, chatId?: string }, rebuildCallback?: () => void) {
  const { messages, noteId, noteContent, streamId, chatId } = payload
  try {
    const { createAgentStream: createStream } = await import('../../lib/agent')
    const mainWindow = getMainWindow()

    const currentChatId = chatId || 'default'
    if (!conversationHistories[currentChatId]) {
      conversationHistories[currentChatId] = []
    }
    const conversationHistory = conversationHistories[currentChatId]
    
    const newMessages = messages.filter(msg => 
      !conversationHistory.some(existingMsg => existingMsg.role === msg.role && existingMsg.content === msg.content)
    )
    
    const documentSystemMessage = newMessages.find(msg => msg.id === 'system-document')
    
    if (documentSystemMessage) {
      const existingSystemIndex = conversationHistory.findIndex(msg => msg.role === 'system' && msg.content.includes('Current document content'))
      
      if (existingSystemIndex >= 0) {
          conversationHistory[existingSystemIndex] = { role: 'system', content: documentSystemMessage.content }
      } else {
        conversationHistory.unshift({ role: 'system', content: documentSystemMessage.content })
      }
    }
    
    newMessages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        conversationHistory.push({ role: msg.role, content: msg.content })
      }
    })

    const streamResult = createStream(conversationHistory, { 
      noteId, 
      noteContent,
      mainWindow
    })
    
    const finalStreamId = streamId || `stream-${Date.now()}`
    processStreamChunks(streamResult, finalStreamId, rebuildCallback, currentChatId)
    
    return { success: true, streamId: finalStreamId }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function processStreamChunks(streamResult: any, streamId: string, rebuildCallback?: () => void, chatId?: string) {
  try {
    for await (const chunk of streamResult.fullStream) {
      mainWindow?.webContents.send('ai-stream-part', { streamId, part: chunk })
    }
    
    mainWindow?.webContents.send('ai-stream-complete', { streamId })
    
    const finalResult = await streamResult; 
    if (finalResult.response?.messages && chatId) {
      const currentChatId = chatId || 'default'
      if (!conversationHistories[currentChatId]) {
        conversationHistories[currentChatId] = []
      }
      conversationHistories[currentChatId].push(...finalResult.response.messages)
    }
    
    if (rebuildCallback) {
        setTimeout(() => {
            rebuildCallback()
        }, 500)
    }

  } catch (error) {
    const { getErrorMessage } = await import('../../lib/agent/error-handler')
    const friendlyMessage = getErrorMessage(error)
    mainWindow?.webContents.send('ai-stream-error', { 
      streamId, 
      error: error instanceof Error ? error.message : String(error),
      friendlyMessage
    })
  }
} 