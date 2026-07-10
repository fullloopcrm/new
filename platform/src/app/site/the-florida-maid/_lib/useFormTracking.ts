'use client'

import { useEffect, useRef, useCallback } from 'react'

export function useFormTracking(page: string) {
  const started = useRef(false)
  const completed = useRef(false)
  const lastStep = useRef(0)

  const track = useCallback((action: string, extra?: Record<string, unknown>) => {
    // Pull session context from t.js (sessionStorage/localStorage/cookie)
    let session_id: string | null = null
    let visitor_id: string | null = null
    try { session_id = sessionStorage.getItem('flmaid_sid') } catch {}
    try { visitor_id = localStorage.getItem('flmaid_vid') } catch {}
    if (!visitor_id) {
      try {
        const m = document.cookie.match(/flmaid_vid=([^;]+)/)
        if (m) visitor_id = m[1]
      } catch {}
    }

    const payload: Record<string, unknown> = {
      domain: 'thefloridamaid.com',
      page,
      action,
      session_id,
      visitor_id,
      referrer: document.referrer || 'direct',
      device: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      ...extra,
    }

    if (action === 'form_abandon') {
      navigator.sendBeacon('/api/track', JSON.stringify(payload))
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }
  }, [page])

  const trackStart = useCallback(() => {
    if (!started.current) {
      started.current = true
      track('form_start')
    }
  }, [track])

  const trackStep = useCallback((step: number) => {
    if (step > lastStep.current) {
      lastStep.current = step
      track('form_step', { placement: `step_${step}` })
    }
  }, [track])

  const trackSuccess = useCallback(() => {
    completed.current = true
    track('form_success')
  }, [track])

  // Track abandonment on page leave
  useEffect(() => {
    const handleLeave = () => {
      if (started.current && !completed.current) {
        let sid: string | null = null
        let vid: string | null = null
        try { sid = sessionStorage.getItem('flmaid_sid') } catch {}
        try { vid = localStorage.getItem('flmaid_vid') } catch {}
        const payload: Record<string, unknown> = {
          domain: 'thefloridamaid.com',
          page,
          action: 'form_abandon',
          session_id: sid,
          visitor_id: vid,
          referrer: document.referrer || 'direct',
          device: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }
        if (lastStep.current > 0) payload.placement = `step_${lastStep.current}`
        navigator.sendBeacon('/api/track', JSON.stringify(payload))
      }
    }

    window.addEventListener('beforeunload', handleLeave)
    return () => window.removeEventListener('beforeunload', handleLeave)
  }, [page])

  return { trackStart, trackStep, trackSuccess }
}
