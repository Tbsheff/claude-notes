import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').trim()
}

export function escapeHtml(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function formatShortMonth(date: Date): string {
  return date.toLocaleString("default", { month: "short" })
}

export function cleanMessagePrefix(message: string | undefined, prefix: string): string {
  if (!message) return ''
  return message.replace(`${prefix}: `, '').replace(prefix, '')
}

export class LocalStorage {
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return null
      return JSON.parse(item)
    } catch {
      return localStorage.getItem(key) as T | null
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
      localStorage.setItem(key, serializedValue)
    } catch (error) {
      console.error('Failed to set localStorage item:', error)
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove localStorage item:', error)
    }
  }
}
