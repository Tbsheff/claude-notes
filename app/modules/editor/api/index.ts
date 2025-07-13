import { 
  EditorSettings, 
  CreateNoteRequest, 
  SaveNoteRequest, 
  NotesApiResponse, 
  NotesListApiResponse, 
  SettingsApiResponse 
} from './types'

class EditorApi {
  async createNote(request: CreateNoteRequest): Promise<NotesApiResponse> {
    try {
      const result = await window.electronAPI.notes.create(request.title, request.content)
      return {
        success: result.success,
        data: result.note,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async saveNote(request: SaveNoteRequest): Promise<NotesApiResponse> {
    try {
      const result = await window.electronAPI.notes.save(request.noteId, request.content, request.title)
      return {
        success: result.success,
        data: result.note,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async loadNote(noteId: string): Promise<NotesApiResponse> {
    try {
      const result = await window.electronAPI.notes.load(noteId)
      return {
        success: result.success,
        data: result.note,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async listNotes(): Promise<NotesListApiResponse> {
    try {
      const result = await window.electronAPI.notes.list()
      return {
        success: result.success,
        data: result.notes,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async deleteNote(noteId: string): Promise<{ success: boolean, error?: string }> {
    try {
      const result = await window.electronAPI.notes.delete(noteId)
      return {
        success: result.success,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async saveSettings(settings: EditorSettings): Promise<SettingsApiResponse> {
    try {
      const appSettings = {
        apiKeys: { anthropicApiKey: '' },
        features: settings.features,
        theme: 'light' as const
      }
      const result = await window.electronAPI.settings.save(appSettings)
      return {
        success: result.success,
        data: settings,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async loadSettings(): Promise<SettingsApiResponse> {
    try {
      const result = await window.electronAPI.settings.load()
      if (result.success && result.settings) {
        return {
          success: true,
          data: result.settings as EditorSettings
        }
      }
      return {
        success: false,
        error: result.error || 'Settings not found'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const editorApi = new EditorApi()
export * from './types' 