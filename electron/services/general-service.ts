const fs = require('fs')
const { spawn } = require('child_process')
const archiver = require('archiver')
import { getNotesDir } from './note-service'
import { db } from '../../lib/db'
import { chats, messages, notesIndex, settings } from '../../lib/db/schema'

export function exportWorkspace(zipPath: string) {
  return new Promise((resolve) => {
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    output.on('close', () => resolve({ success: true, filePath: zipPath }))
    archive.on('error', (err: any) => resolve({ success: false, error: err.message }))
    archive.pipe(output)
    const notesDir = getNotesDir()
    if (fs.existsSync(notesDir)) archive.directory(notesDir, 'notes')
    archive.finalize()
  })
}

export function resetFeatures(repoUrl: string, onReload: () => void) {
  return new Promise((resolve) => {
    const cmds = ['git fetch origin', 'git reset --hard origin/main', 'npm install']
    const p = spawn('sh', ['-c', cmds.join(' && ')], { stdio: 'inherit' })
    p.on('close', (code: number) => {
      if (code !== 0) return resolve({ success: false, error: 'Reset failed' })
      const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
      build.on('close', (b: number) => {
        if (b !== 0) return resolve({ success: false, error: 'Build failed after reset' })
        onReload()
        resolve({ success: true })
      })
    })
  })
}

export async function clearDatabase() {
  try {
    await db.delete(messages)
    await db.delete(chats)
    await db.delete(notesIndex)
    await db.delete(settings)
    
    const notesDir = getNotesDir()
    if (fs.existsSync(notesDir)) {
      fs.rmSync(notesDir, { recursive: true, force: true })
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
} 