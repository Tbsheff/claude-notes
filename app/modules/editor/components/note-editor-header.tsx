import React, { useState, useRef, useEffect } from 'react'
import { Share, MoreHorizontal, FileText, Download, Link, Mail, Copy } from 'lucide-react'

interface NoteEditorHeaderProps {
  createdAt: Date
  isBuilding: boolean
  buildStatus: string
  content: string
}

export function NoteEditorHeader({ createdAt, isBuilding, buildStatus, content }: NoteEditorHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  const handleExport = (format: string) => {
    if (!content.trim()) {
      alert('Nothing to export. Please add some content first.')
      return
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `note-${timestamp}`

    switch (format) {
      case 'txt':
        downloadFile(content, `${filename}.txt`, 'text/plain')
        break
      case 'md':
        downloadFile(content, `${filename}.md`, 'text/markdown')
        break
      case 'html':
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Note - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Note - ${timestamp}</h1>
  <pre>${content}</pre>
</body>
</html>`
        downloadFile(htmlContent, `${filename}.html`, 'text/html')
        break
      case 'copy':
        navigator.clipboard.writeText(content)
        alert('Note copied to clipboard!')
        break
      case 'email':
        const subject = encodeURIComponent(`Note - ${timestamp}`)
        const body = encodeURIComponent(content)
        window.open(`mailto:?subject=${subject}&body=${body}`)
        break
      case 'link':
        const shareableContent = `Note created on ${timestamp}:\n\n${content}`
        navigator.clipboard.writeText(shareableContent)
        alert('Shareable content copied to clipboard!')
        break
    }
    
    setShowExportMenu(false)
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">
          {createdAt.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} at {createdAt.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}
        </span>
      </div>
      
      {isBuilding && (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-blue-600 font-medium">{buildStatus}</span>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <div className="relative" ref={exportMenuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Share className="h-4 w-4 text-gray-600 hover:text-gray-800" />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export as TXT</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export as Markdown</span>
                </button>
                <button
                  onClick={() => handleExport('html')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export as HTML</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => handleExport('copy')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy to Clipboard</span>
                </button>
                <button
                  onClick={() => handleExport('email')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Share via Email</span>
                </button>
                <button
                  onClick={() => handleExport('link')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Link className="h-4 w-4" />
                  <span>Copy Shareable Content</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
          <MoreHorizontal className="h-4 w-4 text-gray-600 hover:text-gray-800" />
        </button>
      </div>
    </div>
  )
} 