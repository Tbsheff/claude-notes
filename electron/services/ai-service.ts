import path from 'path'
import os from 'os'
import { BrowserWindow } from 'electron'
import { getSettingsPath } from './note-service'
import { StreamHandler, MessageParser } from '../../lib/agent'

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

async function getStoredApiKeys() {
  try {
    const fs = require('fs')
    const settingsPath = getSettingsPath()
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      return { anthropicApiKey: settings.apiKeys?.anthropicApiKey || '' }
    }
  } catch (e) {
    console.error('Failed to load stored API keys:', e)
  }
  return { anthropicApiKey: '' }
}

export async function initializeAI(config: any = {}) {
  const stored = await getStoredApiKeys()
  const apiKey = stored.anthropicApiKey || process.env.ANTHROPIC_API_KEY || config.apiKey
  if (!apiKey) return { success: false, error: 'Anthropic API key not found. Please configure it in Settings.' }
  try {
    const { ClaudeCodeAgent } = await import('../../lib/tools/claude-code/core')
    const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
    ClaudeCodeLogger.setEventCallback((event) => {
      console.log('[main] claude-event', event)
      mainWindow?.webContents.send('claude-event', event)
    })
    const projectRoot = path.resolve(__dirname, '../../../')
    aiAgent = new ClaudeCodeAgent({ apiKey, cwd: projectRoot })
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
        setTimeout(() => rebuildCallback(), 500)
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

// Store conversation history using AI SDK's response.messages
let conversationHistory: any[] = []

export async function createAgentStream(messages: any[]) {
  try {
    const stored = await getStoredApiKeys()
    const { createAgentStream } = await import('../../lib/agent')

    const userMessages = messages.filter(msg => msg.role === 'user')
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1]
      conversationHistory.push({ role: 'user', content: lastUserMessage.content })
    }
    
    console.log('📋 Conversation history:', JSON.stringify(conversationHistory, null, 2))
    
    const stream = await createAgentStream(conversationHistory, {
      apiKey: stored.anthropicApiKey || process.env.ANTHROPIC_API_KEY
    })
    
    const streamId = `stream-${Date.now()}`
    
    const streamHandler = new StreamHandler({
      onMessageUpdate: (message) => {
        mainWindow?.webContents.send('agent-message-update', { streamId, message })
      },
      onStreamComplete: (message) => {
        mainWindow?.webContents.send('agent-stream-complete', { streamId, message })
      },
      onStreamError: (error) => {
        mainWindow?.webContents.send('agent-stream-error', { streamId, error })
      }
    })

    streamHandler.startStream(streamId)
    
    const logManager = await setupClaudeCodeLogging(streamId, streamHandler)
    
    processStreamChunks(stream, streamHandler, logManager)
    
    return { success: true, streamId }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function setupClaudeCodeLogging(streamId: string, streamHandler: StreamHandler) {
  const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
  const originalCallback = ClaudeCodeLogger.getCurrentEventCallback()
  
  let claudeCodeLogs: string[] = []
  let currentClaudeCodeToolCallId: string | null = null
  
  const claudeCodeLogHandler = (event: any) => {
    if (currentClaudeCodeToolCallId) {
      const logLine = `${event.icon} ${event.message}`
      claudeCodeLogs.push(logLine)
      
      // Отправляем логи через streamHandler
      streamHandler.updateToolLogs(currentClaudeCodeToolCallId, claudeCodeLogs)
      
      // И также через старый механизм для совместимости
      mainWindow?.webContents.send('claude-code-log-update', {
        toolCallId: currentClaudeCodeToolCallId,
        logs: claudeCodeLogs
      })
    }
    
    if (originalCallback) {
      originalCallback(event)
    }
  }
  
  ClaudeCodeLogger.setEventCallback(claudeCodeLogHandler)
  
  return { 
    startLogging: (toolCallId: string) => {
      currentClaudeCodeToolCallId = toolCallId
      claudeCodeLogs = []
    },
    finishLogging: () => {
      const logs = [...claudeCodeLogs]
      currentClaudeCodeToolCallId = null
      return logs
    }
  }
}

async function processStreamChunks(stream: any, streamHandler: StreamHandler, logManager: any) {
  try {
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta') {
        const fullText = streamHandler.getCurrentMessage()?.content || ''
        streamHandler.handleTextChunk(chunk.textDelta, fullText + chunk.textDelta)
      } else if (chunk.type === 'tool-call') {
        if (chunk.toolName === 'claude-code') {
          logManager.startLogging(chunk.toolCallId)
        }
        streamHandler.handleToolCall(chunk.toolName, chunk.toolCallId, chunk.args)
      } else if ((chunk as any).type === 'tool-call-delta') {
        const { toolCallId, argsTextDelta } = chunk as any
        streamHandler.handleToolCallDelta(toolCallId, argsTextDelta)
      } else if ((chunk as any).type === 'tool-result') {
        const { toolCallId, toolName, result } = chunk as any
        
        if (toolName === 'claude-code') {
          const logs = logManager.finishLogging()
          result.logs = logs
          result.executionDetails = logs.join('\n')
        }
        
        streamHandler.handleToolResult(toolCallId, toolName, result)
      }
    }
    
    streamHandler.completeStream()
    
    setTimeout(async () => {
      try {
        const result = await stream
        const response = await result.response
        if (response?.messages) {
          conversationHistory.push(...response.messages)
          console.log('📝 Added response.messages to history:', response.messages.length, 'messages')
        }
      } catch (err) {
        console.error('Failed to get response.messages:', err)
      }
    }, 500)
    
  } catch (error) {
    streamHandler.handleError(error instanceof Error ? error.message : String(error))
  }
} 