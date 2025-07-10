import React from 'react'
import { Wrench, Sparkles, Loader2 } from 'lucide-react'
import { AITextEditorConfig, AITextEditorState, AITextEditorResult } from './types'
import { FIX_TEXT_PROMPT, IMPROVE_TEXT_PROMPT } from '@/lib/ai/prompts/text-editing-prompts'

export class AITextEditorCore {
  private config: AITextEditorConfig
  private state: AITextEditorState
  private onStateChange?: (state: AITextEditorState) => void

  constructor(config: AITextEditorConfig) {
    this.config = config
    this.state = {
      isProcessing: false,
      currentAction: null
    }
  }

  setOnStateChange(callback: (state: AITextEditorState) => void): void {
    this.onStateChange = callback
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state)
    }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  getState(): AITextEditorState {
    return this.state
  }

  async processText(action: 'fix' | 'improve', text: string): Promise<AITextEditorResult> {
    if (this.state.isProcessing) {
      return { success: false, error: 'Already processing' }
    }

    this.state = { isProcessing: true, currentAction: action }
    this.notifyStateChange()

    try {
      const systemPrompt = action === 'fix' ? FIX_TEXT_PROMPT : IMPROVE_TEXT_PROMPT
      
      const result = await window.electronAPI.llmCall([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ], this.config.model)

      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    } finally {
      this.state = { isProcessing: false, currentAction: null }
      this.notifyStateChange()
    }
  }

  renderFixButton(onClick: () => void, disabled: boolean = false): React.ReactElement {
    const isFixing = this.state.isProcessing && this.state.currentAction === 'fix'
    
    return (
      <div 
        onClick={() => !disabled && !this.state.isProcessing && onClick()}
        className={`focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none ${
          disabled || this.state.isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-default hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        {isFixing ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
        {isFixing ? 'Fixing...' : 'Fix with AI'}
      </div>
    )
  }

  renderImproveButton(onClick: () => void, disabled: boolean = false): React.ReactElement {
    const isImproving = this.state.isProcessing && this.state.currentAction === 'improve'
    
    return (
      <div 
        onClick={() => !disabled && !this.state.isProcessing && onClick()}
        className={`focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none ${
          disabled || this.state.isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-default hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        {isImproving ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isImproving ? 'Improving...' : 'Improve with AI'}
      </div>
    )
  }
} 