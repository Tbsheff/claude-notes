export interface ExportWorkspaceResponse {
  success: boolean
  filePath?: string
  error?: string
}

export interface ResetFeaturesResponse {
  success: boolean
  error?: string
}

export interface ClearDatabaseResponse {
  success: boolean
  error?: string
}

export interface RenameNoteRequest {
  noteId: string
  newTitle: string
}

export interface RenameNoteResponse {
  success: boolean
  note?: any
  error?: string
}
