'use client'

import { useEffect, useRef, useCallback } from 'react'

export function useFormTracking(page: string) {
  const started = useRef(false)
  const completed = useRef(false)
  const lastStep = useRef(0)

  const track = useCallback((action: string, extra?: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {
      page,
      action,
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
        const payload: Record<string, unknown> = {
          page,
          action: 'form_abandon',
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
