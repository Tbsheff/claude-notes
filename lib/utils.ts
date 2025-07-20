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

export function groupItemsByDate<T>(
  items: T[], 
  getDateFn: (item: T) => Date
): Record<string, T[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return items.reduce((acc: Record<string, T[]>, item) => {
    const itemDate = getDateFn(item)
    let group: string

    if (itemDate >= today) {
      group = "Today"
    } else if (itemDate >= yesterday) {
      group = "Yesterday"
    } else if (itemDate >= sevenDaysAgo) {
      group = "Previous 7 Days"
    } else if (itemDate >= thirtyDaysAgo) {
      group = "Previous 30 Days"
    } else {
      group = "Older"
    }

    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(item)
    return acc
  }, {})
}

export const DATE_GROUPS = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"] as const

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
