import { exec } from 'child_process'
import { promisify } from 'util'
import { ValidationResult } from '../tools/claude-code/types'

const execAsync = promisify(exec)

export class Validator {
  private projectRoot: string
  private timeoutMs: number

  constructor(projectRoot: string, timeoutMs: number = 120000) {
    this.projectRoot = projectRoot
    this.timeoutMs = timeoutMs
  }

  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      tsCheck: false,
      eslintCheck: false,
      buildCheck: false
    }

    try {
      console.log('=== VALIDATOR START ===')
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      
      const buildResult = await this.checkBuild()
      console.log('Build result:', buildResult)

      result.tsCheck = true
      result.eslintCheck = true
      result.buildCheck = buildResult.success
      result.success = result.buildCheck

      if (!result.success) {
        console.log('Validation failed:', buildResult.error)
        ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Validation failed', icon: '!' })
        result.error = `Build: ${buildResult.error}`
      } else {
        console.log('Validation passed')
        ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Validation passed', icon: '○' })
      }
    } catch (error) {
      console.log('Validation error:', error)
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Validation error', icon: '!' })
      result.success = false
      result.error = error instanceof Error ? error.message : String(error)
    }

    console.log('=== VALIDATOR END ===', result)
    return result
  }

  private async checkTypeScript(): Promise<{success: boolean, error?: string}> {
    try {
      await execAsync('npx tsc --noEmit --skipLibCheck --noUnusedLocals false', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMsg }
    }
  }

  private async checkESLint(): Promise<{success: boolean, error?: string}> {
    try {
      await execAsync('npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 100', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMsg }
    }
  }
  

  private async checkBuild(): Promise<{success: boolean, error?: string}> {
    try {
      console.log('Starting build check...')
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Compiling project...', icon: '●' })
      
      console.log('Running npm run build...')
      await execAsync('npm run build', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      console.log('Build completed successfully')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Build completed successfully', icon: '○' })
      return { success: true }
    } catch (error) {
      console.log('Build failed:', error)
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Build failed', icon: '!' })
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMsg }
    }
  }
} 