import { ExportWorkspaceResponse, ResetFeaturesResponse, ClearDatabaseResponse } from './types'

export function exportTextFile(content: string, filename: string, type: 'markdown' | 'text' = 'text') {
  console.log('exportTextFile called:', { filename, type, contentLength: content.length })
  
  if (!content.trim()) {
    alert('No content to export')
    return
  }
  
  const mimeType = type === 'markdown' ? 'text/markdown' : 'text/plain'
  const extension = type === 'markdown' ? '.md' : '.txt'
  
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith(extension) ? filename : `${filename}${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  console.log('File exported successfully:', a.download)
}

export const generalApi = {
  exportWorkspace: async (): Promise<ExportWorkspaceResponse> => {
    try {
      const result = await window.electronAPI.general.exportWorkspace()
      return result
    } catch (error) {
      console.error('Failed to export workspace:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  },

  resetFeatures: async (repoUrl: string): Promise<ResetFeaturesResponse> => {
    try {
      const result = await window.electronAPI.general.resetFeatures(repoUrl)
      return result
    } catch (error) {
      console.error('Failed to reset features:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  },

  clearDatabase: async (): Promise<ClearDatabaseResponse> => {
    try {
      const result = await window.electronAPI.general.clearDatabase()
      return result
    } catch (error) {
      console.error('Failed to clear database:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}
