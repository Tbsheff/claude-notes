const { ipcMain } = require('electron')
const fs = require('fs')
import { getSettingsPath } from '../utils/notes-helpers'

export function setupSettingsHandlers() {
  ipcMain.handle('settings:save', async (event, settings: any) => {
    try {
      const settingsPath = getSettingsPath()
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('settings:load', async () => {
    try {
      const settingsPath = getSettingsPath()
      
      if (!fs.existsSync(settingsPath)) {
        const defaultSettings = {
          apiKeys: {
            anthropicApiKey: ''
          },
          theme: 'light',
          features: {}
        }
        return { success: true, settings: defaultSettings }
      }
      
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      
      if (!settings.apiKeys) {
        settings.apiKeys = {
          anthropicApiKey: ''
        }
      }
      
      return { success: true, settings }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
} 