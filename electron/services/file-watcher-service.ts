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

  watcher.on('ready', () => console.log('🔍 File watcher ready'))
  watcher.on('change', (p) => { console.log(`📁 Changed: ${p}`); getChangedFiles().add(p) })
  watcher.on('add', (p) => console.log(`➕ Added: ${p}`))
  watcher.on('unlink', (p) => console.log(`➖ Removed: ${p}`))
  watcher.on('error', (err) => console.error('❌ Watcher error:', err))

  return {
    rebuildAfterClaudeFinished: async () => {
      const changed = getChangedFiles()
      if (!changed.size) return
      console.log(`🔄 Auto-rebuilding after ${changed.size} changes`)
      console.log('📝', [...changed].join(', '))
      try {
        const proc = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
        proc.on('close', (code) => {
          const win = getMainWindow()
          if (code === 0) {
            console.log('✅ Rebuilt, reloading…')
            win?.reload()
          } else {
            console.error('❌ Build failed')
          }
          changed.clear()
        })
      } catch (e) {
        console.error('❌ Rebuild error', e)
        changed.clear()
      }
    },
  }
} 