import { spawn } from 'child_process'
import path from 'path'
import { ValidationResult, CommandResult } from './types'

export class AgentValidator {
  private workspacePath: string

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  async validateWorkspace(): Promise<ValidationResult> {
    console.log('🔍 Starting full agent workspace validation...')

    const tsResult = await this.validateTypeScript()
    if (!tsResult.success) {
      return tsResult
    }

    const eslintResult = await this.validateESLint()
    if (!eslintResult.success) {
      return eslintResult
    }

    const buildResult = await this.validateBuild()
    if (!buildResult.success) {
      return buildResult
    }

    console.log('✅ Full agent validation passed!')
    return { success: true, phase: 'full' }
  }

  async validateTypeScript(): Promise<ValidationResult> {
    console.log('📝 Checking TypeScript...')
    
    try {
      const result = await this.runCommand('npx', ['tsc', '--noEmit'], {
        cwd: this.workspacePath
      })

      if (result.success) {
        console.log('✅ TypeScript check passed')
        return { success: true, phase: 'typescript' }
      } else {
        console.log('❌ TypeScript errors found')
        return { 
          success: false, 
          phase: 'typescript',
          error: result.error,
          output: result.output
        }
      }
    } catch (error) {
      return {
        success: false,
        phase: 'typescript',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async validateESLint(): Promise<ValidationResult> {
    console.log('🔧 Checking ESLint...')
    
    try {
      const result = await this.runCommand('npx', ['eslint', '.', '--max-warnings', '0'], {
        cwd: this.workspacePath
      })

      if (result.success) {
        console.log('✅ ESLint check passed')
        return { success: true, phase: 'eslint' }
      } else {
        console.log('❌ ESLint errors found')
        return { 
          success: false, 
          phase: 'eslint',
          error: result.error,
          output: result.output
        }
      }
    } catch (error) {
      return {
        success: false,
        phase: 'eslint',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async validateBuild(): Promise<ValidationResult> {
    console.log('🏗️ Testing build...')
    
    try {
      const result = await this.runCommand('npm', ['run', 'build:vite'], {
        cwd: this.workspacePath
      })

      if (result.success) {
        console.log('✅ Build test passed')
        return { success: true, phase: 'build' }
      } else {
        console.log('❌ Build failed')
        return { 
          success: false, 
          phase: 'build',
          error: result.error,
          output: result.output
        }
      }
    } catch (error) {
      return {
        success: false,
        phase: 'build',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async runCommand(
    command: string, 
    args: string[], 
    options: { cwd: string }
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      let output = ''
      let error = ''

      const process = spawn(command, args, {
        ...options,
        stdio: 'pipe',
        shell: true
      })

      process.stdout?.on('data', (data) => {
        output += data.toString()
      })

      process.stderr?.on('data', (data) => {
        error += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output })
        } else {
          resolve({ 
            success: false, 
            error: error || output || `Command failed with code ${code}`,
            output 
          })
        }
      })

      process.on('error', (err) => {
        resolve({ 
          success: false, 
          error: err.message 
        })
      })

      setTimeout(() => {
        process.kill()
        resolve({ 
          success: false, 
          error: 'Command timeout' 
        })
      }, 120000)
    })
  }

  async tryAutoFix(): Promise<ValidationResult> {
    console.log('🔧 Attempting auto-fix with ESLint...')
    
    try {
      await this.runCommand('npx', ['eslint', '.', '--fix'], {
        cwd: this.workspacePath
      })

      return await this.validateWorkspace()
    } catch (error) {
      return {
        success: false,
        phase: 'eslint',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
} 