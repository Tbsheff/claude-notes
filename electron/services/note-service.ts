import fs from 'fs'
import path from 'path'
const { app } = require('electron')
import type { Note, NoteMetadata } from '../../app/modules/editor/api/types'

export function getNotesDir(): string {
  const projectRoot = path.resolve(__dirname, '../../../')
  const notesDir = path.join(projectRoot, 'data', 'notes')
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })
  return notesDir
}

export function getSettingsPath(): string {
  const projectRoot = path.resolve(__dirname, '../../../')
  const dir = path.join(projectRoot, 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'settings.json')
}

export function getIndexPath(): string {
  const projectRoot = path.resolve(__dirname, '../../../')
  const dir = path.join(projectRoot, 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'index.json')
}

export function generateNoteId(): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const randomStr = Math.random().toString(36).substr(2, 6)
  return `${dateStr}-${randomStr}`
}

export function getNotePath(noteId: string): string {
  return path.join(getNotesDir(), `${noteId}.md`)
}

function parseMarkdown(content: string): { frontmatter: any; body: string } {
  const lines = content.split('\n')
  if (lines[0] !== '---') return { frontmatter: {}, body: content }
  let end = lines.indexOf('---', 1)
  if (end === -1) return { frontmatter: {}, body: content }
  const frontLines = lines.slice(1, end)
  const fm: any = {}
  for (const l of frontLines) {
    const m = l.match(/^(\w+):\s*"(.+)"$/)
    if (m) fm[m[1]] = m[2]
  }
  return { frontmatter: fm, body: lines.slice(end + 1).join('\n').trim() }
}

export function createMarkdown(note: Note): string {
  const front = ['---', `title: "${note.title}"`, `created: "${note.createdAt}"`, `updated: "${note.updatedAt}"`, '---', ''].join('\n')
  return front + note.content
}

export function loadIndex(): { notes: NoteMetadata[] } {
  const idxPath = getIndexPath()
  if (!fs.existsSync(idxPath)) return { notes: [] }
  try {
    return JSON.parse(fs.readFileSync(idxPath, 'utf-8'))
  } catch {
    return { notes: [] }
  }
}

export function saveIndex(index: { notes: NoteMetadata[] }) {
  fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2))
}

export function createNoteFromMarkdown(noteId: string, md: string): Note {
  const { frontmatter, body } = parseMarkdown(md)
  return {
    id: noteId,
    title: frontmatter.title || 'Untitled Note',
    content: body,
    createdAt: frontmatter.created || new Date().toISOString(),
    updatedAt: frontmatter.updated || new Date().toISOString(),
  }
}

function getNoteMetadata(note: Note): NoteMetadata {
  return {
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

export async function createNote(title = 'Untitled Note', content = '') {
  try {
    const id = generateNoteId()
    const now = new Date().toISOString()

    const note: Note = {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    }

    const path = getNotePath(id)
    fs.writeFileSync(path, createMarkdown(note))

    const index = loadIndex()
    index.notes.push(getNoteMetadata(note))
    index.notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    saveIndex(index)

    return { success: true, note }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function saveNote(noteId: string, content: string, title?: string) {
  try {
    const notePath = getNotePath(noteId)
    if (!fs.existsSync(notePath)) return { success: false, error: 'Note not found' }

    const existing = createNoteFromMarkdown(noteId, fs.readFileSync(notePath, 'utf-8'))
    const updated: Note = {
      ...existing,
      title: title || existing.title,
      content,
      updatedAt: new Date().toISOString(),
    }

    fs.writeFileSync(notePath, createMarkdown(updated))

    const index = loadIndex()
    const idx = index.notes.findIndex((n) => n.id === noteId)
    if (idx !== -1) index.notes[idx] = getNoteMetadata(updated)
    else index.notes.push(getNoteMetadata(updated))
    index.notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    saveIndex(index)

    return { success: true, note: updated }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function loadNote(noteId: string) {
  try {
    const notePath = getNotePath(noteId)
    if (!fs.existsSync(notePath)) return { success: false, error: 'Note not found' }
    const markdown = fs.readFileSync(notePath, 'utf-8')
    return { success: true, note: createNoteFromMarkdown(noteId, markdown) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function listNotes() {
  try {
    const index = loadIndex()
    return { success: true, notes: index.notes }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteNote(noteId: string) {
  try {
    const notePath = getNotePath(noteId)
    if (!fs.existsSync(notePath)) return { success: false, error: 'Note not found' }
    fs.unlinkSync(notePath)
    const index = loadIndex()
    index.notes = index.notes.filter((n) => n.id !== noteId)
    saveIndex(index)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
} 
