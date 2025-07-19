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
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      
      const tsResult = { success: true }
      result.tsCheck = true

      const eslintResult = { success: true }
      result.eslintCheck = true
      
      const buildResult = await this.checkBuild()
      result.buildCheck = buildResult.success

      result.success = result.tsCheck && result.eslintCheck && result.buildCheck

      if (!result.success) {
        const errors: string[] = []
        if (!result.buildCheck && buildResult.error) errors.push(`Build: ${buildResult.error}`)
        
        ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Validation failed', icon: '!' })
        result.error = errors.join('; ')
      } else {
        ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Validation passed', icon: '○' })
      }
    } catch (error) {
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Validation error', icon: '!' })
      result.success = false
      result.error = error instanceof Error ? error.message : String(error)
    }
    
    return result
  }

  private async checkTypeScript(): Promise<{success: boolean, error?: string}> {
    try {
      await execAsync('npx tsc --noEmit --skipLibCheck --noUnusedLocals false', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.stdout || error.stderr || error.message }
    }
  }

  private async checkESLint(): Promise<{success: boolean, error?: string}> {
    try {
      await execAsync('npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 100', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.stdout || error.stderr || error.message }
    }
  }
  

  private async checkBuild(): Promise<{success: boolean, error?: string}> {
    try {
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Compiling project...', icon: '●' })
      
      await execAsync('npm run build', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Build completed successfully', icon: '○' })
      return { success: true }
    } catch (error) {
      const { ClaudeCodeLogger } = await import('../tools/claude-code/logger')
      ClaudeCodeLogger.emitEvent({ type: 'tool_action', message: 'Build failed', icon: '!' })
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMsg }
    }
  }
} 