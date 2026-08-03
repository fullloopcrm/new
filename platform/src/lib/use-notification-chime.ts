'use client'

import { useCallback, useEffect, useRef } from 'react'

// Two-tone chime synthesized via Web Audio — no asset to host, no autoplay
// surprises. AudioContext is created lazily on first user gesture since
// browsers block sound before any interaction on the page. Shared by
// ComHub's own new-message alerts and the platform admin's tenant-owner
// message alerts — same sound everywhere a "someone just messaged us" alert
// fires, per Jeff's explicit ask to reuse ComHub's sound rather than invent
// a second one.
export function useNotificationChime() {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const unlock = () => {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctxRef.current = new AC()
      }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  return useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    ;[[880, now, 0.09], [1320, now + 0.09, 0.11]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    })
  }, [])
}

// Requests OS notification permission on first click/keypress, alongside the
// audio unlock — same "needs a user gesture" constraint. Browsers refuse to
// grant permission (and refuse to play sound) before any interaction.
export function useDesktopNotificationPermission() {
  useEffect(() => {
    const ask = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
    document.addEventListener('click', ask, { once: true })
    document.addEventListener('keydown', ask, { once: true })
    return () => {
      document.removeEventListener('click', ask)
      document.removeEventListener('keydown', ask)
    }
  }, [])
}
