import type { SDKMessage, ClaudeEvent } from './types'

let eventCallback: ((event: ClaudeEvent) => void) | null = null

export class ClaudeCodeLogger {
  static setEventCallback(callback: (event: ClaudeEvent) => void): void {
    eventCallback = callback
  }

  static emitEvent(event: Omit<ClaudeEvent, 'timestamp'>): void {
    if (eventCallback) {
      eventCallback({ ...event, timestamp: Date.now() })
    }
  }
  static logMessage(msg: SDKMessage): void {
    if (msg.type === 'assistant' && msg.message?.content) {
      const content = Array.isArray(msg.message.content) 
        ? msg.message.content.find(c => c.type === 'text')?.text 
        : msg.message.content
      
      if (content) {
        console.log('💭 Agent:', content)
        this.emitEvent({
          type: 'assistant_message',
          message: `Agent: ${content}`,
          icon: '💭'
        })
      }
      
      if ((msg.message as any)?.tool_calls) {
        (msg.message as any).tool_calls.forEach((call: any) => {
          this.logTool(call)
        })
      }
      
      if (Array.isArray(msg.message.content)) {
        msg.message.content.forEach((item: any) => {
          if (item.type === 'tool_use') {
            this.logToolFromContent(item)
          }
        })
      }
    }
  }

  static logToolFromContent(toolUse: any): void {
    const toolName = toolUse.name
    const toolInput = toolUse.input || {}

    switch (toolName) {
      case 'Read':
        const readPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
        const readMsg = `Read: ${readPath}`
        console.log(`📖 ${readMsg}`)
        this.emitEvent({ type: 'tool_action', message: readMsg, icon: '📖' })
        break
        
      case 'Write':
        const writePath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
        const writeMsg = `Write: ${writePath}`
        console.log(`📝 ${writeMsg}`)
        this.emitEvent({ type: 'tool_action', message: writeMsg, icon: '📝' })
        break
        
      case 'Edit':
        const editPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
        const editMsg = `Edit: ${editPath}`.length > 100 ? `Edit: ${editPath}`.substring(0, 100) + '...' : `Edit: ${editPath}`
        console.log(`✏️ ${editMsg}`)
        this.emitEvent({ type: 'tool_action', message: editMsg, icon: '✏️' })
        break
        
      case 'Bash':
        const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command'
        const bashMsg = `Bash: ${command}`
        console.log(`⚡ ${bashMsg}`)
        this.emitEvent({ type: 'tool_action', message: bashMsg, icon: '⚡' })
        break
        
      case 'List':
        const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.'
        const listMsg = `List: ${listPath}`
        console.log(`📁 ${listMsg}`)
        this.emitEvent({ type: 'tool_action', message: listMsg, icon: '📁' })
        break
        
      case 'Search':
        const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown'
        const searchPath = toolInput.path || toolInput.directory || '.'
        const searchMsg = `Search: "${pattern}" in ${searchPath}`
        console.log(`🔍 ${searchMsg}`)
        this.emitEvent({ type: 'tool_action', message: searchMsg, icon: '🔍' })
        break
        
      case 'Find':
        const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown'
        const findPath = toolInput.path || toolInput.directory || '.'
        const findMsg = `Find: "${findPattern}" in ${findPath}`
        console.log(`🔎 ${findMsg}`)
        this.emitEvent({ type: 'tool_action', message: findMsg, icon: '🔎' })
        break
        
      default:
        const inputStr = JSON.stringify(toolInput)
        const defaultMsg = inputStr && inputStr !== '{}' ? `${toolName}: ${inputStr}` : toolName
        console.log(`🔧 ${defaultMsg}`)
        this.emitEvent({ type: 'tool_action', message: defaultMsg, icon: '🔧' })
    }
  }

  static logTool(toolCall: any): void {
    const toolName = toolCall.function?.name
    const toolInput = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}

    switch (toolName) {
      case 'Read':
        const readPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
        console.log(`📖 Read: ${readPath}`)
        break
        
      case 'Write':
        const writePath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
        console.log(`📝 Write: ${writePath}`)
        break
        
      case 'Edit':
        const editPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
        console.log(`✏️ Edit: ${editPath}`)
        break
        
      case 'Bash':
        const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command'
        console.log(`⚡ Bash: ${command}`)
        break
        
      case 'List':
        const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.'
        console.log(`📁 List: ${listPath}`)
        break
        
      case 'Search':
        const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown'
        const searchPath = toolInput.path || toolInput.directory || '.'
        console.log(`🔍 Search: "${pattern}" in ${searchPath}`)
        break
        
      case 'Find':
        const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown'
        const findPath = toolInput.path || toolInput.directory || '.'
        console.log(`🔎 Find: "${findPattern}" in ${findPath}`)
        break
        
      default:
        const inputStr = JSON.stringify(toolInput)
        if (inputStr && inputStr !== '{}') {
          console.log(`🔧 ${toolName}: ${inputStr}`)
        } else {
          console.log(`🔧 ${toolName}`)
        }
    }
  }

  static logToolResult(result: any, isError: boolean = false): void {
    if (isError) {
      const errorMsg = typeof result === 'string' ? result : JSON.stringify(result)
      console.log(`   ❌ ${errorMsg}`)
    } else {
      if (result) {
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
        console.log(`   📝 ${resultStr}`)
      } else {
        console.log(`   ✅ Completed`)
      }
    }
  }

  static logStart(): void {
    console.log('🚀 Agent: Processing request...')
    this.emitEvent({
      type: 'start',
      message: 'Agent: Processing request...',
      icon: '🚀'
    })
  }

  static logComplete(): void {
    console.log('✅ Agent: Task completed')
    this.emitEvent({
      type: 'complete',
      message: 'Agent: Task completed',
      icon: '✅'
    })
  }

  static logReady(): void {
    console.log('✅ Agent: Ready')
  }

  static logError(error: any): void {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Agent Error:', error)
    this.emitEvent({
      type: 'error',
      message: `Agent Error: ${errorMsg}`,
      icon: '❌'
    })
  }
} 