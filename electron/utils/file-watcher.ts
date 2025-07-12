import chokidar from 'chokidar'
import { spawn } from 'child_process'

export function setupFileWatcher(getMainWindow: () => any, getChangedFiles: () => Set<string>) {
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
    getChangedFiles().add(filePath)
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

  return {
    rebuildAfterClaudeFinished: async () => {
      const changedFiles = getChangedFiles()
      if (changedFiles.size === 0) return
      
      console.log(`🔄 Auto-rebuilding after ${changedFiles.size} file changes...`)
      console.log('📝 Changed files:', Array.from(changedFiles).join(', '))
      
      try {
        const buildProcess = spawn('npm', ['run', 'build'], {
          stdio: 'inherit'
        })
        
        buildProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Electron rebuilt, reloading...')
            const mainWindow = getMainWindow()
            if (mainWindow) {
              mainWindow.reload()
            }
          } else {
            console.error('❌ Build failed')
          }
        
          changedFiles.clear()
        })
      } catch (error) {
        console.error('❌ Rebuild error:', error)
        changedFiles.clear()
      }
    }
  }
} 