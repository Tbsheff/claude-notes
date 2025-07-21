import chokidar from 'chokidar'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join, relative } from 'path'
import { logger } from '../../lib/logger'

class FileChangeDetector {
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  private normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()
  }

  private shouldSkipPath(relativePath: string): boolean {
    const skipPaths = [
      '.agent-workspace',
      'node_modules',
      'dist-electron',
      'dist',
      '.git',
      'data',
      'package-lock.json',
      'yarn.lock'
    ]
    
    return skipPaths.some(skip => 
      relativePath === skip || relativePath.startsWith(skip + '/')
    )
  }

  async compareFiles(workspacePath: string, originalPath: string): Promise<boolean> {
    try {
      let originalContent = ''
      let workspaceContent = ''

      try {
        originalContent = await fs.readFile(originalPath, 'utf-8')
      } catch {
        return true
      }

      try {
        workspaceContent = await fs.readFile(workspacePath, 'utf-8')
      } catch {
        return false
      }

      return this.normalizeContent(originalContent) !== this.normalizeContent(workspaceContent)
    } catch {
      return false
    }
  }

  async getChangedFiles(workspaceDir: string): Promise<string[]> {
    const changedFiles: string[] = []
    
    try {
      const workspaceFiles = await this.getAllWorkspaceFiles(workspaceDir)
      
      for (const file of workspaceFiles) {
        if (this.shouldSkipPath(file)) continue

        const workspaceFile = join(workspaceDir, file)
        const originalFile = join(this.projectRoot, file)

        const hasChanged = await this.compareFiles(workspaceFile, originalFile)
        if (hasChanged) {
          changedFiles.push(file)
        }
      }
    } catch (error) {
      console.error('Error detecting file changes:', error)
    }
    
    return changedFiles
  }

  private async getAllWorkspaceFiles(workspaceDir: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const items = await fs.readdir(workspaceDir, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = join(workspaceDir, item.name)
        const relativePath = relative(workspaceDir, fullPath)
        
        if (this.shouldSkipPath(relativePath)) continue
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllWorkspaceFilesRecursive(fullPath, workspaceDir)
          files.push(...subFiles)
        } else {
          files.push(relativePath)
        }
      }
    } catch {
    }
    
    return files
  }

  private async getAllWorkspaceFilesRecursive(dir: string, basePath: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = join(dir, item.name)
        const relativePath = relative(basePath, fullPath)
        
        if (this.shouldSkipPath(relativePath)) continue
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllWorkspaceFilesRecursive(fullPath, basePath)
          files.push(...subFiles)
        } else {
          files.push(relativePath)
        }
      }
    } catch {
    }
    
    return files
  }
}

export function setupFileWatcher(getMainWindow: () => any, getChangedFiles: () => Set<string>) {
  const detector = new FileChangeDetector(process.cwd())

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
    detector,
    rebuildAfterClaudeFinished: async (workspaceDir?: string) => {
      let shouldRebuild = false
      
      if (workspaceDir) {
        const changedFiles = await detector.getChangedFiles(workspaceDir)
        shouldRebuild = changedFiles.length > 0
        if (shouldRebuild) {
          logger.info(`Claude Code changed ${changedFiles.length} files:`, changedFiles)
        }
      } else {
        const changed = getChangedFiles()
        shouldRebuild = changed.size > 0
        if (shouldRebuild) {
          logger.info(`File watcher detected ${changed.size} changed files:`, Array.from(changed))
        }
      }
      
      if (!shouldRebuild) {
        logger.info('No files changed, skipping rebuild')
        return
      }
      
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
          
          if (workspaceDir) {
            logger.info('Rebuild after Claude Code completed')
          } else {
            getChangedFiles().clear()
          }
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
        
        if (!workspaceDir) {
          getChangedFiles().clear()
        }
      }
    },
  }
} 