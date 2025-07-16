import { tool } from 'ai'
import { z } from 'zod'
import { getNoteContent, updateDocument } from '../../../electron/services/document-service'
import { createNote, deleteNote } from '../../../electron/services/note-service'

export function createDocumentEditorTool(context: { noteId: string, noteContent: string }) {
  return tool({
    description: 'Edit, create, and delete documents. For current document editing use append/replace/insert. For new documents use create. For deleting use delete.',
    parameters: z.object({
      action: z.enum(['append', 'replace', 'insert', 'create', 'delete']).describe('Type of document action'),
      text: z.string().optional().describe('The text to add/replace/create in the document'),
      title: z.string().optional().describe('Title for new document (used with create action)'),
      position: z.number().optional().describe('Position to insert text (for insert action)')
    }),
    execute: async ({ action, text, title, position }) => {
      const { noteId, noteContent } = context
      
      try {
        if (action === 'create') {
          if (!text) {
            return { success: false, error: 'Text is required for create action' }
          }
          
          const response = await createNote(title || 'New Document', text)
          
          if (response?.success && response.note) {
            return {
              success: true,
              action: 'create',
              newNote: response.note,
              oldContent: '',
              newContent: text,
              message: `Created new document: ${response.note.title}`
            }
          } else {
            return { success: false, error: response?.error || 'Failed to create document' }
          }
        }
        
        if (action === 'delete') {
          const response = await deleteNote(noteId)
          
          if (response?.success) {
            return {
              success: true,
              action: 'delete',
              oldContent: noteContent,
              newContent: '',
              message: `Deleted document successfully`
            }
          } else {
            return { success: false, error: response?.error || 'Failed to delete document' }
          }
        }
        
        const oldContent = noteContent
        
        const response = await updateDocument({
          action,
          text: text || '',
          position
        })

        if (response?.success) {
          const newContent = action === 'replace' ? text : oldContent + text
          return {
            success: true,
            oldContent,
            newContent,
            action,
          }
        } else {
          return { success: false, error: response?.error || 'Failed to update document' }
        }
      } catch (error) {
        return { success: false, error: `Error with document action: ${error}` }
      }
    }
  })
} 