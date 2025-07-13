export const htmlToMarkdown = (html: string): string => {
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
    .replace(new RegExp('<br/>', 'g'), '\n')
    .replace(/&nbsp;/g, ' ')

  result = result.replace(/<ul>(.*?)<\/ul>/gs, (_, content) => {
    return content.replace(/<li>(.*?)<\/li>/g, '- $1\n').trim()
  })

  result = result.replace(/<ol>(.*?)<\/ol>/gs, (_, content) => {
    let counter = 1
    return content.replace(/<li>(.*?)<\/li>/g, () => {
      return `${counter++}. $1\n`
    }).trim()
  })

  return result.trim()
}

export const markdownToHtml = (markdown: string): string => {
  let result = markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')

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

  if (inBulletList) processedLines.push('</ul>')
  if (inNumberedList) processedLines.push('</ol>')

  return processedLines.join('\n').replace(/\n/g, '<br>')
} 