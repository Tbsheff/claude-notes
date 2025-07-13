import fs from 'fs'

export function readFile(path: string) {
  try {
    return fs.readFileSync(path, 'utf-8')
  } catch {
    return undefined
  }
}

export function writeFile(path: string, content: string) {
  try {
    fs.writeFileSync(path, content)
    return true
  } catch {
    return false
  }
} 