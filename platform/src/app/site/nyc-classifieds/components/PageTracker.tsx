'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    __track?: (event: string, details?: Record<string, unknown>) => void
  }
}

function sendTrack(payload: Record<string, unknown>) {
  try {
    navigator.sendBeacon('/api/track', JSON.stringify(payload))
  } catch {
    // silent — analytics never breaks UX
  }
}

export default function PageTracker() {
  const pathname = usePathname()
  const lastPath = useRef('')

  useEffect(() => {
    // Expose global tracker for any component to call
    window.__track = (event: string, details?: Record<string, unknown>) => {
      sendTrack({
        type: 'event',
        event,
        path: window.location.pathname,
        referrer: document.referrer || '',
        screenWidth: screen.width,
        details,
      })
    }

    return () => { delete window.__track }
  }, [])

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return
    lastPath.current = pathname

    sendTrack({
      type: 'pageview',
      path: pathname,
      referrer: document.referrer || '',
      screenWidth: screen.width,
    })
  }, [pathname])

  return null
}

/**
 * React hook for client-side event tracking.
 * Returns a stable function: track(event, details?)
 */
export function useTrack() {
  return useCallback((event: string, details?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.__track) {
      window.__track(event, details)
    }
  }, [])
}
