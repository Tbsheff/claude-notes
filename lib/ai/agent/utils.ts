import type { SDKMessage, ClaudeEvent } from './types'
import { MAIN_SYSTEM_PROMPT } from './main-prompt'
import { processToolMessage } from '../../utils'

let eventCallback: ((event: ClaudeEvent) => void) | null = null

function buildAllowedTools(workspaceDir: string): string[] {
  return [
    `Read(${workspaceDir}/*)`, `Write(${workspaceDir}/*)`, `Edit(${workspaceDir}/*)`, 
    `List(${workspaceDir}/*)`, `Search(${workspaceDir}/*)`, `Find(${workspaceDir}/*)`,
    'Bash(npm run build)', 'Bash(npm run dev)', 'Bash(npm run lint)', 'Bash(npm run test)', 
    'Bash(npm ci)', 'Bash(npm install)', 
    'Bash(npm run electron)', 'Bash(npm run electron:dev)', 'Bash(npm run electron:build)', 'Bash(npm run electron:pack)',
    `Bash(mkdir ${workspaceDir}/*)`, 
    `Bash(ls ${workspaceDir}/*)`, 
    `Bash(cat ${workspaceDir}/*)`, 
    `Bash(find ${workspaceDir} *)`, 
    `Bash(grep * ${workspaceDir}/*)`,
    'Bash(ls)', 'Bash(ls .)', 'Bash(ls ./)', 'Bash(pwd)'
  ]
}

export function getQueryOptions(config: any, cwd?: string, customSystemPrompt?: string) {
  const workspaceDir = cwd || config.cwd || process.cwd()
  
  return {
    maxTurns: config.maxTurns || 50,
    cwd: workspaceDir,
    allowedTools: config.allowedTools || buildAllowedTools(workspaceDir),
    disallowedTools: config.disallowedTools || [],
    permissionMode: config.permissionMode || 'acceptEdits',
    customSystemPrompt: customSystemPrompt || config.customSystemPrompt || MAIN_SYSTEM_PROMPT,
    appendSystemPrompt: config.appendSystemPrompt
  }
}

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
    console.log('🔍 Raw Message:', JSON.stringify(msg, null, 2))
    
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
            this.logTool(item)
          }
        })
      }
    }



    if (msg.type === 'user') {
      console.log('👤 User Message:', JSON.stringify(msg, null, 2))
    }

    if (msg.type === 'system') {
      console.log('🔧 System Message:', JSON.stringify(msg, null, 2))
    }
  }

  static logTool(toolData: any): void {
    let toolName: string
    let toolInput: any
    let toolUseId: string

    if (toolData.name) {
      toolName = toolData.name
      toolInput = toolData.input || {}
      toolUseId = toolData.id
    } else if (toolData.function) {
      toolName = toolData.function.name
      toolInput = toolData.function.arguments ? JSON.parse(toolData.function.arguments) : {}
      toolUseId = toolData.id
    } else {
      console.warn('Unknown tool data format:', toolData)
      return
    }

    const message = processToolMessage(toolName, toolInput)
    
    console.log(`🔧 ${message}`)
    this.emitEvent({ 
      type: 'tool_action', 
      message, 
      icon: this.getToolIcon(toolName), 
      tool_use_id: toolUseId 
    })
  }

  static getToolIcon(toolName: string): string {
    switch (toolName) {
      case 'Read': return '📖'
      case 'Write': return '📝'
      case 'Edit': return '✏️'
      case 'Bash': return '⚡'
      case 'List':
      case 'LS': return '📁'
      case 'Search': return '🔍'
      case 'Find': return '🔎'
      case 'Grep': return '🔍'
      default: return '🔧'
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