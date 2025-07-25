import type { SDKMessage } from '@anthropic-ai/claude-code'
import { MAIN_SYSTEM_PROMPT } from './prompts/main-prompt'
import { logger } from '../../logger'

export const cleanWorkspacePath = (path: string) => {
  if (path.includes('.agent-workspace-') || path.includes('/var/folders/')) {
    const appIndex = path.indexOf('/app')
    if (appIndex !== -1) return path.substring(appIndex)
    return '/workspace'
  }
  return path
}

export const getFileName = (path: string) => {
  const cleanPath = cleanWorkspacePath(path)
  return cleanPath.split('/').pop() || cleanPath
}

export const getDirName = (path: string) => {
  if (path === '.') return 'current directory'
  return getFileName(path)
}

export const truncateCommand = (command: string, maxLength = 50) => {
  if (command.length <= maxLength) return command
  return command.substring(0, maxLength) + '...'
}

export const processToolMessage = (toolName: string, toolInput: any) => {
  switch (toolName) {
    case 'Read': {
      const readPath =
        toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
      return `Read: ${getFileName(readPath)}`
    }
    case 'Write': {
      const writePath =
        toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
      return `Write: ${getFileName(writePath)}`
    }
    case 'Edit': {
      const editPath =
        toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
      return `Edit: ${getFileName(editPath)}`
    }
    case 'List':
    case 'LS': {
      const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.'
      return `List: ${getDirName(listPath)}`
    }
    case 'Search': {
      const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown'
      const searchPath = toolInput.path || toolInput.directory || '.'
      return `Search: "${pattern}" in ${getDirName(searchPath)}`
    }
    case 'Find': {
      const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown'
      const findPath = toolInput.path || toolInput.directory || '.'
      return `Find: "${findPattern}" in ${getDirName(findPath)}`
    }
    case 'Bash': {
      const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command'
      const cleanCommand = cleanWorkspacePath(command)
      return `Bash: ${truncateCommand(cleanCommand)}`
    }
    case 'Grep': {
      const grepPattern = toolInput.pattern || toolInput.query || 'unknown'
      return `Grep: ${grepPattern}`
    }
    case 'Glob': {
      const globPattern = toolInput.pattern || toolInput.glob || 'unknown'
      return `Glob: ${globPattern}`
    }
    case 'Task': {
      if (Array.isArray(toolInput)) {
        const taskCount = toolInput.length
        const firstTaskDesc = toolInput[0]?.description || 'unknown task'
        return taskCount > 1 ? `Tasks: ${firstTaskDesc} (+${taskCount - 1} more)` : `Task: ${firstTaskDesc}`
      }
      const description = toolInput.description || 'unknown task'
      return `Task: ${description}`
    }
    case 'MultiEdit': {
      const filePath = toolInput.file_path || toolInput.path || 'unknown file'
      return `MultiEdit: ${getFileName(filePath)}`
    }
    case 'TodoWrite': {
      const todos = toolInput.todos || []
      const todoCount = todos.length
      if (todoCount === 0) return 'TodoWrite: No todos'
      
      const firstTodo = todos[0]?.content || 'Unknown task'
      return todoCount > 1 
        ? `TodoWrite: ${firstTodo} (+${todoCount - 1} more)` 
        : `TodoWrite: ${firstTodo}`
    }
    default: {
      if (typeof toolInput === 'object' && toolInput !== null) {
        if (toolInput.pattern) return `${toolName}: "${toolInput.pattern}"`
        if (toolInput.query) return `${toolName}: "${toolInput.query}"`
        if (toolInput.path || toolInput.file) {
          const p = toolInput.path || toolInput.file
          return `${toolName}: ${getFileName(p)}`
        }
      }
      const inputStr = JSON.stringify(toolInput)
      const defaultMsg = inputStr && inputStr !== '{}' ? `${toolName}: ${inputStr}` : toolName
      return truncateCommand(defaultMsg)
    }
  }
}



export function getQueryOptions(config: any, cwd?: string, customSystemPrompt?: string) {
  const workspaceDir = cwd || config.cwd || process.cwd()
  
  return {
    maxTurns: config.maxTurns || 50,
    cwd: workspaceDir,
    permissionMode: 'bypassPermissions',
    customSystemPrompt: customSystemPrompt || config.customSystemPrompt || MAIN_SYSTEM_PROMPT,
    appendSystemPrompt: config.appendSystemPrompt
  }
}

export interface ClaudeEvent {
  type: 'assistant_message' | 'tool_action' | 'tool_result' | 'error' | 'start' | 'complete' | 'ready'
  message: string
  icon: string
  timestamp: number
  tool_use_id?: string
  toolCallId?: string
}

let eventCallback: ((event: ClaudeEvent) => void) | null = null
let currentToolCallId: string | null = null
let currentFeatureName: string | null = null

export class ClaudeCodeLogger {
  static setEventCallback(callback: (event: ClaudeEvent) => void) {
    eventCallback = callback
  }

  static getCurrentEventCallback() {
    return eventCallback
  }

  static setCurrentToolCallId(toolCallId: string) {
    currentToolCallId = toolCallId
  }

  static getCurrentToolCallId() {
    return currentToolCallId
  }

  static setCurrentFeatureName(featureName: string) {
    currentFeatureName = featureName
    logger.claudeCode(`Feature: ${featureName}`)
  }

  static getCurrentFeatureName() {
    return currentFeatureName
  }

  static emitEvent(event: Omit<ClaudeEvent, 'timestamp'>) {
    if (eventCallback) eventCallback({ ...event, timestamp: Date.now() })
  }

  static emitGlobalEvent(event: Omit<ClaudeEvent, 'timestamp'>) {
    if (eventCallback && currentToolCallId) {
      eventCallback({ ...event, timestamp: Date.now(), toolCallId: currentToolCallId })
    }
  }

  static logMessage(msg: SDKMessage) {
    if (msg.type !== 'assistant' || !msg.message?.content) {
      return
    }

    const content = Array.isArray(msg.message.content)
      ? msg.message.content.find((c) => c.type === 'text')?.text
      : msg.message.content

    if (content) {
      this.emitEvent({ type: 'assistant_message', message: `Agent: ${content}`, icon: '→' })
    }

    if (Array.isArray(msg.message.content)) {
      msg.message.content.forEach((item: any) => {
        if (item.type === 'tool_use') {
          this.logTool(item)
        }
        
        if (item.type === 'tool_result') {
          if (item.is_error) {
            this.logToolResult(item.content || 'Unknown error', true)
          } else {
            this.logToolResult(item.content || 'Success', false)
          }
        }
      })
    }
  }

  static logTool(toolData: any) {
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
      return
    }

    const message = processToolMessage(toolName, toolInput)
    logger.claudeCode(message)

    this.emitEvent({
      type: 'tool_action',
      message,
      icon: this.getToolIcon(toolName),
      tool_use_id: toolUseId
    })
  }

  private static getToolIcon(name: string) {
    switch (name) {
      case 'Read':
        return '↑'
      case 'Write':
        return '↓'
      case 'Edit':
        return '→'
      case 'Bash':
        return '>'
      case 'List':
      case 'LS':
        return '•'
      case 'Search':
        return '→'
      case 'Find':
        return '→'
      case 'Grep':
        return '→'
      default:
        return '→'
    }
  }

  static logToolResult(result: any, isError = false) {
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
    this.emitEvent({ type: isError ? 'error' : 'tool_result', message: resultStr, icon: isError ? '!' : '↓' })
  }

  static logStart() {
    this.emitEvent({ type: 'start', message: 'Agent: Processing request...', icon: '●' })
  }

  static logComplete() {
    this.emitEvent({ type: 'complete', message: 'Agent: Task completed', icon: '○' })
  }

  static logReady() {
    this.emitEvent({ type: 'ready', message: 'Agent ready', icon: '○' })
  }

  static logError(error: any) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.claudeCode(`Agent error: ${msg}`)
    this.emitEvent({ type: 'error', message: `Agent Error: ${msg}`, icon: '!' })
  }
} 