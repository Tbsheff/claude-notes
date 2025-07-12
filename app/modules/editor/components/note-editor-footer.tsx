import React from 'react'
import { useTextStats } from '../features/show-word-count'
import { useFeatureState } from '../features/feature-manager'

interface NoteEditorFooterProps {
  content: string
}

export function NoteEditorFooter({ content }: NoteEditorFooterProps) {
  const [showWordCount] = useFeatureState('showWordCount')
  const [readingTimeEnabled] = useFeatureState('readingTime')
  const textStats = useTextStats(content, showWordCount)

  if (!showWordCount && !readingTimeEnabled) return null

  return (
    <div className="border-t border-border px-6 py-2 flex items-center justify-between bg-background">
      <div className="flex items-center space-x-4">
        {showWordCount && textStats.renderWords()}
      </div>
    </div>
  )
} 