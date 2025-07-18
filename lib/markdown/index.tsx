import { Bold, Italic, Underline, Copy, Scissors, Heading1, Heading2, Heading3, List, ListOrdered } from 'lucide-react'

export const htmlToMarkdown = (html: string): string => {
  let result = html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
    .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
    .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')

  result = result.replace(/<pre><code>[\s\S]*?<\/code><\/pre>/g, (match) => {
    const inner = match.replace(/<pre><code>|<\/code><\/pre>/g, '')
    return '\n```\n' + inner.trim() + '\n```\n'
  })

  result = result
    .replace(/<div>/g, '\n')
    .replace(/<\/div>/g, '')
    .replace(/<br\s*\/>?/g, '\n')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/&nbsp;/g, ' ')

  result = result.replace(/<ul>([\s\S]*?)<\/ul>/g, (_, content) => {
    const items = content.replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n')
    return `\n${items.trim()}\n\n`
  })

  result = result.replace(/<ol>([\s\S]*?)<\/ol>/g, (_, content) => {
    let counter = 1
    const items = content.replace(/<li>([\s\S]*?)<\/li>/g, () => `${counter++}. $1\n`)
    return `\n${items.trim()}\n\n`
  })

  return result.trim()
}

import { escapeHtml } from '@/lib/utils'

export const markdownToHtml = (markdown: string): string => {
  const inline = (text: string) => text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')

  const lines = markdown.split('\n')
  const htmlParts: string[] = []
  let inBullet = false
  let inNumber = false
  let inCode = false
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      htmlParts.push(`<p>${inline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '')

    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      if (inCode) {
        htmlParts.push('</code></pre>')
        inCode = false
      } else {
        flushParagraph()
        if (inBullet) { htmlParts.push('</ul>'); inBullet = false }
        if (inNumber) { htmlParts.push('</ol>'); inNumber = false }
        htmlParts.push('<pre><code>')
        inCode = true
      }
      continue
    }

    if (inCode) {
      htmlParts.push(escapeHtml(line))
      continue
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      htmlParts.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`)
      continue
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      if (inNumber) { htmlParts.push('</ol>'); inNumber = false }
      if (!inBullet) { htmlParts.push('<ul>'); inBullet = true }
      htmlParts.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      if (inBullet) { htmlParts.push('</ul>'); inBullet = false }
      if (!inNumber) { htmlParts.push('<ol>'); inNumber = true }
      htmlParts.push(`<li>${inline(numbered[1])}</li>`)
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      if (inBullet) { htmlParts.push('</ul>'); inBullet = false }
      if (inNumber) { htmlParts.push('</ol>'); inNumber = false }
      continue
    }

    paragraph.push(line.trim())
    }

  flushParagraph()
  if (inBullet) htmlParts.push('</ul>')
  if (inNumber) htmlParts.push('</ol>')
  if (inCode) htmlParts.push('</code></pre>')

  return htmlParts.join('')
}

import ReactMarkdown from 'react-markdown'
import { Components } from 'react-markdown'
import { CodeBlock } from '@/components/ui/codeblock'

const markdownComponents: Components = {
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm">{children}</li>
  ),
  p: ({ children }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children, ...props }) => {
    const inline = !props.className?.includes('language-')
    
    if (inline) {
      return <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
    }
    
    const language = props.className?.replace('language-', '') || 'text'
    const codeString = String(children).replace(/\n$/, '')
    
    return (
      <div className="my-4">
        <CodeBlock
          language={language}
          filename=""
          code={codeString}
        />
      </div>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mb-1 mt-3 first:mt-0">{children}</h3>
  ),
}

interface MarkdownRendererProps {
  children: string
  className?: string
}

export const MarkdownRenderer = ({ children, className = '' }: MarkdownRendererProps) => {
  return (
    <div className={className}>
      <ReactMarkdown components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const getMarkdownEditorFeatures = () => {
  const handleFormat = (format: string, editorRef: React.RefObject<HTMLDivElement | null>, setContent: (content: string) => void) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      alert('Please select some text first')
      return
    }

    const selectedText = selection.toString()
    if (!selectedText) {
      alert('Please select some text first')
      return
    }
    
    switch (format) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
      case 'h1':
        document.execCommand('formatBlock', false, 'H1')
        break
      case 'h2':
        document.execCommand('formatBlock', false, 'H2')
        break
      case 'h3':
        document.execCommand('formatBlock', false, 'H3')
        break
      case 'bulletlist':
        document.execCommand('insertUnorderedList', false)
        break
      case 'numberedlist':
        document.execCommand('insertOrderedList', false)
        break
      case 'copy':
        document.execCommand('copy', false)
        break
      case 'cut':
        document.execCommand('cut', false)
        break
    }
    
    if (editorRef.current) {
      editorRef.current.focus()
      setContent(editorRef.current.innerHTML)
    }
  }

  const formatCommands = [
    { key: 'copy', icon: Copy, label: 'Copy', group: 'clipboard' },
    { key: 'cut', icon: Scissors, label: 'Cut', group: 'clipboard' },
    { key: 'bold', icon: Bold, label: 'Bold', group: 'text' },
    { key: 'italic', icon: Italic, label: 'Italic', group: 'text' },
    { key: 'underline', icon: Underline, label: 'Underline', group: 'text' },
    { key: 'h1', icon: Heading1, label: 'Heading 1', group: 'heading' },
    { key: 'h2', icon: Heading2, label: 'Heading 2', group: 'heading' },
    { key: 'h3', icon: Heading3, label: 'Heading 3', group: 'heading' },
    { key: 'bulletlist', icon: List, label: 'Bullet List', group: 'list' },
    { key: 'numberedlist', icon: ListOrdered, label: 'Numbered List', group: 'list' }
  ]

  return {
    handleFormat,
    formatCommands
  }
}