import React, { useRef, useEffect } from 'react'
import { SelectionToolbar } from './editor-toolbar'

interface EditorProps {
  value: string
  onChange: (html: string) => void
  onBuild: (selected: string) => void
}

export function Editor({ value, onChange, onBuild }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && editorRef.current) {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)

      const getCurrentLineText = () => {
        const container = range.startContainer
        if (container.nodeType === Node.TEXT_NODE) {
          const text = container.textContent || ''
          const offset = range.startOffset
          let start = 0
          for (let i = offset - 1; i >= 0; i--) {
            if (text[i] === '\n') {
              start = i + 1
              break
            }
          }
          return text.substring(start, offset).trim()
        }
        if (container.nodeType === Node.ELEMENT_NODE) {
          return (container as Element).textContent?.trim() || ''
        }
        return ''
      }

      const current = getCurrentLineText()

      const header = current.match(/^(#{1,6})$/)
      if (header) {
        e.preventDefault()
        const level = header[1].length
        execListAction(range, level, 'header')
        return
      }

      const bullet = current.match(/^(-|\*)$/)
      if (bullet) {
        e.preventDefault()
        execListAction(range, 0, 'ul')
        return
      }

      const numbered = current.match(/^(\d+\.)$/)
      if (numbered) {
        e.preventDefault()
        execListAction(range, 0, 'ol')
      }
    }
  }

  const execListAction = (range: Range, level: number, type: 'header' | 'ul' | 'ol') => {
    const container = range.startContainer
    if (container.nodeType !== Node.TEXT_NODE) return
    const text = container.textContent || ''
    const offset = range.startOffset
    let start = 0
    for (let i = offset - 1; i >= 0; i--) {
      if (text[i] === '\n') {
        start = i + 1
        break
      }
    }
    const sel = window.getSelection()
    sel?.removeAllRanges()
    const r = document.createRange()
    r.setStart(container, start)
    r.setEnd(container, offset)
    sel?.addRange(r)
    document.execCommand('delete')
    if (type === 'header') document.execCommand('formatBlock', false, `H${level}`)
    if (type === 'ul') document.execCommand('insertUnorderedList')
    if (type === 'ol') document.execCommand('insertOrderedList')
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const handleBuildRequest = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const selected = selection.toString()
    if (!selected.trim()) return
    onBuild(selected)
  }

  return (
    <div className="flex-1 bg-background relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="w-full h-full resize-none border-none shadow-none p-6 bg-background text-foreground focus:outline-none text-base leading-relaxed empty:before:content-['Start_writing...'] empty:before:text-muted-foreground [&_p]:my-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4 [&_h4]:text-lg [&_h4]:font-medium [&_h4]:mb-2 [&_h4]:mt-3 [&_h5]:text-base [&_h5]:font-medium [&_h5]:mb-1 [&_h5]:mt-2 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:mb-1 [&_h6]:mt-2 [&_ul]:list-disc [&_ul]:list-outside [&_ul]:my-2 [&_ul]:pl-6 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:my-2 [&_ol]:pl-6"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      />
      <SelectionToolbar
        content={value}
        setContent={(html) => onChange(html)}
        editorRef={editorRef}
        onBuild={handleBuildRequest}
      />
    </div>
  )
} 