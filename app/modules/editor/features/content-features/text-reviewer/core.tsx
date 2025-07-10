import React, { useEffect, useState, useCallback } from 'react'
import { TextReviewerConfig, TextReviewerState, TextRating } from './types'
import { TEXT_REVIEWER_PROMPT } from '@/lib/ai/prompts/text-editing-prompts'

export class TextReviewerCore {
  private config: TextReviewerConfig

  constructor(config: TextReviewerConfig) {
    this.config = config
  }

  private async analyzeText(text: string): Promise<TextRating> {
    try {
      const response = await window.electronAPI.llmCall([
        { role: 'system', content: TEXT_REVIEWER_PROMPT },
        { role: 'user', content: text }
      ])

      console.log(response)

      if (!response.success) {
        console.error('Text review failed:', response.error)
        return '😴'
      }

      const rating = response.content?.trim()
      if (rating === '🔥' || rating === '🤯' || rating === '😴') {
        return rating as TextRating
      }
      
      return '😴'
    } catch (error) {
      console.error('Error analyzing text:', error)
      return '😴'
    }
  }

  renderRating(rating: TextRating, isAnalyzing: boolean): React.ReactElement | null {
    if (!this.config.enabled) {
      return null
    }

    const displayRating = isAnalyzing ? '⏳' : rating

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-xs">Mood:</span>
        <span className="text-base">{displayRating}</span>
      </div>
    )
  }

  async reviewText(text: string): Promise<TextRating> {
    if (!this.config.enabled || text.length < this.config.minTextLength) {
      return '😴'
    }

    return this.analyzeText(text)
  }
}

export const useTextReviewer = (text: string, enabled: boolean) => {
  const [state, setState] = useState<TextReviewerState>({
    currentRating: '😴',
    isAnalyzing: false,
    lastAnalyzedText: ''
  })

  const config: TextReviewerConfig = {
    enabled,
    minTextLength: 15, 
    reviewDelay: 2000
  }

  const core = new TextReviewerCore(config)

  const analyzeText = useCallback(async (textToAnalyze: string) => {
    if (!enabled || textToAnalyze.length < config.minTextLength) {
      setState(prev => ({ ...prev, currentRating: '😴' }))
      return
    }

    setState(prev => ({ ...prev, isAnalyzing: true }))
    
    try {
      const rating = await core.reviewText(textToAnalyze)
      setState(prev => ({
        ...prev,
        currentRating: rating,
        isAnalyzing: false,
        lastAnalyzedText: textToAnalyze
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        currentRating: '😴',
        isAnalyzing: false
      }))
    }
  }, [enabled, config.minTextLength])

  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, currentRating: '😴' }))
      return
    }

    const timeoutId = setTimeout(() => {
      if (text !== state.lastAnalyzedText && text.length >= config.minTextLength) {
        analyzeText(text)
      }
    }, config.reviewDelay)

    return () => clearTimeout(timeoutId)
  }, [text, enabled, analyzeText, state.lastAnalyzedText, config.minTextLength, config.reviewDelay])

  return {
    state,
    renderRating: () => core.renderRating(state.currentRating, state.isAnalyzing)
  }
}