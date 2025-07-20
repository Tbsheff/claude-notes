class Logger {
  private enabled: boolean

  constructor() {
    const debugValue = typeof process !== 'undefined' ? process.env.DEBUG_LOGGER : undefined

    this.enabled = debugValue !== 'false'
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  isEnabled(): boolean {
    return this.enabled
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 23)
    const callStack = this.getCallStackString()
    return `${timestamp} [${level}]${callStack ? ` [${callStack}]` : ''} ${message}`
  }

  private getCallStackFunctions(): string[] {
    const err = new Error()
    const stackLines = err.stack?.split('\n') || []
    const functions: string[] = []
    for (let i = 2; i < stackLines.length; i++) {
      const line = stackLines[i].trim()
      if (line.includes('Logger.')) continue
      const match = line.match(/at ([^ ]+) /)
      if (match && match[1]) {
        functions.push(match[1].split('.').pop() || match[1])
      }
    }
    return functions
  }

  private getCallStackString(): string {
    return this.getCallStackFunctions().join('→')
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
