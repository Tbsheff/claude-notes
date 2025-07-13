const { ipcMain } = require('electron')
const path = require('path')
const os = require('os')

let aiAgent: any = null
let _claudeIsWorking = false
let changedFiles = new Set<string>()
let mainWindow: any = null

export function getChangedFiles() {
  return changedFiles
}

export function setClaudeWorking(working: boolean) {
  _claudeIsWorking = working
}

export function setMainWindow(window: any) {
  mainWindow = window
}

async function getStoredApiKeys() {
  try {
    const { getSettingsPath } = await import('../utils/notes-helpers')
    const fs = require('fs')
    const settingsPath = getSettingsPath()
    
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      return { anthropicApiKey: settings.apiKeys?.anthropicApiKey || '' }
    }
  } catch (error) {
    console.error('Failed to load stored API keys:', error)
  }
  return { anthropicApiKey: '' }
}

export function setupAIHandlers(rebuildCallback: () => void) {
  ipcMain.handle('ai:initialize', async (event, config = {}) => {
    try {
      const storedKeys = await getStoredApiKeys()
      const apiKey = storedKeys.anthropicApiKey || process.env.ANTHROPIC_API_KEY || (config as any).apiKey
      
      if (!apiKey) {
        const error = 'Anthropic API key not found. Please configure it in Settings.'
        throw new Error(error)
      }
      
      const { ClaudeCodeAgent } = await import('../../lib/ai/agent/core')
      const { ClaudeCodeLogger } = await import('../../lib/ai/agent/utils')
      
      ClaudeCodeLogger.setEventCallback((event) => {
        if (mainWindow) {
          mainWindow.webContents.send('claude-event', event)
        }
      })
      
      const projectRoot = path.resolve(__dirname, '../../../')
      
      aiAgent = new ClaudeCodeAgent({ 
        apiKey,
        cwd: projectRoot 
      })
      
      await aiAgent.initialize()
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ai:process-request', async (event, message) => {
    try {
      if (!aiAgent) {
        throw new Error('AI Agent not initialized')
      }

      _claudeIsWorking = true
      console.log('🚀 Agent: Starting AI processing...')

      const workspaceConfig = {
        enabled: true,
        workspaceDir: path.join(os.tmpdir(), `.agent-workspace-${Date.now()}`),
        blacklistedPaths: [],
        timeoutMs: 120000,
        validateAfter: true 
      }

      const result = await aiAgent.processRequest(message, workspaceConfig)
      
      _claudeIsWorking = false
      
      if (result.success) {
        console.log('✅ Claude Code: Work completed!')
        
        setTimeout(() => rebuildCallback(), 500)
        
        return { 
          success: true, 
          response: result.response,
          workspaceResult: result.workspaceResult
        }
      } else {
        console.log('❌ Claude Code: Work failed')
        return result
      }
      
    } catch (error) {
      _claudeIsWorking = false
      console.log('❌ Claude Code: Work failed')
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('llm:call', async (event, messages, model) => {
    try {
      const storedKeys = await getStoredApiKeys()
      const { llmCall } = await import('../../lib/ai/core')
      return await llmCall(messages, model, storedKeys)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  })
}

 