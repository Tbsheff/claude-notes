const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const archiver = require('archiver')
import { getNotesDir } from '../utils/notes-helpers'

export function setupGeneralHandlers(getMainWindow: () => any) {
  ipcMain.handle('general:exportWorkspace', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'ZIP Files', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        defaultPath: `workspace-${new Date().toISOString().split('T')[0]}.zip`
      })
      
      if (result.canceled) {
        return { success: false, error: 'Export cancelled' }
      }
      
      return new Promise((resolve) => {
        const output = fs.createWriteStream(result.filePath)
        const archive = archiver('zip', {
          zlib: { level: 9 }
        })
        
        output.on('close', () => {
          console.log('✅ Workspace exported successfully')
          resolve({ success: true, filePath: result.filePath })
        })
        
        archive.on('error', (err) => {
          console.error('❌ Export error:', err.message)
          resolve({ success: false, error: err.message })
        })
        
        archive.pipe(output)
        
        const notesDir = getNotesDir()
        console.log('📁 Notes directory:', notesDir)
        
        if (fs.existsSync(notesDir)) {
          const files = fs.readdirSync(notesDir)
          console.log('📝 Found notes:', files.length)
          
          if (files.length > 0) {
            archive.directory(notesDir, 'notes')
          } else {
            console.log('⚠️ No notes found to export')
          }
        } else {
          console.log('⚠️ Notes directory does not exist')
        }
        
        archive.finalize()
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('general:resetFeatures', async (event, repoUrl: string) => {
    try {
      console.log('🔄 Resetting features from https://github.com/diko0071/ai-editor...')
      
      return new Promise((resolve) => {
        const commands = [
          'git fetch origin',
          'git reset --hard origin/main',
          'npm install'
        ]
        
        const resetProcess = spawn('sh', ['-c', commands.join(' && ')], {
          stdio: 'inherit'
        })
        
        resetProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Features reset successfully, rebuilding...')
            
            const buildProcess = spawn('npm', ['run', 'build'], {
              stdio: 'inherit'
            })
            
            buildProcess.on('close', (buildCode) => {
              if (buildCode === 0) {
                console.log('✅ Project rebuilt, reloading...')
                console.log('📝 Database (notes) preserved')
                const mainWindow = getMainWindow()
                if (mainWindow) {
                  mainWindow.reload()
                }
                resolve({ success: true })
              } else {
                console.error('❌ Build failed after reset')
                resolve({ success: false, error: 'Build failed after reset' })
              }
            })
          } else {
            console.error('❌ Reset failed')
            resolve({ success: false, error: 'Reset failed' })
          }
        })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
} 