import chokidar from 'chokidar'
import { spawn } from 'child_process'

export function setupFileWatcher(getMainWindow: () => any, getChangedFiles: () => Set<string>) {
  const watcher = chokidar.watch([
    'app',
    'components',
    'lib',
    'styles',
    'main.tsx',
    'index.html',
  ], {
    ignored: /node_modules/,
    persistent: true,
    usePolling: true,
    interval: 1000,
    ignoreInitial: true,
  })

  watcher.on('ready', () => {})
  watcher.on('change', (p) => { getChangedFiles().add(p) })
  watcher.on('add', (p) => {})
  watcher.on('unlink', (p) => {})
  watcher.on('error', (err) => {})

  return {
    rebuildAfterClaudeFinished: async () => {
      const changed = getChangedFiles()
      if (!changed.size) return
      
      try {
        const proc = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
        proc.on('close', async (code) => {
          const win = getMainWindow()
          if (code === 0) {
            try {
              const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
              ClaudeCodeLogger.emitGlobalEvent({ 
                type: 'tool_action', 
                message: 'Rebuild completed', 
                icon: '○' 
              })
            } catch (e) {
              
            }
            
            win?.reload()
          } else {
            try {
              const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
              ClaudeCodeLogger.emitGlobalEvent({ 
                type: 'tool_action', 
                message: 'Rebuild failed', 
                icon: '!' 
              })
            } catch (e) {
              
            }
          }
          changed.clear()
        })
      } catch (e) {
        try {
          const { ClaudeCodeLogger } = await import('../../lib/tools/claude-code/logger')
          ClaudeCodeLogger.emitGlobalEvent({ 
            type: 'tool_action', 
            message: 'Rebuild error', 
            icon: '!' 
          })
        } catch (err) {
          
        }
        
        changed.clear()
      }
    },
  }
} 