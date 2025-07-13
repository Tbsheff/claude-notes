import React, { useState, useRef, useEffect } from 'react'
import { NoteEditorHeader } from '../components/note-editor-header'
import { NoteEditorFooter } from '../components/note-editor-footer'
import { SelectionToolbar } from '../components/selection-toolbar'
import { NotesSidebar } from '../../general/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { editorApi } from '../api'
import { Note } from '@/types/electron'

export function EditorPage() {
  const [content, setContent] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildStatus, setBuildStatus] = useState('Building...')
  const [aiInitialized, setAiInitialized] = useState(false)
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [createdAt] = useState(new Date())
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [sidebarKey, setSidebarKey] = useState(0)

  const editorRef = useRef<HTMLDivElement>(null)

  const reloadSidebar = () => {
    setSidebarKey(prev => prev + 1)
  }

  const getPlainTextContent = () => {
    if (editorRef.current) {
      return editorRef.current.innerText || ''
    }
    return ''
  }

  const htmlToMarkdown = (html: string): string => {
    let result = html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1')
      .replace(/<h4>(.*?)<\/h4>/g, '#### $1')
      .replace(/<h5>(.*?)<\/h5>/g, '##### $1')
      .replace(/<h6>(.*?)<\/h6>/g, '###### $1')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/<div>/g, '\n')
      .replace(/<\/div>/g, '')
      .replace(/<br>/g, '\n')
      .replace(/<br\/>/g, '\n')
      .replace(/&nbsp;/g, ' ')
    
    // Handle bullet lists
    result = result.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, '- $1\n').trim()
    })
    
    // Handle numbered lists
    result = result.replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      let counter = 1
      return content.replace(/<li>(.*?)<\/li>/g, () => {
        return `${counter++}. $1\n`
      }).trim()
    })
    
    return result.trim()
  }

  const markdownToHtml = (markdown: string): string => {
    let result = markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Handle lists
    const lines = result.split('\n')
    const processedLines: string[] = []
    let inBulletList = false
    let inNumberedList = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isBulletItem = line.match(/^[-*] (.*)$/)
      const isNumberedItem = line.match(/^\d+\. (.*)$/)
      
      if (isBulletItem) {
        if (inNumberedList) {
          processedLines.push('</ol>')
          inNumberedList = false
        }
        if (!inBulletList) {
          processedLines.push('<ul>')
          inBulletList = true
        }
        processedLines.push(`<li>${isBulletItem[1]}</li>`)
      } else if (isNumberedItem) {
        if (inBulletList) {
          processedLines.push('</ul>')
          inBulletList = false
        }
        if (!inNumberedList) {
          processedLines.push('<ol>')
          inNumberedList = true
        }
        processedLines.push(`<li>${isNumberedItem[1]}</li>`)
      } else {
        if (inBulletList) {
          processedLines.push('</ul>')
          inBulletList = false
        }
        if (inNumberedList) {
          processedLines.push('</ol>')
          inNumberedList = false
        }
        processedLines.push(line)
      }
    }
    
    if (inBulletList) {
      processedLines.push('</ul>')
    }
    if (inNumberedList) {
      processedLines.push('</ol>')
    }
    
    return processedLines.join('\n').replace(/\n/g, '<br>')
  }

  const getMarkdownContent = (): string => {
    if (editorRef.current) {
      return htmlToMarkdown(editorRef.current.innerHTML)
    }
    return ''
  }

  const saveCurrentNote = async () => {
    if (!currentNote) return
    
    const markdownContent = getMarkdownContent()
    if (!markdownContent.trim() || markdownContent === lastSavedContent) {
      return
    }

    try {
      const result = await editorApi.saveNote({
        noteId: currentNote.id,
        content: markdownContent,
        title: currentNote.title
      })
      if (result.success && result.data) {
        setCurrentNote(result.data)
        setLastSavedContent(markdownContent)
        reloadSidebar()
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const createNewNote = async (): Promise<void> => {
    const markdownContent = getMarkdownContent()
    if (currentNote && markdownContent !== lastSavedContent) {
      await saveCurrentNote()
    }

    try {
      const createResult = await editorApi.createNote({ title: 'New Note', content: '' })
      if (createResult.success && createResult.data) {
        setCurrentNote(createResult.data)
        setContent('')
        setLastSavedContent('')
        if (editorRef.current) {
          editorRef.current.innerHTML = ''
        }
        reloadSidebar()
      }
    } catch (error) {
      console.error('Failed to create note:', error)
      throw error
    }
  }

  const handleNoteSelect = async (note: Note) => {
    const markdownContent = getMarkdownContent()
    if (currentNote && markdownContent !== lastSavedContent) {
      await saveCurrentNote()
    }

    try {
      const noteResult = await editorApi.loadNote(note.id)
      if (noteResult.success && noteResult.data) {
        setCurrentNote(noteResult.data)
        const htmlContent = markdownToHtml(noteResult.data.content)
        setContent(htmlContent)
        setLastSavedContent(noteResult.data.content)
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlContent
        }
      } else {
        setCurrentNote(note)
        const htmlContent = markdownToHtml(note.content)
        setContent(htmlContent)
        setLastSavedContent(note.content)
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlContent
        }
      }
    } catch (error) {
      setCurrentNote(note)
      const htmlContent = markdownToHtml(note.content)
      setContent(htmlContent)
      setLastSavedContent(note.content)
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent
      }
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const result = await editorApi.deleteNote(noteId)
      if (result.success) {
        reloadSidebar()
        if (currentNote?.id === noteId) {
          const notesResult = await editorApi.listNotes()
          if (notesResult.success && notesResult.data && notesResult.data.length > 0) {
            const nextNote = notesResult.data[0]
            setCurrentNote(nextNote)
            const htmlContent = markdownToHtml(nextNote.content)
            setContent(htmlContent)
            setLastSavedContent(nextNote.content)
            if (editorRef.current) {
              editorRef.current.innerHTML = htmlContent
            }
          } else {
            await createNewNote()
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
  }

  const handleContentInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML
      setContent(htmlContent)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && editorRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        
        // Get the current line text more reliably
        const getCurrentLineText = () => {
          const container = range.startContainer
          let lineText = ''
          
          if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent || ''
            const offset = range.startOffset
            
            // Find the start of current line
            let lineStart = 0
            for (let i = offset - 1; i >= 0; i--) {
              if (text[i] === '\n') {
                lineStart = i + 1
                break
              }
            }
            
            lineText = text.substring(lineStart, offset)
          } else if (container.nodeType === Node.ELEMENT_NODE) {
            // If we're in an element, get its text content
            const element = container as Element
            lineText = element.textContent || ''
          }
          
          return lineText.trim()
        }
        
        const currentLineText = getCurrentLineText()
        console.log('Current line text:', `"${currentLineText}"`)
        
        // Check for header patterns (# ## ### etc.)
        const headerMatch = currentLineText.match(/^(#{1,6})$/)
        if (headerMatch) {
          e.preventDefault()
          const level = headerMatch[1].length
          console.log('Header detected, level:', level)
          
          // Select the # symbols to replace them
          const container = range.startContainer
          if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent || ''
            const offset = range.startOffset
            
            // Find line boundaries
            let lineStart = 0
            for (let i = offset - 1; i >= 0; i--) {
              if (text[i] === '\n') {
                lineStart = i + 1
                break
              }
            }
            
            // Select the # symbols
            const newSelection = window.getSelection()
            newSelection?.removeAllRanges()
            const selectRange = document.createRange()
            selectRange.setStart(container, lineStart)
            selectRange.setEnd(container, offset)
            newSelection?.addRange(selectRange)
            
            // First delete the # symbols
            document.execCommand('delete', false)
            
            // Then create header
            document.execCommand('formatBlock', false, `H${level}`)
            
            setContent(editorRef.current.innerHTML)
          }
          return
        }
        
        // Check for bullet point patterns (- or *)
        const bulletMatch = currentLineText.match(/^(-|\*)$/)
        if (bulletMatch) {
          e.preventDefault()
          console.log('Bullet detected')
          
          const container = range.startContainer
          if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent || ''
            const offset = range.startOffset
            
            // Find line boundaries
            let lineStart = 0
            for (let i = offset - 1; i >= 0; i--) {
              if (text[i] === '\n') {
                lineStart = i + 1
                break
              }
            }
            
            // Select the bullet symbol
            const newSelection = window.getSelection()
            newSelection?.removeAllRanges()
            const selectRange = document.createRange()
            selectRange.setStart(container, lineStart)
            selectRange.setEnd(container, offset)
            newSelection?.addRange(selectRange)
            
            // First delete the bullet symbol
            document.execCommand('delete', false)
            
            // Then create list
            document.execCommand('insertUnorderedList', false)
            
            setContent(editorRef.current.innerHTML)
          }
          return
        }
        
        // Check for numbered list patterns (1. 2. etc.)
        const numberedMatch = currentLineText.match(/^(\d+\.)$/)
        if (numberedMatch) {
          e.preventDefault()
          console.log('Numbered list detected')
          
          const container = range.startContainer
          if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent || ''
            const offset = range.startOffset
            
            // Find line boundaries
            let lineStart = 0
            for (let i = offset - 1; i >= 0; i--) {
              if (text[i] === '\n') {
                lineStart = i + 1
                break
              }
            }
            
            // Select the number and dot
            const newSelection = window.getSelection()
            newSelection?.removeAllRanges()
            const selectRange = document.createRange()
            selectRange.setStart(container, lineStart)
            selectRange.setEnd(container, offset)
            newSelection?.addRange(selectRange)
            
            // First delete the number and dot
            document.execCommand('delete', false)
            
            // Then create numbered list
            document.execCommand('insertOrderedList', false)
            
            setContent(editorRef.current.innerHTML)
          }
          return
        }
      }
    }
  }

  useEffect(() => {
    const initializeAI = async () => {
      try {
        if (!window.electronAPI?.ai) {
          return
        }
        
        const result = await window.electronAPI.ai.initialize({})
        if (result.success) {
          setAiInitialized(true)
        }
      } catch (error) {
        console.error('AI initialization error:', error)
      }
    }

    const loadOrCreateNote = async () => {
      try {
        const notesResult = await editorApi.listNotes()
        if (notesResult.success && notesResult.data && notesResult.data.length > 0) {
          const latestNote = notesResult.data[0]
          setCurrentNote(latestNote)
          const htmlContent = markdownToHtml(latestNote.content)
          setContent(htmlContent)
          setLastSavedContent(latestNote.content)
          if (editorRef.current) {
            editorRef.current.innerHTML = htmlContent
          }
        } else {
          await createNewNote()
        }
      } catch (error) {
        console.error('Failed to load note:', error)
      }
    }

    initializeAI()
    loadOrCreateNote()
  }, [])

  useEffect(() => {
    if (!currentNote) return
    
    const markdownContent = getMarkdownContent()
    if (markdownContent === lastSavedContent) {
      return
    }

    const timer = setTimeout(() => {
      saveCurrentNote()
    }, 1500)

    return () => {
      clearTimeout(timer)
    }
  }, [content, currentNote, lastSavedContent])

  const handleBuild = async () => {
    if (!editorRef.current || !aiInitialized) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      alert('Please select some text first')
      return
    }
    
    const selectedText = selection.toString()
    
    if (!selectedText || selectedText.trim().length === 0) {
      alert('Please select some text first')
      return
    }
    
    if (!window.electronAPI?.ai) {
      alert('Electron API not available')
      return
    }

    setIsBuilding(true)
    setBuildStatus('Building...')

    try {
      const result = await window.electronAPI.ai.processRequest(selectedText)
      
      if (result.success) {
        setBuildStatus('Changes applied, reloading...')
        
        setTimeout(() => {
          setIsBuilding(false)
        }, 3000)
      } else {
        console.error('AI Error:', result.error)
        alert('AI Error: ' + result.error)
        setIsBuilding(false)
      }
    } catch (error) {
      console.error('Build error:', error)
      alert('Build error: ' + error)
      setIsBuilding(false)
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="w-full h-screen max-h-screen flex bg-background">
        <NotesSidebar
          key={sidebarKey}
          currentNote={currentNote}
          onNoteSelect={handleNoteSelect}
          onCreateNote={createNewNote}
          onDeleteNote={handleDeleteNote}
        />
        
        <SidebarInset className="flex flex-col">
          <NoteEditorHeader 
            createdAt={createdAt}
            isBuilding={isBuilding}
            buildStatus={buildStatus}
            content={getMarkdownContent()}
          />

          <div className="flex-1 bg-background relative">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning={true}
              onInput={handleContentInput}
              onKeyDown={handleKeyDown}
              className="w-full h-full resize-none border-none shadow-none p-6 bg-background text-foreground focus:outline-none text-base leading-relaxed empty:before:content-['Start_writing...'] empty:before:text-muted-foreground [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4 [&_h4]:text-lg [&_h4]:font-medium [&_h4]:mb-2 [&_h4]:mt-3 [&_h5]:text-base [&_h5]:font-medium [&_h5]:mb-1 [&_h5]:mt-2 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:mb-1 [&_h6]:mt-2 [&_ul]:list-disc [&_ul]:list-outside [&_ul]:my-2 [&_ul]:pl-6 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:my-2 [&_ol]:pl-6"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
            
            <SelectionToolbar
              content={content}
              setContent={handleContentChange}
              editorRef={editorRef}
              onBuild={handleBuild}
            />
          </div>

          <div className="flex-shrink-0">
            <NoteEditorFooter content={getPlainTextContent()} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
} 