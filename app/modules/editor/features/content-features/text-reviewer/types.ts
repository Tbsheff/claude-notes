export interface TextReviewerConfig {
  enabled: boolean
  minTextLength: number
  reviewDelay: number
}

export interface TextReviewerState {
  currentRating: TextRating
  isAnalyzing: boolean
  lastAnalyzedText: string
}

export type TextRating = '🔥' | '🤯' | '😴' | '⏳'