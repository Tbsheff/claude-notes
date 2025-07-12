import React from 'react'

export interface ShowWordCountConfig {
  enabled: boolean
}

export interface TextStatsProps {
  characterCount: number
  wordCount: number
  showWordCount: boolean
} 