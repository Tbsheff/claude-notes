import React from 'react'
import { CharacterCountConfig, CharacterCountStats } from './types'

export class CharacterCountCore {
  private config: CharacterCountConfig

  constructor(config: CharacterCountConfig) {
    this.config = config
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  private calculateStats(text: string): CharacterCountStats {
    const total = text.length
    const withoutSpaces = text.replace(/\s/g, '').length
    const spaces = total - withoutSpaces
    
    return {
      total,
      withoutSpaces,
      spaces
    }
  }

  private formatCount(count: number, label: string): string {
    return `${count} ${label}${count !== 1 ? 's' : ''}`
  }

  renderCharacters(text: string): React.ReactElement | null {
    if (!this.config.enabled) return null
    
    const stats = this.calculateStats(text)
    const parts = []
    
    if (this.config.showWithoutSpaces) {
      parts.push(this.formatCount(stats.withoutSpaces, 'char'))
    }
    
    if (this.config.showSpaces && this.config.showWithoutSpaces) {
      parts.push(this.formatCount(stats.total, 'total'))
    } else if (this.config.showSpaces) {
      parts.push(this.formatCount(stats.total, 'character'))
    }
    
    if (parts.length === 0) {
      parts.push(this.formatCount(stats.total, 'character'))
    }
    
    return (
      <span className="text-xs text-muted-foreground">
        {parts.join(' • ')}
      </span>
    )
  }

} 