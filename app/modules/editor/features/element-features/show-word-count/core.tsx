import React from 'react'
import { ShowWordCountConfig } from './types'

export class ShowWordCountCore {
  private config: ShowWordCountConfig

  constructor(config: ShowWordCountConfig) {
    this.config = config
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  toggle(): void {
    this.config.enabled = !this.config.enabled
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  shouldShowWordCount(): boolean {
    return this.config.enabled
  }

  getWordCountText(wordCount: number): string {
    return `${wordCount} words`
  }

  getStatsClasses(): string {
    return 'text-xs text-muted-foreground'
  }

  renderWords(text: string): React.ReactElement | null {
    if (!this.shouldShowWordCount()) return null
    
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
    
    return (
      <span className={this.getStatsClasses()}>
        {this.getWordCountText(wordCount)}
      </span>
    )
  }
} 