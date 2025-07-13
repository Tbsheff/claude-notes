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
    const { ClaudeCodeAgent } = await import('../../lib/ai/agent/core')
    const { ClaudeCodeLogger } = await import('../../lib/ai/agent/logger')
    ClaudeCodeLogger.setEventCallback((event) => {
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
      setTimeout(() => rebuildCallback(), 500)
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