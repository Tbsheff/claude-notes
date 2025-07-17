import { useEffect, useMemo, RefObject } from 'react'

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  
  const debouncedFunc = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T & { cancel: () => void }

  debouncedFunc.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  return debouncedFunc
}

export function useAutoScroll(scrollRef: RefObject<HTMLElement | null>, dependencies: any[], delay = 100) {
  const debouncedScrollToBottom = useMemo(
    () => debounce(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, delay),
    [scrollRef, delay]
  )

  useEffect(() => {
    debouncedScrollToBottom()
  }, dependencies)

  useEffect(() => {
    return () => {
      debouncedScrollToBottom.cancel?.()
    }
  }, [debouncedScrollToBottom])

  return debouncedScrollToBottom
} 