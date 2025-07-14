import path from 'path'
import os from 'os'
import { BrowserWindow } from 'electron'
import { getSettingsPath } from './note-service'

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

    // Extract only user messages from UI and add to history
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
    
    mainWindow?.webContents.send('agent-stream-start', { streamId })
    
    // Создаём буфер для накопления логов Claude Code
    let claudeCodeLogs: string[] = []
    let currentClaudeCodeToolCallId: string | null = null
    
    // Настраиваем перехват логов Claude Code
    const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
    const originalCallback = ClaudeCodeLogger.getCurrentEventCallback()
    
    const claudeCodeLogHandler = (event: any) => {
      if (currentClaudeCodeToolCallId) {
        const logLine = `${event.icon} ${event.message}`
        claudeCodeLogs.push(logLine)
        
        // Отправляем обновление логов через стандартный механизм
        mainWindow?.webContents.send('claude-code-log-update', {
          toolCallId: currentClaudeCodeToolCallId,
          logs: claudeCodeLogs
        })
      }
      
      // Вызываем оригинальный callback если он есть
      if (originalCallback) {
        originalCallback(event)
      }
    }
    
    ClaudeCodeLogger.setEventCallback(claudeCodeLogHandler)
    
    ;(async () => {
      try {
        let fullText = ''
        let currentMessage: any = {
          id: streamId,
          role: 'assistant',
          content: '',
          parts: []
        }
        
        for await (const chunk of stream.fullStream) {
          if (chunk.type === 'text-delta') {
            fullText += chunk.textDelta
            currentMessage.content = fullText
            
            mainWindow?.webContents.send('agent-stream-chunk', { 
              streamId, 
              chunk: chunk.textDelta,
              fullText,
              message: currentMessage
            })
          } else if (chunk.type === 'tool-call') {
            // Если это Claude Code, начинаем накопление логов
            if (chunk.toolName === 'claude-code') {
              currentClaudeCodeToolCallId = chunk.toolCallId
              claudeCodeLogs = []
            }
            
            const toolPart = {
              type: 'tool-invocation',
              toolInvocation: {
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
                state: 'call',
                args: chunk.args
              }
            }
            currentMessage.parts.push(toolPart)
            
            mainWindow?.webContents.send('agent-stream-tool-call', { 
              streamId, 
              toolCall: toolPart,
              message: currentMessage
            })
          } else if ((chunk as any).type === 'tool-call-delta') {
            const { toolCallId, toolName, argsTextDelta } = chunk as any
            const part = currentMessage.parts.find((p: any) => p.toolInvocation?.toolCallId === toolCallId)
            if (part) {
              part.toolInvocation.args = (part.toolInvocation.args || '') + argsTextDelta
            }
            mainWindow?.webContents.send('agent-stream-tool-call-delta', {
              streamId,
              toolCallId,
              toolName,
              argsTextDelta,
              message: currentMessage
            })
          } else if ((chunk as any).type === 'tool-result') {
            const { toolCallId, toolName, result } = chunk as any
            
            // Если это Claude Code, завершаем накопление логов но НЕ очищаем их
            if (toolName === 'claude-code' && toolCallId === currentClaudeCodeToolCallId) {
              // Добавляем финальный лог о завершении
              const finalLog = `✅ Task completed successfully. ${result.changedFiles || 0} files were modified.`
              claudeCodeLogs.push(finalLog)
              
              // Отправляем финальное обновление логов
              mainWindow?.webContents.send('claude-code-log-update', {
                toolCallId: currentClaudeCodeToolCallId,
                logs: claudeCodeLogs
              })
              
              // Include logs in the tool result for AI agent context
              if (claudeCodeLogs.length > 0) {
                result.logs = claudeCodeLogs
                result.executionDetails = claudeCodeLogs.join('\n')
              }
              
              // Сбрасываем только ID, но НЕ очищаем логи
              currentClaudeCodeToolCallId = null
              
              // Восстанавливаем оригинальный callback
              if (originalCallback) {
                ClaudeCodeLogger.setEventCallback(originalCallback)
              }
            }
            
            const part = currentMessage.parts.find((p: any) => p.toolInvocation?.toolCallId === toolCallId)
            if (part) {
              part.toolInvocation.state = 'result'
              part.toolInvocation.result = result
            }
            mainWindow?.webContents.send('agent-stream-tool-result', {
              streamId,
              toolCallId,
              toolName,
              result,
              message: currentMessage
            })
          }
        }
        
        mainWindow?.webContents.send('agent-stream-complete', { 
          streamId, 
          fullText,
          message: currentMessage
        })
        
        // Add AI SDK's response.messages to conversation history after stream completes
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
        // Восстанавливаем callback при ошибке
        if (originalCallback) {
          ClaudeCodeLogger.setEventCallback(originalCallback)
        }
        
        mainWindow?.webContents.send('agent-stream-error', { 
          streamId, 
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })()
    
    return { success: true, streamId }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
} 