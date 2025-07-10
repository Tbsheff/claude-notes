export { TextReviewerCore, useTextReviewer } from './core'
export type { TextReviewerConfig, TextReviewerState, TextRating } from './types'

export const textReviewerFeature = {
  config: {
    key: 'textReviewer',
    name: 'Text Reviewer',
    description: 'AI-powered text quality analysis with emoji ratings',
    enabled: false,
    category: 'content'
  }
}