const { ipcMain } = require('electron')
import * as noteService from '../services/note-service'

export function setupNoteStorageHandlers() {
  ipcMain.handle('notes:create', (_: any, title?: string, content?: string) => noteService.createNote(title, content))
  ipcMain.handle('notes:save', (_: any, id: string, content: string, title?: string) => noteService.saveNote(id, content, title))
  ipcMain.handle('notes:load', (_: any, id: string) => noteService.loadNote(id))
  ipcMain.handle('notes:list', () => noteService.listNotes())
  ipcMain.handle('notes:delete', (_: any, id: string) => noteService.deleteNote(id))
} 