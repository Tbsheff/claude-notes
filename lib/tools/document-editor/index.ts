import { tool } from 'ai'
import { z } from 'zod'

export const documentEditorTool = tool({
  description: 'Edit and add text to the current document with streaming preview',
  parameters: z.object({
    action: z.enum(['append', 'replace', 'insert']).describe('Type of editing action'),
    text: z.string().describe('The text to add/replace in the document'),
    position: z.number().optional().describe('Position to insert text (for insert action)')
  }),
  execute: async ({ action, text, position }) => {
    try {
      const { updateDocument } = await import('../../../electron/services/document-service')
      
      const response = await updateDocument({
        action,
        text,
        position
      })
      
      if (response?.success) {
        return {
          success: true,
          message: `Document ${action}ed successfully. ${text.length} characters processed.`,
          action,
          textLength: text.length
        }
      } else {
        return {
          success: false,
          error: response?.error || 'Failed to update document'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Error editing document: ${error}`
      }
    }
  }
}) 