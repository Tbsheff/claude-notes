import { db } from '../../lib/db'
import { settings as settingsTable } from '../../lib/db/schema'

export function saveSettings(settings: any) {
  try {
    db.delete(settingsTable).run()
    Object.entries(settings).forEach(([key, value]) => {
      db.insert(settingsTable)
        .values({ key, value: JSON.stringify(value) })
        .run()
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function loadSettings() {
  try {
    const rows = db.select().from(settingsTable).all()
    if (rows.length === 0) {
      return {
        success: true,
        settings: { apiKeys: { anthropicApiKey: '' }, theme: 'light', features: {} }
      }
    }
    const obj: any = {}
    rows.forEach((r) => {
      if (r.value === null) {
        obj[r.key] = null
        return
      }
      try {
        obj[r.key] = JSON.parse(r.value)
      } catch {
        obj[r.key] = r.value
      }
    })
    if (!obj.apiKeys) obj.apiKeys = { anthropicApiKey: '' }
    return { success: true, settings: obj }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
} 