require('dotenv').config({ path: '.env.local' })

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const chokidar = require('chokidar')

let mainWindow: any = null
let aiAgent: any = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev && mainWindow) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  if (mainWindow) {
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('ai:initialize', async (event, config = {}) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || (config as any).apiKey
    
    if (!apiKey) {
      const error = 'Anthropic API key not found in environment variables or config'
      throw new Error(error)
    }
    
    const { ClaudeCodeAgent } = await import('./lib/ai/agent/core')
    
    aiAgent = new ClaudeCodeAgent({
      apiKey,
      maxTurns: 50,
      cwd: path.join(__dirname, '..'),
      allowedTools: [
        'Read', 'Write', 'Edit', 'Bash', 'List', 'Search', 'Find'
      ],
      permissionMode: 'acceptEdits'
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

    claudeIsWorking = true
    console.log('🚀 Claude Code: Starting work...')

    const result = await aiAgent.processRequest(message)
    
    claudeIsWorking = false
    console.log('✅ Claude Code: Work completed')
    
    if (changedFiles.size > 0) {
      setTimeout(() => rebuildAfterClaudeFinished(), 500)
    }
    
    return result
  } catch (error) {
    claudeIsWorking = false
    console.log('❌ Claude Code: Work failed')
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('llm:call', async (event, messages, model) => {
  try {
    const { llmCall } = await import('./lib/ai/core')
    return await llmCall(messages, model)
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
})

ipcMain.handle('app:reloadWindow', async () => {
  if (mainWindow) {
    mainWindow.reload()
  }
})

ipcMain.handle('app:rebuildAndReload', async () => {
  try {
    console.log('🔄 Manual rebuild requested...')
    
    return { success: true, message: 'Auto-rebuild will trigger when files change' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion()
})

ipcMain.handle('dialog:openFile', async () => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled) {
    const fs = require('fs')
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return content
  }
  return undefined
})

ipcMain.handle('dialog:saveFile', async (event, content) => {
  const { dialog } = require('electron')
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled) {
    const fs = require('fs')
    fs.writeFileSync(result.filePath, content)
    return true
  }
  return false
})

let changedFiles = new Set<string>()
let claudeIsWorking = false

const watcher = chokidar.watch([
  'app',
  'components', 
  'lib',
  'styles',
  'main.tsx',
  'index.html'
], {
  ignored: /node_modules/,
  persistent: true,
  usePolling: true,
  interval: 1000,
  ignoreInitial: true
})

watcher.on('ready', () => {
  console.log('🔍 File watcher is ready and watching for changes...')
})

watcher.on('change', (filePath) => {
  console.log(`📁 File changed: ${filePath}`)
  changedFiles.add(filePath)
  
  // Не пересобираем сразу, ждем когда Claude закончит
})

watcher.on('add', (filePath) => {
  console.log(`➕ File added: ${filePath}`)
})

watcher.on('unlink', (filePath) => {
  console.log(`➖ File removed: ${filePath}`)
})

watcher.on('error', (error) => {
  console.error('❌ File watcher error:', error)
})

// Функция для пересборки после завершения работы Claude
async function rebuildAfterClaudeFinished() {
  if (changedFiles.size === 0) return
  
  console.log(`🔄 Auto-rebuilding after ${changedFiles.size} file changes...`)
  console.log('📝 Changed files:', Array.from(changedFiles).join(', '))
  
  try {
    // Rebuild both frontend and electron
    const { spawn } = require('child_process')
    const buildProcess = spawn('npm', ['run', 'build'], { 
      stdio: 'inherit',
      shell: true 
    })
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Both frontend and electron rebuilt, reloading...')
        if (mainWindow) {
          mainWindow.reload()
        }
      } else {
        console.error('❌ Build failed')
      }
    
      // Очищаем список измененных файлов
      changedFiles.clear()
    })
  } catch (error) {
    console.error('❌ Rebuild error:', error)
    changedFiles.clear()
  }
} 