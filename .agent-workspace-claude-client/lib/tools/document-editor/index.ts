import { tool } from 'ai'
import { z } from 'zod'
import { getNoteContent, updateDocument } from '../../../electron/services/document-service'
import { createNote, deleteNote } from '../../../electron/services/note-service'

export function createDocumentEditorTool(context: { noteId: string, noteContent: string }) {
  return tool({
    description: 'Preview document editing actions (create, edit, delete). Actions will only be executed when user clicks Apply. For current document editing use append/replace/prepend/find_and_replace. For new documents use create. For deleting use delete.',
    parameters: z.object({
      action: z.enum(['append', 'replace', 'prepend', 'create', 'delete', 'find_and_replace']).describe('Type of document action'),
      text: z.string().optional().describe('The text to add/replace/create in the document'),
      title: z.string().optional().describe('Title for new document (used with create action)'),

      find: z.string().optional().describe('Text to find (for find_and_replace action)'),
      replace: z.string().optional().describe('Text to replace with (for find_and_replace action)')
    }),
    execute: async ({ action, text, title, find, replace }) => {
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

          case 'find_and_replace':
            if (!find) {
              return { success: false, error: 'find parameter is required for find_and_replace action' }
            }
            if (!replace) {
              return { success: false, error: 'replace parameter is required for find_and_replace action' }
            }
            if (!oldContent.includes(find)) {
              return { success: false, error: `Text "${find}" not found in document` }
            }
            newContent = oldContent.replace(find, replace)
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