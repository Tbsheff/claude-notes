import { createWindow as _createWindow, getMainWindow } from './electron/main'
import { setupAIHandlers, getChangedFiles } from './electron/handlers/ai-handlers'
import { setupAppHandlers } from './electron/handlers/app-handlers'
import { setupFileHandlers } from './electron/handlers/file-handlers'
import { setupNoteStorageHandlers } from './electron/handlers/note-handlers'
import { setupSettingsHandlers } from './electron/handlers/settings-handlers'
import { setupGeneralHandlers } from './electron/handlers/general-handlers'
import { setupFileWatcher } from './electron/utils/file-watcher'

const fileWatcher = setupFileWatcher(getMainWindow, getChangedFiles)

setupAIHandlers(fileWatcher.rebuildAfterClaudeFinished)
setupAppHandlers(getMainWindow)
setupFileHandlers(getMainWindow)
setupNoteStorageHandlers()
setupSettingsHandlers()
setupGeneralHandlers(getMainWindow)

 