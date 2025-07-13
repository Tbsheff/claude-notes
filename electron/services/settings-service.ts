import fs from 'fs'
import { getSettingsPath } from './note-service'

export function saveSettings(settings: any) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2))
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function loadSettings() {
  try {
    const path = getSettingsPath()
    if (!fs.existsSync(path)) {
      return {
        success: true,
        settings: { apiKeys: { anthropicApiKey: '' }, theme: 'light', features: {} },
      }
    }
    const s = JSON.parse(fs.readFileSync(path, 'utf-8'))
    if (!s.apiKeys) s.apiKeys = { anthropicApiKey: '' }
    return { success: true, settings: s }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
} 