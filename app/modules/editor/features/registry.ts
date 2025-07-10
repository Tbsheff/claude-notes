import { showWordCountFeature } from './element-features/show-word-count/index'
import { characterCountFeature } from './element-features/character-count/index'
import { calorieCalculatorFeature } from './element-features/calorie-calculator/index'
import { focusModeFeature } from './context-features/focus-mode'
import { aiTextEditorFeature } from './content-features/ai-text-editor/index'
import { textReviewerFeature } from './content-features/text-reviewer/index'

export interface FeatureConfig {
  key: string
  name: string
  description: string
  enabled: boolean
  category?: string
}

export const features = [
  showWordCountFeature,
  characterCountFeature,
  calorieCalculatorFeature,
  focusModeFeature,
  aiTextEditorFeature,
  textReviewerFeature
]

export const getFeatureByKey = (key: string) => {
  return features.find(f => f.config.key === key)
}

export const getAllFeatures = () => {
  return features.map(f => f.config)
} 