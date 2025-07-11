export interface WorkspaceConfig {
  workspaceDir: string
  forbiddenPaths: string[]
  projectRoot: string
}

export interface WorkspaceResult {
  success: boolean
  error?: string
  changedFiles?: string[]
}

export interface ValidationResult {
  success: boolean
  phase: 'typescript' | 'eslint' | 'build' | 'full'
  error?: string
  output?: string
}

export interface CommandResult {
  success: boolean
  error?: string
  output?: string
}
