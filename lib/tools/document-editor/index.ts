import { tool } from 'ai'
import { z } from 'zod'
import { getNoteContent, updateDocument } from '../../../electron/services/document-service'

export function createDocumentEditorTool(context: { noteId: string, noteContent: string }) {
  return tool({
    description: 'Edit and add text to the current document with streaming preview',
    parameters: z.object({
      action: z.enum(['append', 'replace', 'insert']).describe('Type of editing action'),
      text: z.string().describe('The text to add/replace in the document'),
      position: z.number().optional().describe('Position to insert text (for insert action)')
    }),
    execute: async ({ action, text, position }) => {
      const { noteId, noteContent } = context
      try {
        const oldContent = noteContent
        
        const response = await updateDocument({
          action,
          text,
          position
        })

        if (response?.success) {
          const newContent = action === 'replace' ? text : oldContent + text; // Simplified for now
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
        return { success: false, error: `Error editing document: ${error}` }
      }
    }
  })
} 