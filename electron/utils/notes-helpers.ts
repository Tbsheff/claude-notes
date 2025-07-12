const { app } = require('electron')
const fs = require('fs')
const path = require('path')
import { Note } from '../../types/electron'

export function getNotesDir(): string {
  const documentsPath = app.getPath('documents')
  const notesDir = path.join(documentsPath, 'AIEditor', 'notes')
  
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true })
  }
  
  return notesDir
}

export function getSettingsPath(): string {
  const documentsPath = app.getPath('documents')
  const settingsDir = path.join(documentsPath, 'AIEditor')
  
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true })
  }
  
  return path.join(settingsDir, 'settings.json')
}

export function getIndexPath(): string {
  const documentsPath = app.getPath('documents')
  const aiEditorDir = path.join(documentsPath, 'AIEditor')
  
  if (!fs.existsSync(aiEditorDir)) {
    fs.mkdirSync(aiEditorDir, { recursive: true })
  }
  
  return path.join(aiEditorDir, 'index.json')
}

export function generateNoteId(): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const randomStr = Math.random().toString(36).substr(2, 6)
  return `${dateStr}-${randomStr}`
}

export function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50)
}

export function getNotePath(noteId: string): string {
  return path.join(getNotesDir(), `${noteId}.md`)
}

export function parseMarkdown(content: string): { frontmatter: any, body: string } {
  const lines = content.split('\n')
  
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: content }
  }
  
  let frontmatterEnd = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      frontmatterEnd = i
      break
    }
  }
  
  if (frontmatterEnd === -1) {
    return { frontmatter: {}, body: content }
  }
  
  const frontmatterLines = lines.slice(1, frontmatterEnd)
  const frontmatter: any = {}
  
  frontmatterLines.forEach(line => {
    const match = line.match(/^(\w+):\s*"(.+)"$/)
    if (match) {
      frontmatter[match[1]] = match[2]
    }
  })
  
  const body = lines.slice(frontmatterEnd + 1).join('\n').trim()
  
  return { frontmatter, body }
}

export function createMarkdown(note: Note): string {
  const frontmatter = [
    '---',
    `title: "${note.title}"`,
    `created: "${note.createdAt}"`,
    `updated: "${note.updatedAt}"`,
    '---',
    ''
  ].join('\n')
  
  return frontmatter + note.content
}

export function loadIndex(): { notes: Note[] } {
  const indexPath = getIndexPath()
  
  if (!fs.existsSync(indexPath)) {
    return { notes: [] }
  }
  
  try {
    const content = fs.readFileSync(indexPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('Failed to parse index.json:', error)
    return { notes: [] }
  }
}

export function saveIndex(index: { notes: Note[] }): void {
  const indexPath = getIndexPath()
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
}

export function createNoteFromMarkdown(noteId: string, markdownContent: string): Note {
  const { frontmatter, body } = parseMarkdown(markdownContent)
  
  return {
    id: noteId,
    title: frontmatter.title || 'Untitled Note',
    content: body,
    createdAt: frontmatter.created || new Date().toISOString(),
    updatedAt: frontmatter.updated || new Date().toISOString()
  }
} 