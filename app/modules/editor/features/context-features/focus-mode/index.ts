export { FocusModeProvider, useFocusMode } from './provider'
export type { FocusModeState, FocusModeContextType, FocusModeConfig } from './types'

export const focusModeFeature = {
  config: {
    key: 'focusMode',
    name: 'Focus Mode',
    description: 'Hide header and show focus timer in footer',
    enabled: false,
    category: 'context'
  },
  provider: 'FocusModeProvider',
  hook: 'useFocusMode'
} 