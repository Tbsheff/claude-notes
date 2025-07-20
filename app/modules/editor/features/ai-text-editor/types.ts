import { EditorContext } from '../../api';

export interface AITextEditorConfig {
  enabled: boolean
  model?: string
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

export interface AITextEditorFeature {
  isAvailable: boolean;
  state: AITextEditorState;
  renderFixButton: (context: EditorContext) => React.ReactElement;
  renderImproveButton: (context: EditorContext) => React.ReactElement;
} 