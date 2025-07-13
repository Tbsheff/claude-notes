const { ipcMain } = require('electron')
import * as settingsService from '../services/settings-service'

export function setupSettingsHandlers() {
  ipcMain.handle('settings:save', (_: any, settings: any) => settingsService.saveSettings(settings))
  ipcMain.handle('settings:load', () => settingsService.loadSettings())
} 