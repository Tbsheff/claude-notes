import { showWordCountFeature } from './show-word-count/index'
import { aiTextEditorFeature } from './ai-text-editor/index'

export interface FeatureConfig {
  key: string
  name: string
  description: string
  enabled: boolean
  category?: string
}

export const features = [
  showWordCountFeature,
  aiTextEditorFeature
]

export const getFeatureByKey = (key: string) => {
  return features.find(f => f.config.key === key)
}

export const getAllFeatures = () => {
  return features.map(f => f.config)
} 