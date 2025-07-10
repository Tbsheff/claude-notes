export interface CharacterCountConfig {
  enabled: boolean
  showSpaces: boolean
  showWithoutSpaces: boolean
}

export interface CharacterCountStats {
  total: number
  withoutSpaces: number
  spaces: number
} 