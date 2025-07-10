import { ShowWordCountCore } from './core'
import { ShowWordCountConfig } from './types'
import { useFocusMode } from '../../context-features/focus-mode'

export const showWordCountFeature = {
  config: {
    key: 'showWordCount',
    name: 'Show Word Count',
    description: 'Display word count in the footer',
    enabled: true,
    category: 'element'
  },
  
  create: (config: ShowWordCountConfig) => new ShowWordCountCore(config),
  
  useFeature: (enabled: boolean) => {
    const core = new ShowWordCountCore({ enabled })
    return {
      isEnabled: () => core.isEnabled(),
      setEnabled: (enabled: boolean) => core.setEnabled(enabled),
      renderWords: (text: string) => core.renderWords(text)
    }
  }
}

export function useTextStats(text: string, showWordCount: boolean) {
  const core = new ShowWordCountCore({ enabled: showWordCount })
  
  return {
    renderWords: () => core.renderWords(text)
  }
} 