import { useEffect } from 'react'
import { markdownToHtml } from '@/lib/markdown'

interface UseDocumentSyncProps {
  setContent: (content: string | ((prev: string) => string)) => void
}

export function useDocumentSync({ setContent }: UseDocumentSyncProps) {
  useEffect(() => {
    if (!window.electronAPI) return
    
    const handleDocumentUpdate = (_event: any, request: any) => {
      const { action, text, position } = request
      
      setContent(currentContent => {
        switch (action) {
          case 'append':
            return currentContent + markdownToHtml(text)
          case 'replace':
            return markdownToHtml(text)
          case 'insert':
            if (position !== undefined) {
              return currentContent.slice(0, position) + markdownToHtml(text) + currentContent.slice(position)
            }
            return currentContent + markdownToHtml(text)
          default:
            return currentContent
        }
      })
    }

    window.electronAPI.ipcRenderer.on('document-update', handleDocumentUpdate)

    return () => {
      window.electronAPI.ipcRenderer.removeListener('document-update', handleDocumentUpdate)
    }
  }, [setContent])
} 