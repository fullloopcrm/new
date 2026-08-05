'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

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

// A real, persistent phone ringtone — start()/stop() control a loop, unlike
// useNotificationChime's single fire-and-forget chirp. Built specifically
// because a two-tone chime doesn't read as "your phone is ringing, answer
// it" the way an actual ring-ring/pause pattern does — feedback from a live
// incoming call where the chime alone wasn't registering as urgent. Same
// "ring ring" synth already used by the Loop Phone softphone widget for its
// own inbound state, factored out here so the ComHub call bar (which has no
// live call object to key off, just polled DB status) gets the identical
// sound instead of inventing a second one.
export function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (ctxRef.current) {
      if (ctxRef.current.state === 'suspended') void ctxRef.current.resume().catch(() => null)
      return ctxRef.current
    }
    try {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctxRef.current = new AC()
      return ctxRef.current
    } catch {
      return null
    }
  }, [])

  const playBurst = useCallback(() => {
    const ctx = getCtx()
    if (!ctx || ctx.state === 'closed') return
    const now = ctx.currentTime
    for (const offset of [0, 0.4]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 480
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, now + offset)
      gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.05)
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.32)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.35)
    }
  }, [getCtx])

  const start = useCallback(() => {
    if (intervalRef.current) return // already ringing
    playBurst()
    intervalRef.current = setInterval(playBurst, 2000)
  }, [playBurst])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => stop, [stop])

  // Memoized so callers can safely put this object in a useEffect
  // dependency array without it changing identity (and re-running the
  // effect) on every render.
  return useMemo(() => ({ start, stop }), [start, stop])
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
