import { execFile } from 'child_process'
import path from 'path'
import { promisify } from 'util'
import fs from 'fs'

const execFileAsync = promisify(execFile)

// Path to the bundled imsg binary
const BINARY_PATH = path.join(
  process.env.NODE_ENV === 'production' ? process.resourcesPath : path.join(__dirname, '..', '..'),
  'vendor',
  'bin',
  'imsg'
)

export interface ImsgConversation {
  id: string
  displayName: string
  participants: string[]
  lastMessage?: string
  lastMessageDate?: string
}

export interface ImsgMessage {
  id: string
  text: string
  date: string
  isFromMe: boolean
  sender?: string
  attachments?: string[]
}

export interface ImsgSendResult {
  success: boolean
  error?: string
}

function getBinaryPath(): string {
  // In development, check vendor/bin relative to project root
  const devPath = path.join(__dirname, '..', '..', 'vendor', 'bin', 'imsg')
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(devPath)) {
    return devPath
  }
  return BINARY_PATH
}

async function runImsg(args: string[]): Promise<string> {
  const binary = getBinaryPath()

  if (!fs.existsSync(binary)) {
    throw new Error(
      'imsg binary not found. Run "npm run download:imsg" to install it.'
    )
  }

  if (process.platform !== 'darwin') {
    throw new Error('imsg is only supported on macOS')
  }

  const { stdout } = await execFileAsync(binary, args, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  })

  return stdout
}

export async function listConversations(): Promise<ImsgConversation[]> {
  const output = await runImsg(['list', '--json'])
  return JSON.parse(output)
}

export async function getMessages(
  conversationId: string,
  limit = 50
): Promise<ImsgMessage[]> {
  const output = await runImsg([
    'messages',
    conversationId,
    '--limit',
    String(limit),
    '--json',
  ])
  return JSON.parse(output)
}

export async function sendMessage(
  recipient: string,
  text: string
): Promise<ImsgSendResult> {
  try {
    await runImsg(['send', recipient, '--text', text])
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function sendFile(
  recipient: string,
  filePath: string
): Promise<ImsgSendResult> {
  try {
    await runImsg(['send', recipient, '--file', filePath])
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function streamMessages(
  onMessage: (message: ImsgMessage) => void,
  signal?: AbortSignal
): Promise<void> {
  const binary = getBinaryPath()

  if (!fs.existsSync(binary)) {
    throw new Error(
      'imsg binary not found. Run "npm run download:imsg" to install it.'
    )
  }

  if (process.platform !== 'darwin') {
    throw new Error('imsg is only supported on macOS')
  }

  return new Promise((resolve, reject) => {
    const child = require('child_process').spawn(binary, ['stream', '--json'])
    let buffer = ''

    child.stdout.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const message = JSON.parse(trimmed)
          onMessage(message)
        } catch {
          // Skip non-JSON lines
        }
      }
    })

    child.on('error', reject)
    child.on('close', resolve)

    signal?.addEventListener('abort', () => {
      child.kill()
      resolve()
    })
  })
}

export function isSupported(): boolean {
  return process.platform === 'darwin' && fs.existsSync(getBinaryPath())
}
