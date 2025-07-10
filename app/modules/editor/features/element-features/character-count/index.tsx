import { CharacterCountCore } from './core'
import { CharacterCountConfig } from './types'

export const characterCountFeature = {
  config: {
    key: 'characterCount',
    name: 'Character Count',
    description: 'Display character count statistics',
    enabled: false,
    category: 'element'
  },
  
  create: (config: CharacterCountConfig) => new CharacterCountCore(config),
  
  useFeature: (enabled: boolean) => {
    const core = new CharacterCountCore({ enabled, showSpaces: true, showWithoutSpaces: false })
    return {
      isEnabled: () => core.isEnabled(),
      setEnabled: (enabled: boolean) => core.setEnabled(enabled),
      renderCharacters: (text: string) => core.renderCharacters(text)
    }
  }
}

export function useCharacterCount(text: string, enabled: boolean) {
  const core = new CharacterCountCore({ enabled, showSpaces: true, showWithoutSpaces: false })
  
  return {
    renderCharacters: () => core.renderCharacters(text)
  }
}

export { CharacterCountCore } from './core'
export type { CharacterCountConfig, CharacterCountStats } from './types' 