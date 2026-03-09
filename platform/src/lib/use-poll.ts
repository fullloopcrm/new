'use client'

import { useEffect, useRef } from 'react'

// Auto-refresh hook - calls callback every intervalMs
export function usePoll(callback: () => void, intervalMs: number = 30000, enabled: boolean = true) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => savedCallback.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
