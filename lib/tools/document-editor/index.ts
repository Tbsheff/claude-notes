import { tool } from 'ai'
import { z } from 'zod'
import { getNoteContent, updateDocument } from '../../../electron/services/document-service'
import { createNote, deleteNote } from '../../../electron/services/note-service'

export function createDocumentEditorTool(context: { noteId: string, noteContent: string }) {
  return tool({
    description: 'Preview document editing actions (create, edit, delete). Actions will only be executed when user clicks Apply. For current document editing use append/replace/insert. For new documents use create. For deleting use delete.',
    parameters: z.object({
      action: z.enum(['append', 'replace', 'insert', 'prepend', 'create', 'delete']).describe('Type of document action'),
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
          
          return {
            success: true,
            action: 'create',
            oldContent: '',
            newContent: text,
            title: title || 'New Document',
            message: `Will create new document: ${title || 'New Document'}`
          }
        }
        
        if (action === 'delete') {
          return {
            success: true,
            action: 'delete',
            oldContent: noteContent,
            newContent: '',
            message: `Will delete document`
          }
        }
        
        const oldContent = noteContent
        let newContent: string
        
        switch (action) {
          case 'replace':
            newContent = text || ''
            break
          case 'append':
            newContent = oldContent + (text || '')
            break
          case 'prepend':
            newContent = (text || '') + oldContent
            break
          case 'insert':
            if (position !== undefined) {
              newContent = oldContent.slice(0, position) + (text || '') + oldContent.slice(position)
            } else {
              newContent = oldContent + (text || '')
            }
            break
          default:
            newContent = oldContent + (text || '')
        }

        return {
          success: true,
          oldContent,
          newContent,
          action,
          message: `Will ${action} document content`
        }
      } catch (error) {
        return { success: false, error: `Error with document action: ${error}` }
      }
    }
  })
} 