import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { WorkspaceConfig, WorkspaceResult } from './types'

export class WorkspaceManager {
  private config: WorkspaceConfig

  constructor(projectRoot: string = process.cwd()) {
    this.config = {
      workspaceDir: '.claude-workspace',
      projectRoot,
      forbiddenPaths: [
        'lib/ai/',
        'electron.ts',
        'preload.ts', 
        'node_modules/',
        'dist/',
        'dist-electron/',
        '.git/',
        '.env',
        '.env.local',
        'package-lock.json',
        'yarn.lock',
        '.claude-workspace/'
      ]
    }
  }

  async createWorkspace(): Promise<WorkspaceResult> {
    try {
      console.log('📁 Creating agent workspace...')
      
      const workspacePath = path.join(this.config.projectRoot, this.config.workspaceDir)
      
      if (await this.exists(workspacePath)) {
        await fs.rm(workspacePath, { recursive: true, force: true })
      }
      
      await fs.mkdir(workspacePath, { recursive: true })
      
      await this.copyAllExcept()
      
      console.log('✅ Agent workspace created successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to create agent workspace:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  private async copyAllExcept(): Promise<void> {
    const items = await fs.readdir(this.config.projectRoot)
    
    for (const item of items) {
      const isForbidden = this.config.forbiddenPaths.some(forbidden => {
        if (forbidden.endsWith('/')) {
          return item === forbidden.slice(0, -1)
        }
        return item === forbidden
      })
      
      if (!isForbidden) {
        const sourcePath = path.join(this.config.projectRoot, item)
        const destPath = path.join(this.config.projectRoot, this.config.workspaceDir, item)
        
        await this.copyRecursive(sourcePath, destPath)
        console.log(`✅ Copied: ${item}`)
      } else {
        console.log(`🚫 Skipped: ${item}`)
      }
    }
  }

  private async copyRecursive(source: string, dest: string): Promise<void> {
    const stat = await fs.stat(source)
    
    if (stat.isDirectory()) {
      await fs.mkdir(dest, { recursive: true })
      const files = await fs.readdir(source)
      
      for (const file of files) {
        await this.copyRecursive(
          path.join(source, file),
          path.join(dest, file)
        )
      }
    } else {
      await fs.copyFile(source, dest)
    }
  }

  async getChangedFiles(): Promise<string[]> {
    try {
      const changedFiles: string[] = []
      const workspacePath = path.join(this.config.projectRoot, this.config.workspaceDir)
      
      await this.compareDirectories('', changedFiles)
      
      return changedFiles
    } catch (error) {
      console.error('❌ Failed to get changed files:', error)
      return []
    }
  }

  private async compareDirectories(relativePath: string, changedFiles: string[]): Promise<void> {
    const workspaceDir = path.join(this.config.projectRoot, this.config.workspaceDir, relativePath)
    const mainDir = path.join(this.config.projectRoot, relativePath)
    
    if (!(await this.exists(workspaceDir))) return
    
    const workspaceItems = await fs.readdir(workspaceDir)
    
    for (const item of workspaceItems) {
      const workspaceItemPath = path.join(workspaceDir, item)
      const mainItemPath = path.join(mainDir, item)
      const relativeItemPath = path.join(relativePath, item).replace(/\\/g, '/')
      
      const workspaceStat = await fs.stat(workspaceItemPath)
      
      if (workspaceStat.isDirectory()) {
        await this.compareDirectories(relativeItemPath, changedFiles)
      } else {
        if (!(await this.exists(mainItemPath))) {
          changedFiles.push(relativeItemPath)
        } else {
          const workspaceContent = await fs.readFile(workspaceItemPath)
          const mainContent = await fs.readFile(mainItemPath)
          
          if (!workspaceContent.equals(mainContent)) {
            changedFiles.push(relativeItemPath)
          }
        }
      }
    }
  }

  async applyChanges(): Promise<WorkspaceResult> {
    try {
      console.log('🔄 Applying agent workspace changes...')
      
      const changedFiles = await this.getChangedFiles()
      
      if (changedFiles.length === 0) {
        console.log('ℹ️ No changes to apply')
        return { success: true, changedFiles: [] }
      }
      
      console.log('📝 Files to update:', changedFiles)
      
      for (const file of changedFiles) {
        const sourcePath = path.join(this.config.projectRoot, this.config.workspaceDir, file)
        const destPath = path.join(this.config.projectRoot, file)
        
        await fs.mkdir(path.dirname(destPath), { recursive: true })
        await fs.copyFile(sourcePath, destPath)
        
        console.log(`✅ Updated: ${file}`)
      }
      
      console.log('✅ All agent workspace changes applied successfully')
      return { success: true, changedFiles }
    } catch (error) {
      console.error('❌ Failed to apply agent workspace changes:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async cleanWorkspace(): Promise<WorkspaceResult> {
    try {
      console.log('🗑️ Cleaning agent workspace...')
      
      const workspacePath = path.join(this.config.projectRoot, this.config.workspaceDir)
      
      if (await this.exists(workspacePath)) {
        await fs.rm(workspacePath, { recursive: true, force: true })
        console.log('✅ Agent workspace cleaned')
      }
      
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to clean agent workspace:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  getWorkspacePath(): string {
    return path.join(this.config.projectRoot, this.config.workspaceDir)
  }

  async isWorkspaceActive(): Promise<boolean> {
    return await this.exists(this.getWorkspacePath())
  }
} 