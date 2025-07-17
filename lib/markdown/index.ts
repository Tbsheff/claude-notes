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

export const markdownToHtml = (markdown: string): string => {
  const escapeHtml = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
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