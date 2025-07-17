import fs from 'fs'
import path from 'path'
import { db } from '../../lib/db'
import { notesIndex } from '../../lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { Note, NoteMetadata } from '../../app/modules/editor/api/types'

export function getNotesDir(): string {
  const projectRoot = path.resolve(__dirname, '../../../')
  const notesDir = path.join(projectRoot, 'data', 'notes')
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })
  return notesDir
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

function dbListNotes(): NoteMetadata[] {
  const rows = db.select().from(notesIndex).orderBy(desc(notesIndex.updatedAt)).all()
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title ?? 'Untitled Note',
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString()
  }))
}

function upsertNoteMetadata(meta: NoteMetadata, filePath: string) {
  const exists = db.select().from(notesIndex).where(eq(notesIndex.id, meta.id)).get()
  if (exists) {
    db.update(notesIndex).set({
      title: meta.title,
      filePath,
      updatedAt: Date.parse(meta.updatedAt)
    }).where(eq(notesIndex.id, meta.id)).run()
  } else {
    db.insert(notesIndex).values({
      id: meta.id,
      title: meta.title,
      filePath,
      createdAt: Date.parse(meta.createdAt),
      updatedAt: Date.parse(meta.updatedAt)
    }).run()
  }
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

    const filePath = getNotePath(id)
    fs.writeFileSync(filePath, createMarkdown(note))

    upsertNoteMetadata(getNoteMetadata(note), filePath)

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

    upsertNoteMetadata(getNoteMetadata(updated), notePath)

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
    const notes = dbListNotes()
    return { success: true, notes }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteNote(noteId: string) {
  try {
    const notePath = getNotePath(noteId)
    if (fs.existsSync(notePath)) {
      fs.unlinkSync(notePath)
    }
    db.delete(notesIndex).where(eq(notesIndex.id, noteId)).run()
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
} 
