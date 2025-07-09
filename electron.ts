require('dotenv').config({ path: '.env.local' })

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const { AIAgent } = require('./lib/ai-agent.js')

let mainWindow = null
let aiAgent = null

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

ipcMain.handle('ai:initialize', async (event, config = {}) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || (config as any).apiKey
    
    if (!apiKey) {
      const error = 'OpenRouter API key not found in environment variables or config'
      throw new Error(error)
    }
    
    aiAgent = new AIAgent({
      openRouterApiKey: apiKey,
      model: (config as any).model || 'anthropic/claude-sonnet-4',
      projectRoot: path.join(__dirname, '..')
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ai:process-request', async (event, message) => {
  if (!aiAgent) {
    const error = 'AI Agent not initialized'
    return { success: false, error };
  }
  
  try {
    const response = await (aiAgent as any).processRequest(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('dialog:openFile', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const fs = require('fs');
    return fs.readFileSync(result.filePaths[0], 'utf-8');
  }
  return undefined;
});

ipcMain.handle('dialog:saveFile', async (event, content) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    const fs = require('fs');
    fs.writeFileSync(result.filePath, content);
    return true;
  }
  return false;
});

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

ipcMain.handle('app:reloadWindow', async () => {
  if (mainWindow) {
    mainWindow.reload();
  }
});

ipcMain.handle('app:rebuildAndReload', async () => {
  try {
    console.log('🔄 Rebuilding application...');
    
    // Rebuild только frontend
    const { spawn } = require('child_process');
    const buildVite = spawn('npm', ['run', 'build:vite'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    buildVite.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend rebuilt successfully');
        if (mainWindow) {
          mainWindow.reload();
        }
      } else {
        console.error('❌ Frontend rebuild failed');
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Rebuild error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow()
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// File watcher для автоматического rebuild после изменений AI
let rebuildInProgress = false;
let rebuildTimeout: NodeJS.Timeout | null = null;

function startFileWatcher() {
  const watchPaths = [
    'app/**/*.tsx',
    'app/**/*.ts', 
    'app/**/*.jsx',
    'app/**/*.js',
    'components/**/*.tsx',
    'components/**/*.ts',
    'lib/**/*.ts',
    'lib/**/*.js'
  ];
  
  const watcher = chokidar.watch(watchPaths, {
    ignored: [
      'node_modules/**',
      'dist/**',
      'dist-electron/**',
      '.git/**',
      '**/*.map'
    ],
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', (filePath) => {
    if (rebuildInProgress) return;
    
    console.log(`📝 File changed: ${filePath}`);
    
    // Debounce: ждем 500ms после последнего изменения
    if (rebuildTimeout) {
      clearTimeout(rebuildTimeout);
    }
    
    rebuildTimeout = setTimeout(() => {
      autoRebuild();
    }, 500);
  });
  
  console.log('👁️  File watcher started for:', watchPaths);
}

function autoRebuild() {
  if (rebuildInProgress || !mainWindow) return;
  
  rebuildInProgress = true;
  console.log('🔄 Auto-rebuilding...');
  
  const { spawn } = require('child_process');
  const buildVite = spawn('npm', ['run', 'build:vite'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  buildVite.on('close', (code) => {
    rebuildInProgress = false;
    
    if (code === 0) {
      console.log('✅ Auto-rebuild successful, reloading...');
      if (mainWindow) {
        mainWindow.reload();
      }
    } else {
      console.error('❌ Auto-rebuild failed');
    }
  });
  
  buildVite.on('error', (error) => {
    rebuildInProgress = false;
    console.error('❌ Auto-rebuild error:', error);
  });
}

// Запускаем file watcher всегда (так как мы в режиме self-modifying editor)
app.whenReady().then(() => {
  setTimeout(startFileWatcher, 2000); // Задержка для полной инициализации
}); 