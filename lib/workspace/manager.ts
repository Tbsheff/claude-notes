import { promises as fs } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { WorkspaceConfig, WorkspaceResult } from '../tools/claude-code/types'

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
      await this.cleanup()
      await fs.mkdir(this.workspacePath, { recursive: true })
      await this.copyFiles()

      const nodeModulesPath = join(this.workspacePath, 'node_modules')
      try {
        await fs.access(nodeModulesPath)
      } catch {
        try {
          console.log('1. Installing dependencies...')
          const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
          ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Installing dependencies...', icon: '●' })
          await execAsync('npm install --silent', { cwd: this.workspacePath, timeout: 300000 })
          console.log('2. Dependencies installed successfully')
          ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Dependencies installed', icon: '○' })
        } catch (installError) {
          console.log('3. Failed to install dependencies:', installError)
          const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
          ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Failed to install dependencies', icon: '!' })
        }
      }
      
      return {
        success: true,
        workspacePath: this.workspacePath
      }
    } catch (error) {

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async copyFiles(): Promise<void> {
    const filesToCopy = await this.getFilesToCopy()
    
    for (const file of filesToCopy) {
      try {
        const srcPath = join(this.projectRoot, file)
        const destPath = join(this.workspacePath, file)
        
        await fs.mkdir(resolve(destPath, '..'), { recursive: true })
        await fs.copyFile(srcPath, destPath)
      } catch {
        
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
      '.git'
    ]
    
    if (relativePath === 'pnpm-lock.yaml') return true
    
    return skipPaths.some(skip => 
      relativePath === skip || relativePath.startsWith(skip + '/')
    )
  }



  async getChangedFiles(): Promise<string[]> {
    const changedFiles: string[] = []
    const workspaceFiles = await this.getAllWorkspaceFiles()
    
    for (const file of workspaceFiles) {
      if (this.shouldSkipPath(file)) continue

      const workspaceFile = join(this.workspacePath, file)
      const originalFile = join(this.projectRoot, file)

      try {
        let isNewFile = false
        let originalContent = ''
        
        try {
          await fs.access(originalFile)
          originalContent = await fs.readFile(originalFile, 'utf-8')
        } catch {
          isNewFile = true
        }
        
        if (isNewFile) {
          changedFiles.push(file)
        } else {
          const workspaceContent = await fs.readFile(workspaceFile, 'utf-8')
          if (workspaceContent !== originalContent) {
            changedFiles.push(file)
          }
        }
      } catch {

      }
    }
    
    return changedFiles
  }

  private async getAllWorkspaceFiles(): Promise<string[]> {
    const files: string[] = []
    
    try {
      const items = await fs.readdir(this.workspacePath, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = join(this.workspacePath, item.name)
        const relativePath = relative(this.workspacePath, fullPath)
        
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
    return this.getAllFilesRecursive(dir, this.workspacePath, false)
  }

  async applyChanges(): Promise<number> {
    const changedFiles = await this.getChangedFiles()
    
    if (changedFiles.length > 0) {
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ 
        type: 'tool_action', 
        message: `Applying ${changedFiles.length} changed files to main project...`, 
        icon: '→' 
      })
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
      await fs.rm(this.workspacePath, { recursive: true, force: true })
    } catch (error) {
      
    }
  }

  getWorkspacePath(): string {
    return this.workspacePath
  }
} 