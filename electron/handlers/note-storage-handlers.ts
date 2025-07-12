const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')
import { Note } from '../../types/electron'

function getNotesDir(): string {
  const documentsPath = app.getPath('documents')
  const notesDir = path.join(documentsPath, 'AIEditor', 'notes')
  
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true })
  }
  
  return notesDir
}

function getSettingsPath(): string {
  const documentsPath = app.getPath('documents')
  const settingsDir = path.join(documentsPath, 'AIEditor')
  
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true })
  }
  
  return path.join(settingsDir, 'settings.json')
}

function generateNoteId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
}

function getNotePath(noteId: string): string {
  return path.join(getNotesDir(), `${noteId}.json`)
}

export function setupNoteStorageHandlers() {
  ipcMain.handle('notes:create', async (event, title?: string, content?: string) => {
    try {
      const noteId = generateNoteId()
      const now = new Date().toISOString()
      
      const note: Note = {
        id: noteId,
        title: title || 'Untitled Note',
        content: content || '',
        createdAt: now,
        updatedAt: now
      }
      
      const notePath = getNotePath(noteId)
      fs.writeFileSync(notePath, JSON.stringify(note, null, 2))
      
      return { success: true, note }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('notes:save', async (event, noteId: string, content: string, title?: string) => {
    try {
      const notePath = getNotePath(noteId)
      
      if (!fs.existsSync(notePath)) {
        return { success: false, error: 'Note not found' }
      }
      
      const existingNote = JSON.parse(fs.readFileSync(notePath, 'utf-8'))
      
      const updatedNote: Note = {
        ...existingNote,
        content,
        title: title || existingNote.title,
        updatedAt: new Date().toISOString()
      }
      
      fs.writeFileSync(notePath, JSON.stringify(updatedNote, null, 2))
      
      return { success: true, note: updatedNote }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('notes:load', async (event, noteId: string) => {
    try {
      const notePath = getNotePath(noteId)
      
      if (!fs.existsSync(notePath)) {
        return { success: false, error: 'Note not found' }
      }
      
      const note = JSON.parse(fs.readFileSync(notePath, 'utf-8'))
      
      return { success: true, note }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('notes:list', async () => {
    try {
      const notesDir = getNotesDir()
      const files = fs.readdirSync(notesDir)
      
      const notes: Note[] = []
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(notesDir, file)
            const note = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            notes.push(note)
          } catch (error) {
            console.warn(`Failed to read note file ${file}:`, error)
          }
        }
      }
      
      notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      
      return { success: true, notes }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('notes:delete', async (event, noteId: string) => {
    try {
      const notePath = getNotePath(noteId)
      
      if (!fs.existsSync(notePath)) {
        return { success: false, error: 'Note not found' }
      }
      
      fs.unlinkSync(notePath)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

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
        return { success: false, error: 'Settings not found' }
      }
      
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      return { success: true, settings }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
} 