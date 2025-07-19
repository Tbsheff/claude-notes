import { useState } from 'react'
import { AITextEditorCore } from './core'
import { AITextEditorConfig, AITextEditorState } from './types'

export const aiTextEditorFeature = {
  config: {
    key: 'aiTextEditor',
    name: 'AI Text Editor',
    description: 'Fix grammar and improve text with AI',
    enabled: true,
    category: 'content'
  },
  
  create: (config: AITextEditorConfig) => new AITextEditorCore(config),
  
  useFeature: (enabled: boolean) => {
    const core = new AITextEditorCore({ enabled })
    return {
      isEnabled: () => core.isEnabled(),
      setEnabled: (enabled: boolean) => core.setEnabled(enabled),
      processText: (action: 'fix' | 'improve', text: string) => core.processText(action, text),
      getState: () => core.getState(),
      renderFixButton: (onClick: () => void, disabled?: boolean) => core.renderFixButton(onClick, disabled),
      renderImproveButton: (onClick: () => void, disabled?: boolean) => core.renderImproveButton(onClick, disabled)
    }
  }
}

export function useAITextEditor(enabled: boolean = true) {
  const [state, setState] = useState<AITextEditorState>({
    isProcessing: false,
    currentAction: null
  })
  
  const [core] = useState(() => {
    const aiCore = new AITextEditorCore({ enabled })
    aiCore.setOnStateChange(setState)
    return aiCore
  })

  const processText = async (action: 'fix' | 'improve', text: string) => {
    return await core.processText(action, text)
  }

  const renderFixButton = (onClick: () => void) => {
    return core.renderFixButton(onClick, !enabled)
  }

  const renderImproveButton = (onClick: () => void) => {
    return core.renderImproveButton(onClick, !enabled)
  }

  return {
    state,
    enabled,
    processText,
    renderFixButton,
    renderImproveButton,
    setEnabled: (enabled: boolean) => core.setEnabled(enabled)
  }
}

export { AITextEditorCore } from './core'
export type { AITextEditorConfig, AITextEditorState, AITextEditorResult } from './types' 