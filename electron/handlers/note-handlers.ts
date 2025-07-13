const { ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
import { Note } from '../../types/electron'
import {
  generateNoteId,
  getNotePath,
  createMarkdown,
  createNoteFromMarkdown,
  loadIndex,
  saveIndex
} from '../utils/notes-helpers'

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
      const markdownContent = createMarkdown(note)
      fs.writeFileSync(notePath, markdownContent)
      
      const index = loadIndex()
      index.notes.push(note)
      index.notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      saveIndex(index)
      
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
      
      const existingMarkdown = fs.readFileSync(notePath, 'utf-8')
      const existingNote = createNoteFromMarkdown(noteId, existingMarkdown)
      
      const updatedNote: Note = {
        ...existingNote,
        title: title || existingNote.title,
        content,
        updatedAt: new Date().toISOString()
      }
      
      const markdownContent = createMarkdown(updatedNote)
      fs.writeFileSync(notePath, markdownContent)
      
      const index = loadIndex()
      const noteIndex = index.notes.findIndex(n => n.id === noteId)
      if (noteIndex !== -1) {
        index.notes[noteIndex] = updatedNote
      } else {
        index.notes.push(updatedNote)
      }
      index.notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      saveIndex(index)
      
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
      
      const markdownContent = fs.readFileSync(notePath, 'utf-8')
      const note = createNoteFromMarkdown(noteId, markdownContent)
      
      return { success: true, note }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('notes:list', async () => {
    try {
      const index = loadIndex()
      return { success: true, notes: index.notes }
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
      
      const index = loadIndex()
      index.notes = index.notes.filter(n => n.id !== noteId)
      saveIndex(index)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

} 