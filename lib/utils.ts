import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const cleanWorkspacePath = (path: string) => {
  if (path.includes('.agent-workspace-') || path.includes('/var/folders/')) {
    const appIndex = path.indexOf('/app')
    if (appIndex !== -1) {
      return path.substring(appIndex)
    }
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
    case 'Read':
      const readPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
      return `Read: ${getFileName(readPath)}`
      
    case 'Write':
      const writePath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
      return `Write: ${getFileName(writePath)}`
      
    case 'Edit':
      const editPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown'
      return `Edit: ${getFileName(editPath)}`
      
    case 'List':
    case 'LS':
      const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.'
      return `List: ${getDirName(listPath)}`
      
    case 'Search':
      const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown'
      const searchPath = toolInput.path || toolInput.directory || '.'
      return `Search: "${pattern}" in ${getDirName(searchPath)}`
      
    case 'Find':
      const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown'
      const findPath = toolInput.path || toolInput.directory || '.'
      return `Find: "${findPattern}" in ${getDirName(findPath)}`
      
    case 'Bash':
      const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command'
      const cleanCommand = cleanWorkspacePath(command)
      return `Bash: ${truncateCommand(cleanCommand)}`
      
    case 'Grep':
      const grepPattern = toolInput.pattern || toolInput.query || 'unknown'
      return `Grep: ${grepPattern}`
      
    case 'Glob':
      const globPattern = toolInput.pattern || toolInput.glob || 'unknown'
      return `Glob: ${globPattern}`
      
    default:
      if (typeof toolInput === 'object' && toolInput !== null) {
        if (toolInput.pattern) {
          return `${toolName}: "${toolInput.pattern}"`
        }
        if (toolInput.query) {
          return `${toolName}: "${toolInput.query}"`
        }
        if (toolInput.path || toolInput.file) {
          const path = toolInput.path || toolInput.file
          return `${toolName}: ${getFileName(path)}`
        }
      }
      
      const inputStr = JSON.stringify(toolInput)
      const defaultMsg = inputStr && inputStr !== '{}' ? `${toolName}: ${inputStr}` : toolName
      return truncateCommand(defaultMsg)
  }
}
