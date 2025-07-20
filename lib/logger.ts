class Logger {
  private enabled: boolean = false

  constructor() {
    this.enabled = process.env.DEBUG_LOGGER === 'true' || process.env.NODE_ENV === 'development'
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 23)
    return `${timestamp} [${level}] ${message}`
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