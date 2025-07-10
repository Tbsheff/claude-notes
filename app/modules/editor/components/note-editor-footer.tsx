import React, { useState } from 'react'
import { useFocusMode } from '../features/context-features/focus-mode'
import { useTextStats } from '../features/element-features/show-word-count'
import { useCharacterCount } from '../features/element-features/character-count'
import { useCalorieCalculator } from '../features/element-features/calorie-calculator'
import { useTextReviewer } from '../features/content-features/text-reviewer'
import { useFeatureState } from '../features/feature-manager'

interface NoteEditorFooterProps {
  content: string
}

export function NoteEditorFooter({ content }: NoteEditorFooterProps) {
  const focusMode = useFocusMode()
  const [showWordCount] = useFeatureState('showWordCount')
  const [showCharacterCount] = useFeatureState('characterCount')
  const [calorieCalculatorEnabled] = useFeatureState('calorieCalculator')
  const [textReviewerEnabled] = useFeatureState('textReviewer')
  const [sessionTime, setSessionTime] = useState(25)
  const textStats = useTextStats(content, showWordCount)
  const characterCountStats = useCharacterCount(content, showCharacterCount)
  const calorieCalculator = useCalorieCalculator(content, calorieCalculatorEnabled)
  const textReviewer = useTextReviewer(content, textReviewerEnabled)

  const hasContent =
    focusMode.enabled ||
    showWordCount ||
    showCharacterCount ||
    calorieCalculatorEnabled ||
    textReviewerEnabled

  if (!hasContent) return null

  return (
    <div className="border-t border-border px-6 py-2 flex items-center justify-between bg-background">
      <div className="flex items-center space-x-4">
        {characterCountStats.renderCharacters()}
        {focusMode.renderTimer()}
        {focusMode.renderControls(sessionTime, setSessionTime)}
      </div>

      <div className="flex items-center space-x-4">
        {textStats.renderWords()}
        {calorieCalculator.renderCalories()}
        {textReviewer.renderRating()}
      </div>
    </div>
  )
} 