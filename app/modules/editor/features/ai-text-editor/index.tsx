import { useState, useMemo, useCallback } from 'react'
import { AITextEditorCore } from './core'
import type { AITextEditorFeature, AITextEditorState } from './types'
import { EditorContext } from '../../api'

export function useAITextEditor(enabled: boolean = true): Omit<AITextEditorFeature, 'state'> {
  const [state, setState] = useState<AITextEditorState>({
    isProcessing: false,
    currentAction: null
  })
  
  const core = useMemo(() => {
    const aiCore = new AITextEditorCore({ enabled })
    aiCore.setOnStateChange(setState)
    return aiCore
  }, [enabled])

  const handleAIAction = async (action: 'fix' | 'improve', context: EditorContext) => {
    const { editorRef, setContent, setShowMenu } = context
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString()
    if (!selectedText) return

    const result = await core._processText(action, selectedText)
    if (result.success && result.content) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const textNode = document.createTextNode(result.content.trim())
      range.insertNode(textNode)
      
      if (editorRef.current) {
        editorRef.current.focus()
        setContent(editorRef.current.innerHTML)
      }
    }
    setShowMenu(false)
  }

  const renderFixButton = useCallback((context: EditorContext) => {
    return core.renderFixButton(() => handleAIAction('fix', context), !enabled, state.isProcessing)
  }, [core, enabled, state.isProcessing])

  const renderImproveButton = useCallback((context: EditorContext) => {
    return core.renderImproveButton(() => handleAIAction('improve', context), !enabled, state.isProcessing)
  }, [core, enabled, state.isProcessing])

  return {
    isAvailable: enabled,
    renderFixButton,
    renderImproveButton,
  }
}

export const aiTextEditorFeature = {
  config: {
    key: 'aiTextEditor',
    name: 'AI Text Editor',
    description: 'Fix grammar and improve text with AI.',
    enabled: true,
    category: 'content',
  },
  useFeature: useAITextEditor,
}

export { AITextEditorCore } from './core'
export type { AITextEditorConfig, AITextEditorState, AITextEditorResult } from './types' 