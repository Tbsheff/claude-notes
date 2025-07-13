import { ExportWorkspaceResponse, ResetFeaturesResponse } from './types'

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
  }
}
