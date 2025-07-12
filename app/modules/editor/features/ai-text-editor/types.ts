export interface AITextEditorConfig {
  enabled: boolean
  model: string
}

export interface AITextEditorState {
  isProcessing: boolean
  currentAction: 'fix' | 'improve' | null
}

export interface AITextEditorResult {
  success: boolean
  content?: string
  error?: string
} 