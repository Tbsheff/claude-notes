class Logger {
  private enabled: boolean = false

  constructor() {
    const env = typeof window !== 'undefined' ? (window as any).env : process.env
    this.enabled = env?.DEBUG_LOGGER === 'true' || env?.NODE_ENV === 'development'
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 23)
    const caller = this.getCallerFunctionName()
    return `${timestamp} [${level}]${caller ? ` [${caller}]` : ''} ${message}`
  }

  private getCallerFunctionName(): string | null {
    const err = new Error()
    const stackLines = err.stack?.split('\n') || []
    if (stackLines.length >= 4) {
      const callerLine = stackLines[3]
      const match = callerLine.match(/at (.*?) /)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  log(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(this.formatMessage('LOG', message), ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.enabled) {
      console.info(this.formatMessage('INFO', message), ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.enabled) {
      console.warn(this.formatMessage('WARN', message), ...args)
    }
  }

  error(message: string, ...args: any[]) {
    if (this.enabled) {
      console.error(this.formatMessage('ERROR', message), ...args)
    }
  }


  debug(message: string, ...args: any[]) {
    if (this.enabled) {
      console.debug(this.formatMessage('DEBUG', message), ...args)
    }
  }

  claudeCode(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(this.formatMessage('CLAUDE-CODE', message), ...args)
    }
  }

  llm(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(this.formatMessage('LLM', message), ...args)
    }
  }

  agent(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(this.formatMessage('AGENT', message), ...args)
    }
  }
}

export const logger = new Logger() 