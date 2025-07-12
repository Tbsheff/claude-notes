import { createWindow as _createWindow, getMainWindow } from './electron/main'
import { setupAIHandlers, getChangedFiles } from './electron/handlers/ai-handlers'
import { setupAppHandlers } from './electron/handlers/app-handlers'
import { setupFileHandlers } from './electron/handlers/file-handlers'
import { setupNoteStorageHandlers } from './electron/handlers/note-storage-handlers'
import { setupFileWatcher } from './electron/utils/file-watcher'

const fileWatcher = setupFileWatcher(getMainWindow, getChangedFiles)

setupAIHandlers(fileWatcher.rebuildAfterClaudeFinished)
setupAppHandlers(getMainWindow)
setupFileHandlers(getMainWindow)
setupNoteStorageHandlers()

 