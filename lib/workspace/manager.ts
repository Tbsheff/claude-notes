import { promises as fs } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { WorkspaceConfig, WorkspaceResult } from '../tools/claude-code/types'
import { logger } from '../logger'

const execAsync = promisify(exec)

export class WorkspaceManager {
  private config: WorkspaceConfig
  private projectRoot: string
  private workspacePath: string

  constructor(config: WorkspaceConfig, projectRoot: string) {
    this.config = config
    this.projectRoot = resolve(projectRoot)
    this.workspacePath = isAbsolute(config.workspaceDir)
      ? config.workspaceDir
      : resolve(this.projectRoot, config.workspaceDir)
  }

  async create(): Promise<WorkspaceResult> {
    try {
      logger.claudeCode(`Workspace created: ${this.workspacePath}`)
      
      await this.cleanup()
      await fs.mkdir(this.workspacePath, { recursive: true })
      
      await this.copyFiles()

      const nodeModulesPath = join(this.workspacePath, 'node_modules')
      try {
        await fs.access(nodeModulesPath)
      } catch {
        try {
          const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
          ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Installing dependencies...', icon: '●' })
          logger.claudeCode('Installing dependencies...')
          await execAsync('npm install --silent', { cwd: this.workspacePath, timeout: 300000 })
          ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Dependencies installed', icon: '○' })
          logger.claudeCode('Dependencies installed')
        } catch (installError) {
          const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
          ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Failed to install dependencies', icon: '!' })
          logger.claudeCode(`ERROR installing dependencies: ${installError}`)
        }
      }
      
      return {
        success: true,
        workspacePath: this.workspacePath
      }
    } catch (error) {
      logger.claudeCode(`ERROR creating workspace: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async copyFiles(): Promise<void> {
    const filesToCopy = await this.getFilesToCopy()
    logger.claudeCode(`Copied ${filesToCopy.length} files`)
    
    for (const file of filesToCopy) {
      try {
        const srcPath = join(this.projectRoot, file)
        const destPath = join(this.workspacePath, file)
        
        await fs.mkdir(resolve(destPath, '..'), { recursive: true })
        await fs.copyFile(srcPath, destPath)
      } catch (error) {
        logger.claudeCode(`ERROR copying ${file}: ${error}`)
      }
    }
  }

  async getFilesToCopy(): Promise<string[]> {
    return await this.getAllFiles(this.projectRoot)
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    return this.getAllFilesRecursive(dir, this.projectRoot, true)
  }

  private async getAllFilesRecursive(dir: string, basePath: string, shouldSkip: boolean = false): Promise<string[]> {
    const files: string[] = []
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = join(dir, item.name)
        const relativePath = relative(basePath, fullPath)
        
        if (shouldSkip && this.shouldSkipPath(relativePath)) continue
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllFilesRecursive(fullPath, basePath, shouldSkip)
          files.push(...subFiles)
        } else {
          files.push(relativePath)
        }
      }
    } catch {
    }
    
    return files
  }

  private shouldSkipPath(relativePath: string): boolean {
    const skipPaths = [
      '.agent-workspace',
      'node_modules',
      'dist-electron',
      'dist',
      '.git',
      'data'
    ]
    
    return skipPaths.some(skip => 
      relativePath === skip || relativePath.startsWith(skip + '/')
    )
  }



  async getChangedFiles(): Promise<string[]> {
    try {
      const { setupFileWatcher } = await import('../../electron/services/file-watcher-service')
      const { detector } = setupFileWatcher(() => null, () => new Set())
      return await detector.getChangedFiles(this.workspacePath)
    } catch (error) {
      logger.claudeCode(`ERROR getting changed files: ${error}`)
      return []
    }
  }

  private async getAllWorkspaceFiles(): Promise<string[]> {
    const files: string[] = []
    
    try {
      const items = await fs.readdir(this.workspacePath, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = join(this.workspacePath, item.name)
        const relativePath = relative(this.workspacePath, fullPath)
        
        if (this.shouldSkipPath(relativePath)) continue
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllWorkspaceFiles_recursive(fullPath)
          files.push(...subFiles)
        } else {
          files.push(relativePath)
        }
      }
    } catch {
      
    }
    
    return files
  }

  private async getAllWorkspaceFiles_recursive(dir: string): Promise<string[]> {
    return this.getAllFilesRecursive(dir, this.workspacePath, true)
  }

  async applyChanges(): Promise<number> {
    const changedFiles = await this.getChangedFiles()
    
    if (changedFiles.length > 0) {
      logger.claudeCode(`Applying ${changedFiles.length} files: ${changedFiles.join(', ')}`)
    }
    
    for (const file of changedFiles) {
      const workspaceFile = join(this.workspacePath, file)
      const originalFile = join(this.projectRoot, file)
      
      await fs.mkdir(resolve(originalFile, '..'), { recursive: true })
      await fs.copyFile(workspaceFile, originalFile)
    }
    
    return changedFiles.length
  }

  async cleanup(): Promise<void> {
    try {
      const exists = await fs.access(this.workspacePath).then(() => true, () => false)
      if (!exists) {
        return
      }
      
      logger.claudeCode(`Cleaned up: ${this.workspacePath}`)
      const { promisify } = await import('util')
      const { exec } = await import('child_process')
      const execPromise = promisify(exec)
      await execPromise(`rm -rf "${this.workspacePath}"`)
      
    } catch (error) {
      logger.claudeCode(`ERROR cleaning up: ${error}`)
    }
  }

  getWorkspacePath(): string {
    return this.workspacePath
  }
} 