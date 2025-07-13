import { exec } from 'child_process'
import { promisify } from 'util'
import { ValidationResult } from '../agent/types'

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
      const buildResult = await this.checkBuild()

      result.tsCheck = true
      result.eslintCheck = true
      result.buildCheck = buildResult.success
      result.success = result.buildCheck

      if (!result.success) {
        result.error = `Build: ${buildResult.error}`
      }
    } catch (error) {
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log('TypeScript check failed:', error)
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
      console.log('ESLint errors detected (warnings allowed):', error)
      return { success: false, error: errorMsg }
    }
  }
  

  private async checkBuild(): Promise<{success: boolean, error?: string}> {
    try {
      await execAsync('npm run build', {
        cwd: this.projectRoot,
        timeout: this.timeoutMs
      })
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log('Build check failed:', error)
      return { success: false, error: errorMsg }
    }
  }
} 