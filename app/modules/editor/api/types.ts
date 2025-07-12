export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface EditorSettings {
  features: Record<string, boolean>
  lastOpenedNote?: string
}

export interface CreateNoteRequest {
  title?: string
  content?: string
}

export interface SaveNoteRequest {
  noteId: string
  content: string
  title?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface NotesApiResponse extends ApiResponse<Note> {
  data?: Note
}

export interface NotesListApiResponse extends ApiResponse<Note[]> {
  data?: Note[]
}

export interface SettingsApiResponse extends ApiResponse<EditorSettings> {
  data?: EditorSettings
} 