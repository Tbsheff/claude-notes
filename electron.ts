import { createWindow as _createWindow, getMainWindow } from './electron/main'
import { setupAIHandlers } from './electron/ipc/ai-handlers'
import { getChangedFiles } from './electron/services/ai-service'
import { setupAppHandlers } from './electron/ipc/app-handlers'
import { setupFileHandlers } from './electron/ipc/file-handlers'
import { setupNoteStorageHandlers } from './electron/ipc/note-handlers'
import { setupSettingsHandlers } from './electron/ipc/settings-handlers'
import { setupGeneralHandlers } from './electron/ipc/general-handlers'
import { setupDocumentHandlers } from './electron/ipc/document-handlers'
import { setupAuthHandlers } from './electron/ipc/auth-handlers'
import { setupFileWatcher } from './electron/services/file-watcher-service'

const fileWatcher = setupFileWatcher(getMainWindow, getChangedFiles)

setupAIHandlers(fileWatcher.rebuildAfterClaudeFinished)
setupAppHandlers(getMainWindow)
setupFileHandlers(getMainWindow)
setupNoteStorageHandlers()
setupSettingsHandlers()
setupGeneralHandlers(getMainWindow)
setupDocumentHandlers(getMainWindow)
setupAuthHandlers()

 