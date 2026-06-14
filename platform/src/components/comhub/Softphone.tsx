'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

type TelnyxRTCInstance = {
  on: (event: string, handler: (...args: unknown[]) => void) => void
  connect: () => Promise<void> | void
  disconnect: () => Promise<void> | void
  newCall: (opts: { destinationNumber: string; callerNumber?: string; callerName?: string }) => TelnyxCall
  enableMicrophone: () => Promise<void> | void
}
type TelnyxCall = {
  id: string
  state: string
  options?: { destinationNumber?: string }
  hangup: () => void
  answer: () => void
  hold: () => Promise<void> | void
  unhold: () => Promise<void> | void
  muteAudio: () => void
  unmuteAudio: () => void
  dtmf: (digit: string) => void
  on: (event: string, handler: (...args: unknown[]) => void) => void
}

type CallStatus =
  | 'idle'
  | 'registering'
  | 'ready'
  | 'ringing-out'
  | 'ringing-in'
  | 'active'
  | 'held'
  | 'ended'
  | 'error'

interface SoftphoneProps {
  initialDestination?: string
  onCallStateChange?: (state: { status: CallStatus; destination: string | null; durationSecs: number }) => void
}

const HEARTBEAT_INTERVAL_MS = 30_000
const PRESENCE_PATH = '/api/admin/comhub/voice/presence'

// Caller-ID options for outbound calls. Telnyx requires outbound calls to
// use a number owned by the account; without one the call is silently
// rejected and the SDK fires an empty error event. Each entry corresponds
// to a number attached to the Comhub credential connection in Telnyx.
type CallerIdOption = { value: string; label: string }
const CALLER_ID_OPTIONS: CallerIdOption[] = [
  { value: '+12122028400', label: '(212) 202-8400' },
  { value: '+17188149850', label: '(718) 814-9850' },
  { value: '+18883164019', label: '(888) 316-4019' },
]
const DEFAULT_CALLER_ID = CALLER_ID_OPTIONS[0].value

function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits
}

function formatPretty(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    const d = cleaned.slice(2)
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return input
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const dialpadKeys: Array<{ digit: string; sub: string }> = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
]

export default function Softphone({ initialDestination, onCallStateChange }: SoftphoneProps) {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [destination, setDestination] = useState<string>(initialDestination ?? '')
  const [activeCall, setActiveCall] = useState<TelnyxCall | null>(null)
  const [callerName, setCallerName] = useState<string>('')
  const [callerNumber, setCallerNumber] = useState<string>('')
  const [muted, setMuted] = useState(false)
  const [held, setHeld] = useState(false)
  const [durationSecs, setDurationSecs] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [callerId, setCallerId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_CALLER_ID
    const saved = window.localStorage.getItem('comhub:caller-id')
    return saved && CALLER_ID_OPTIONS.some(o => o.value === saved) ? saved : DEFAULT_CALLER_ID
  })

  const callerIdRef = useRef<string>(DEFAULT_CALLER_ID)
  const activeCallRef = useRef<TelnyxCall | null>(null)
  const callerNumberRef = useRef<string>('')
  useEffect(() => {
    callerIdRef.current = callerId
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('comhub:caller-id', callerId)
    }
  }, [callerId])
  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])
  useEffect(() => {
    callerNumberRef.current = callerNumber
  }, [callerNumber])

  // Shared AudioContext for all UI tones (ringtone, ringback, DTMF beeps).
  // Lazy-create on first user gesture so autoplay policy doesn't block.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const getAudioCtx = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume().catch(() => null)
      }
      return audioCtxRef.current
    }
    try {
      const Ctx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      audioCtxRef.current = new Ctx()
      return audioCtxRef.current
    } catch {
      return null
    }
  }, [])

  // Web Audio ringtone: synth "ring ring" for inbound (ringing-in) AND a
  // US-style ringback (440+480 Hz, 2s on / 4s off) for outbound (ringing-out).
  // Both cease on any other state.
  const ringtoneCleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (status !== 'ringing-in' && status !== 'ringing-out') {
      ringtoneCleanupRef.current?.()
      ringtoneCleanupRef.current = null
      return
    }
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null
    const ctx = getAudioCtx()
    if (!ctx) return
    const isInbound = status === 'ringing-in'
    const playBurst = () => {
      if (cancelled || ctx.state === 'closed') return
      const now = ctx.currentTime
      if (isInbound) {
        for (const offset of [0, 0.4]) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.value = 480
          osc.type = 'sine'
          gain.gain.setValueAtTime(0, now + offset)
          gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.05)
          gain.gain.linearRampToValueAtTime(0, now + offset + 0.32)
          osc.connect(gain).connect(ctx.destination)
          osc.start(now + offset)
          osc.stop(now + offset + 0.35)
        }
      } else {
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05)
        gain.gain.setValueAtTime(0.12, now + 1.95)
        gain.gain.linearRampToValueAtTime(0, now + 2.0)
        for (const freq of [440, 480]) {
          const osc = ctx.createOscillator()
          osc.frequency.value = freq
          osc.type = 'sine'
          osc.connect(gain)
          osc.start(now)
          osc.stop(now + 2.0)
        }
        gain.connect(ctx.destination)
      }
    }
    playBurst()
    interval = setInterval(playBurst, isInbound ? 2000 : 6000)
    ringtoneCleanupRef.current = () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
    return () => {
      ringtoneCleanupRef.current?.()
      ringtoneCleanupRef.current = null
    }
  }, [status, getAudioCtx])

  // DTMF dual-tone synth — short beep on every digit press so the dialer
  // feels like a real phone. Standard DTMF frequencies per ITU-T Q.23.
  const playDtmfTone = useCallback(
    (digit: string) => {
      const lowFreq: Record<string, number> = {
        '1': 697, '2': 697, '3': 697,
        '4': 770, '5': 770, '6': 770,
        '7': 852, '8': 852, '9': 852,
        '*': 941, '0': 941, '#': 941,
      }
      const highFreq: Record<string, number> = {
        '1': 1209, '2': 1336, '3': 1477,
        '4': 1209, '5': 1336, '6': 1477,
        '7': 1209, '8': 1336, '9': 1477,
        '*': 1209, '0': 1336, '#': 1477,
      }
      const lo = lowFreq[digit]
      const hi = highFreq[digit]
      if (!lo || !hi) return
      const ctx = getAudioCtx()
      if (!ctx || ctx.state === 'closed') return
      const now = ctx.currentTime
      const dur = 0.13
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01)
      gain.gain.setValueAtTime(0.2, now + dur - 0.02)
      gain.gain.linearRampToValueAtTime(0, now + dur)
      gain.connect(ctx.destination)
      for (const f of [lo, hi]) {
        const osc = ctx.createOscillator()
        osc.frequency.value = f
        osc.type = 'sine'
        osc.connect(gain)
        osc.start(now)
        osc.stop(now + dur)
      }
    },
    [getAudioCtx],
  )

  const clientRef = useRef<TelnyxRTCInstance | null>(null)
  const sipUsernameRef = useRef<string>('')
  const sessionIdRef = useRef<string>('')
  const credentialIdRef = useRef<string>('')
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number | null>(null)
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioAttachTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Aggressively attach the call's remote MediaStream to our <audio> element.
  // The SDK's `remoteElement` auto-attach is unreliable across versions and
  // sometimes never fires, leaving calls silent. We retry for ~3s, sourcing
  // the stream from any of: BaseCall.remoteStream getter, the underlying
  // RTCPeerConnection's getReceivers() (modern), or getRemoteStreams() (old).
  const attachRemoteAudio = useCallback((call: TelnyxCall) => {
    if (audioAttachTimerRef.current) clearInterval(audioAttachTimerRef.current)
    let attempts = 0
    const tryAttach = () => {
      attempts += 1
      const audioEl =
        remoteAudioRef.current ||
        (document.getElementById('comhub-softphone-remote-audio') as HTMLAudioElement | null)
      if (!audioEl) return false
      const callAny = call as TelnyxCall & {
        remoteStream?: MediaStream
        peer?: {
          instance?: {
            getRemoteStreams?: () => MediaStream[]
            getReceivers?: () => RTCRtpReceiver[]
          }
        }
      }
      let stream: MediaStream | null = callAny.remoteStream || null
      if (!stream) {
        const legacy = callAny.peer?.instance?.getRemoteStreams?.()
        if (legacy && legacy.length > 0) stream = legacy[0]
      }
      if (!stream) {
        const receivers = callAny.peer?.instance?.getReceivers?.() || []
        const tracks = receivers
          .map(r => r.track)
          .filter((t): t is MediaStreamTrack => !!t && t.kind === 'audio')
        if (tracks.length > 0) stream = new MediaStream(tracks)
      }
      if (!stream) return false
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream
      }
      audioEl.muted = false
      audioEl.volume = 1
      audioEl.autoplay = true
      void audioEl.play().catch(() => null)
      return true
    }
    if (tryAttach()) return
    audioAttachTimerRef.current = setInterval(() => {
      if (tryAttach() || attempts > 30) {
        if (audioAttachTimerRef.current) {
          clearInterval(audioAttachTimerRef.current)
          audioAttachTimerRef.current = null
        }
      }
    }, 100)
  }, [])

  const detachRemoteAudio = useCallback(() => {
    if (audioAttachTimerRef.current) {
      clearInterval(audioAttachTimerRef.current)
      audioAttachTimerRef.current = null
    }
    try {
      const el = remoteAudioRef.current
      if (el) {
        el.pause()
        el.srcObject = null
        el.removeAttribute('src')
        el.load()
      }
    } catch {
      /* noop */
    }
  }, [])

  const reportState = useCallback(
    (overrideStatus?: CallStatus) => {
      onCallStateChange?.({
        status: overrideStatus ?? status,
        destination: activeCall?.options?.destinationNumber || destination || null,
        durationSecs,
      })
    },
    [onCallStateChange, status, activeCall, destination, durationSecs],
  )

  const startHeartbeat = useCallback((sipUsername: string) => {
    if (heartbeatTimerRef.current) return
    const send = () => {
      void fetch(PRESENCE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'available',
          sip_username: sipUsername,
          sip_address: `sip:${sipUsername}@sip.telnyx.com`,
          device_label: typeof navigator !== 'undefined' ? navigator.platform : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      }).catch(() => null)
    }
    send()
    heartbeatTimerRef.current = setInterval(send, HEARTBEAT_INTERVAL_MS)
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    heartbeatTimerRef.current = null
  }, [])

  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    callStartRef.current = Date.now()
    setDurationSecs(0)
    durationTimerRef.current = setInterval(() => {
      if (!callStartRef.current) return
      setDurationSecs(Math.floor((Date.now() - callStartRef.current) / 1000))
    }, 1000)
  }, [])

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    durationTimerRef.current = null
    callStartRef.current = null
  }, [])

  const logCall = useCallback(
    (
      call: TelnyxCall,
      lifecycle: 'started' | 'answered' | 'ended',
      extra?: { duration_secs?: number },
    ) => {
      const customerPhone = call.options?.destinationNumber || ''
      if (!customerPhone) return
      void fetch('/api/admin/comhub/voice/log-softphone-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_phone: customerPhone,
          telnyx_call_id: call.id,
          sip_username: sipUsernameRef.current,
          status: lifecycle,
          ...(lifecycle === 'ended' && extra?.duration_secs !== undefined
            ? { duration_secs: extra.duration_secs }
            : {}),
        }),
      }).catch(() => null)
    },
    [],
  )

  // The Telnyx SDK doesn't expose `call.on(...)`. All state changes arrive
  // via the parent client's `telnyx.notification` listener (set up in boot()).
  // We just hand off the call object here and tag the started lifecycle.
  const attachCallHandlers = useCallback(
    (call: TelnyxCall) => {
      logCall(call, 'started')
    },
    [logCall],
  )

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setStatus('registering')
      setErrorMessage(null)
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          void Notification.requestPermission().catch(() => null)
        }

        // Telnyx WebRTC's SDK fires an empty `telnyx.error` if microphone
        // permission is denied or no audio input device is available. Request
        // mic up-front so any failure surfaces as a clear getUserMedia error.
        try {
          if (navigator?.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(t => t.stop())
          }
        } catch (mediaErr) {
          const msg = mediaErr instanceof Error ? mediaErr.message : 'mic blocked'
          setErrorMessage(`Microphone access required: ${msg}`)
          setStatus('error')
          return
        }

        // Per-session credential — random ID so each tab gets its own
        // unique SIP user. Telnyx routes inbound INVITEs to the latest UA
        // for that user; multiple tabs with shared creds caused 486 user_busy.
        const sessionId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
        sessionIdRef.current = sessionId
        const res = await fetch('/api/admin/comhub/voice/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}))
          throw new Error(detail.detail || detail.error || `token endpoint ${res.status}`)
        }
        const { login_token, sip_username, credential_id } = (await res.json()) as {
          login_token: string
          sip_username: string
          credential_id: string
        }
        if (!login_token) throw new Error('no login_token in token response')
        credentialIdRef.current = credential_id
        sipUsernameRef.current = sip_username

        const sdk = (await import('@telnyx/webrtc')) as unknown as {
          TelnyxRTC: new (opts: Record<string, unknown>) => TelnyxRTCInstance
        }
        const TelnyxRTC = sdk.TelnyxRTC
        if (!TelnyxRTC) throw new Error('TelnyxRTC export missing from @telnyx/webrtc')

        // remoteElement: SDK will auto-attach inbound audio to this element
        // (routing audio without us touching MediaStream manually).
        const client = new TelnyxRTC({
          login_token,
          remoteElement: 'comhub-softphone-remote-audio',
        })
        if (cancelled) return
        clientRef.current = client

        client.on('telnyx.ready', () => {
          if (cancelled) return
          setStatus('ready')
          if (sip_username) startHeartbeat(sip_username)

          const w = window as Window & { __comhubPendingDial?: string }
          const pending = w.__comhubPendingDial
          if (pending) {
            delete w.__comhubPendingDial
            window.dispatchEvent(
              new CustomEvent('comhub:dial', { detail: { phone: pending } }),
            )
          }
        })

        client.on('telnyx.error', (raw: unknown) => {
          const e = raw as { message?: string; code?: string | number; cause?: unknown }
          if (cancelled) return
          // Surface as much as possible in-place so we don't need DevTools.
          let detail = ''
          try {
            detail = JSON.stringify(raw, Object.getOwnPropertyNames(raw as object)).slice(0, 400)
          } catch {
            detail = String(raw)
          }
          // eslint-disable-next-line no-console
          console.error('[softphone] telnyx.error', raw)
          setErrorMessage(`${e?.code ? `[${e.code}] ` : ''}${e?.message || 'Telnyx error'} — ${detail}`)
          setStatus('error')
        })

        client.on('telnyx.socket.close', () => {
          if (cancelled) return
          stopHeartbeat()
          setStatus('idle')
        })

        // All call state transitions arrive on this listener. We dispatch
        // based on the call's current state and whether it's an inbound
        // notification (no current activeCall yet) or an outbound update on
        // a call we already initiated.
        client.on('telnyx.notification', (raw: unknown) => {
          const n = raw as {
            type?: string
            call?: TelnyxCall & {
              options?: { remoteCallerName?: string; remoteCallerNumber?: string }
              remoteStream?: MediaStream
            }
          }
          if (n.type !== 'callUpdate' || !n.call) return
          const incoming = n.call
          const s = incoming.state
          // eslint-disable-next-line no-console
          console.log('[softphone] state', s, {
            id: incoming.id,
            tracked: activeCallRef.current?.id,
            from: incoming.options?.remoteCallerNumber,
            direction: (incoming as { direction?: string }).direction,
          })

          // Brand-new inbound call (we have no active call yet).
          // Treat 'ringing' OR 'trying' OR 'requesting' as the inbound start
          // signal — different SDK versions emit different first states.
          const inboundStart =
            (s === 'ringing' || s === 'trying' || s === 'requesting') &&
            !activeCallRef.current
          if (inboundStart) {
            setActiveCall(incoming)
            const cName = incoming.options?.remoteCallerName || ''
            const cNumber = incoming.options?.remoteCallerNumber || ''
            setCallerName(cName)
            setCallerNumber(cNumber)
            setStatus('ringing-in')
            logCall(incoming, 'started')
            setCollapsed(false)

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                const notif = new Notification('Incoming call', {
                  body: cName || cNumber || 'Unknown caller',
                  tag: 'comhub-incoming',
                  requireInteraction: true,
                })
                notif.onclick = () => {
                  window.focus()
                  notif.close()
                }
              } catch {
                /* noop */
              }
            }
            return
          }

          // State update on the call we're tracking.
          const tracked = activeCallRef.current
          if (tracked && incoming.id === tracked.id) {
            if (s === 'active' || s === 'early') {
              if (s === 'active') {
                setStatus('active')
                startDurationTimer()
                logCall(incoming, 'answered')
              }
              attachRemoteAudio(incoming)
            } else if (s === 'held') {
              setStatus('held')
              setHeld(true)
            } else if (s === 'ringing') {
              setStatus(callerNumberRef.current ? 'ringing-in' : 'ringing-out')
            } else if (s === 'destroy' || s === 'hangup' || s === 'purge') {
              const dur =
                callStartRef.current !== null
                  ? Math.floor((Date.now() - callStartRef.current) / 1000)
                  : undefined
              logCall(incoming, 'ended', dur !== undefined ? { duration_secs: dur } : undefined)
              setStatus('ended')
              stopDurationTimer()
              setActiveCall(null)
              setCallerName('')
              setCallerNumber('')
              setMuted(false)
              setHeld(false)
              setTimeout(() => setStatus(prev => (prev === 'ended' ? 'ready' : prev)), 1200)
            }
          }
        })

        await client.connect()

        const dialHandler = (ev: Event) => {
          const detail = (ev as CustomEvent<{ phone?: string }>).detail
          if (!detail?.phone) return
          const dest = normalizePhone(detail.phone)
          if (!dest || dest.length < 8) return
          setDestination(dest)
          setCollapsed(false)
          setTimeout(() => {
            const c = clientRef.current
            if (!c) return
            const call = c.newCall({
              destinationNumber: dest,
              callerNumber: callerIdRef.current,
              callerName: 'NYC Maid',
            })
            setActiveCall(call)
            setStatus('ringing-out')
            attachCallHandlers(call)
            attachRemoteAudio(call)
          }, 0)
        }
        window.addEventListener('comhub:dial', dialHandler as EventListener)
        const focusHandler = () => setCollapsed(false)
        window.addEventListener('comhub:focus', focusHandler as EventListener)
        ;(clientRef.current as TelnyxRTCInstance & {
          __dialHandler?: EventListener
          __focusHandler?: EventListener
        }).__dialHandler = dialHandler as EventListener
        ;(clientRef.current as TelnyxRTCInstance & {
          __focusHandler?: EventListener
        }).__focusHandler = focusHandler as EventListener
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'unknown error'
        setErrorMessage(msg)
        setStatus('error')
      }
    }
    void boot()

    return () => {
      cancelled = true
      stopHeartbeat()
      stopDurationTimer()
      void fetch(PRESENCE_PATH, { method: 'DELETE' }).catch(() => null)
      // Tear down the per-session credential so it doesn't pile up.
      if (credentialIdRef.current) {
        void fetch('/api/admin/comhub/voice/token', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential_id: credentialIdRef.current }),
          keepalive: true,
        }).catch(() => null)
      }
      const c = clientRef.current as
        | (TelnyxRTCInstance & {
            __dialHandler?: EventListener
            __focusHandler?: EventListener
          })
        | null
      if (c?.__dialHandler) {
        window.removeEventListener('comhub:dial', c.__dialHandler)
      }
      if (c?.__focusHandler) {
        window.removeEventListener('comhub:focus', c.__focusHandler)
      }
      try {
        clientRef.current?.disconnect()
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    reportState()
  }, [reportState])

  const placeCall = useCallback(() => {
    const client = clientRef.current
    if (!client) return
    const dest = normalizePhone(destination)
    if (!dest || dest.length < 8) {
      setErrorMessage('Enter a valid phone number')
      return
    }
    // User gesture — unlock the AudioContext for ringback/DTMF beeps.
    getAudioCtx()
    const call = client.newCall({
              destinationNumber: dest,
              callerNumber: callerIdRef.current,
              callerName: 'NYC Maid',
            })
    setActiveCall(call)
    setStatus('ringing-out')
    attachCallHandlers(call)
    attachRemoteAudio(call)
  }, [destination, attachCallHandlers, attachRemoteAudio, getAudioCtx])

  const answerCall = useCallback(() => {
    getAudioCtx()
    activeCall?.answer()
    if (activeCall) attachRemoteAudio(activeCall)
  }, [activeCall, attachRemoteAudio, getAudioCtx])
  const hangup = useCallback(() => {
    try {
      activeCall?.hangup()
    } catch {
      /* SDK throws if already destroyed — ignore */
    }
    // Optimistically reset UI; the SDK's destroy event will also fire and
    // re-confirm. This guarantees the user-facing UI returns to ready even
    // if the SDK swallows the hangup transition.
    setActiveCall(null)
    setStatus('ready')
    setMuted(false)
    setHeld(false)
    stopDurationTimer()
    setCallerName('')
    setCallerNumber('')
    detachRemoteAudio()
  }, [activeCall, stopDurationTimer, detachRemoteAudio])

  const toggleHold = useCallback(async () => {
    if (!activeCall) return
    if (held) {
      await activeCall.unhold()
      setHeld(false)
    } else {
      await activeCall.hold()
      setHeld(true)
    }
  }, [activeCall, held])

  const toggleMute = useCallback(() => {
    if (!activeCall) return
    if (muted) {
      activeCall.unmuteAudio()
      setMuted(false)
    } else {
      activeCall.muteAudio()
      setMuted(true)
    }
  }, [activeCall, muted])

  const sendDigit = useCallback(
    (digit: string) => {
      // Local audible feedback so the dial pad sounds like a real phone.
      // Also unlocks AudioContext on first press (user gesture).
      playDtmfTone(digit)
      if (activeCall) {
        activeCall.dtmf(digit)
      } else {
        setDestination(prev => prev + digit)
      }
    },
    [activeCall, playDtmfTone],
  )

  const isLive =
    activeCall &&
    (status === 'active' || status === 'held' || status === 'ringing-out' || status === 'ringing-in')

  const statusLabel = (() => {
    switch (status) {
      case 'ready': return 'Online'
      case 'registering': return 'Connecting'
      case 'idle': return 'Offline'
      case 'error': return 'Error'
      case 'ringing-out': return 'Ringing'
      case 'ringing-in': return 'Incoming'
      case 'active': return formatDuration(durationSecs)
      case 'held': return 'On hold'
      case 'ended': return 'Ended'
      default: return status
    }
  })()

  const statusDotClass = (() => {
    switch (status) {
      case 'ready': return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
      case 'active': return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
      case 'ringing-out':
      case 'ringing-in': return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-pulse'
      case 'held': return 'bg-blue-400'
      case 'error': return 'bg-rose-500'
      case 'idle':
      case 'registering':
      default: return 'bg-neutral-500'
    }
  })()

  if (collapsed && !isLive) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Open softphone"
        className="group relative h-14 w-14 rounded-full bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-neutral-800/90 hover:scale-105 transition-all duration-200 flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-400" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
        <span className={`absolute top-0 right-0 h-3 w-3 rounded-full ${statusDotClass} ring-2 ring-neutral-950`} />
      </button>
    )
  }

  return (
    <div className="w-[340px] rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden text-neutral-100">
      <audio
        id="comhub-softphone-remote-audio"
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 font-medium">Softphone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-300 font-mono tabular-nums">{statusLabel}</span>
          {!isLive && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Minimize softphone"
              className="text-neutral-500 hover:text-neutral-200 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {errorMessage && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="p-5">
        {isLive ? (
          <CallScreen
            destination={
              activeCall?.options?.destinationNumber || callerNumber || ''
            }
            callerName={callerName}
            status={status}
            durationSecs={durationSecs}
            muted={muted}
            held={held}
            onAnswer={answerCall}
            onHangup={hangup}
            onMute={toggleMute}
            onHold={toggleHold}
            onDtmf={sendDigit}
          />
        ) : (
          <DialerScreen
            destination={destination}
            setDestination={setDestination}
            onDigit={sendDigit}
            onCall={placeCall}
            ready={status === 'ready'}
            callerId={callerId}
            setCallerId={setCallerId}
          />
        )}
      </div>
    </div>
  )
}

// ─── Dialer screen (ready / idle state) ───────────────────────────────────

function DialerScreen({
  destination,
  setDestination,
  onDigit,
  onCall,
  ready,
  callerId,
  setCallerId,
}: {
  destination: string
  setDestination: (v: string) => void
  onDigit: (d: string) => void
  onCall: () => void
  ready: boolean
  callerId: string
  setCallerId: (v: string) => void
}) {
  return (
    <div>
      {/* Caller-ID picker — which Telnyx number outbound shows on customer phones. */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">From</span>
        <div className="flex gap-1">
          {CALLER_ID_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCallerId(opt.value)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono tracking-wide transition-colors ${
                callerId === opt.value
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'bg-white/[0.04] text-neutral-400 border border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              {opt.label.split(') ')[0].replace('(', '')}
            </button>
          ))}
        </div>
      </div>

      <RecipientSearch destination={destination} setDestination={setDestination} />

      <div className="grid grid-cols-3 gap-2 mb-5">
        {dialpadKeys.map(k => (
          <button
            key={k.digit}
            type="button"
            onClick={() => onDigit(k.digit)}
            className="h-14 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] active:scale-95 border border-white/[0.06] hover:border-white/[0.1] transition-all duration-100 flex flex-col items-center justify-center group"
          >
            <span className="text-xl font-light text-neutral-100">{k.digit}</span>
            {k.sub && <span className="text-[9px] tracking-[0.15em] text-neutral-600 group-hover:text-neutral-500 transition-colors">{k.sub}</span>}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCall}
        disabled={!ready || !destination}
        className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-medium tracking-wide transition-colors flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.25)] disabled:shadow-none"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
        Call
      </button>
    </div>
  )
}

// ─── Call screen (live, ringing, on-hold) ─────────────────────────────────

function CallScreen({
  destination,
  callerName,
  status,
  durationSecs,
  muted,
  held,
  onAnswer,
  onHangup,
  onMute,
  onHold,
  onDtmf,
}: {
  destination: string
  callerName: string
  status: CallStatus
  durationSecs: number
  muted: boolean
  held: boolean
  onAnswer: () => void
  onHangup: () => void
  onMute: () => void
  onHold: () => void
  onDtmf: (d: string) => void
}) {
  const [showDialpad, setShowDialpad] = useState(false)

  const incoming = status === 'ringing-in'
  const ringing = status === 'ringing-out' || status === 'ringing-in'

  return (
    <div>
      <div className="text-center mb-6">
        {ringing && (
          <div className="relative inline-block mb-3">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <span className="relative h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-emerald-400">
                <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </span>
          </div>
        )}
        {callerName && (
          <div className="text-base font-medium text-neutral-100 mb-0.5">{callerName}</div>
        )}
        <div className="font-mono tabular-nums text-lg text-neutral-200">
          {formatPretty(destination) || destination}
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          {status === 'active' && (
            <span className="font-mono tabular-nums">{formatDuration(durationSecs)}</span>
          )}
          {status === 'held' && <span>On hold</span>}
          {status === 'ringing-out' && <span>Ringing…</span>}
          {status === 'ringing-in' && <span className="text-amber-400">Incoming call</span>}
        </div>
      </div>

      {showDialpad ? (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {dialpadKeys.map(k => (
            <button
              key={k.digit}
              type="button"
              onClick={() => onDtmf(k.digit)}
              className="h-11 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-100 font-mono text-sm active:scale-95 transition-all"
            >
              {k.digit}
            </button>
          ))}
        </div>
      ) : (
        status !== 'ringing-in' && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <ControlButton active={muted} onClick={onMute} label={muted ? 'Unmute' : 'Mute'} icon={muted ? 'mic-off' : 'mic'} />
            <ControlButton active={false} onClick={() => setShowDialpad(true)} label="Keypad" icon="keypad" />
            <ControlButton active={held} onClick={onHold} label={held ? 'Resume' : 'Hold'} icon="pause" />
          </div>
        )
      )}

      {showDialpad && (
        <button
          type="button"
          onClick={() => setShowDialpad(false)}
          className="w-full h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-300 text-xs mb-3 transition-colors"
        >
          Hide keypad
        </button>
      )}

      <div className="flex gap-2">
        {incoming && (
          <button
            type="button"
            onClick={onAnswer}
            className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Answer
          </button>
        )}
        <button
          type="button"
          onClick={onHangup}
          className={`${incoming ? 'flex-1' : 'w-full'} h-12 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-medium flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition-colors`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 rotate-[135deg]">
            <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          {incoming ? 'Decline' : 'End'}
        </button>
      </div>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: 'mic' | 'mic-off' | 'pause' | 'keypad'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-14 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
        active
          ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-neutral-300'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      <span className="text-[10px] tracking-wide">{label}</span>
    </button>
  )
}

function Icon({ name, className }: { name: 'mic' | 'mic-off' | 'pause' | 'keypad'; className?: string }) {
  switch (name) {
    case 'mic':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      )
    case 'mic-off':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75v1.5m4.5-3v3.75a3 3 0 01-3 3m3-6.75V4.5a3 3 0 10-6 0v3.75m9 0L4.5 19.5m13.5-7.5v.75a6 6 0 01-6 6m0 0a6 6 0 01-6-6v-1.5" />
        </svg>
      )
    case 'pause':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'keypad':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="18" cy="6" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <circle cx="6" cy="18" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
          <circle cx="18" cy="18" r="1.5" />
        </svg>
      )
  }
}

// ─── Recipient search: name OR number ─────────────────────────────────────
//
// If the input is mostly digits, treat as a phone number. If it's letters,
// query /search-recipients and show matching clients/cleaners. Selecting a
// result writes their phone into `destination` so the Call button just dials.

type RecipientResult = {
  role: 'client' | 'cleaner'
  id: string
  name: string | null
  phone: string | null
  email: string | null
  do_not_service?: boolean
}

function RecipientSearch({
  destination,
  setDestination,
}: {
  destination: string
  setDestination: (v: string) => void
}) {
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<RecipientResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPhoneish = useCallback((s: string) => {
    const cleaned = s.replace(/[^\d+()\s\-.]/g, '')
    return cleaned.length === s.length && /\d/.test(s)
  }, [])

  // When destination changes from outside (e.g. ?dial param), keep the input
  // in sync so the user sees what they're calling.
  useEffect(() => {
    if (destination && !query) {
      setQuery(destination)
    }
  }, [destination, query])

  const onChange = useCallback(
    (v: string) => {
      setQuery(v)
      setSelectedLabel('')
      // If it looks like a phone, just write through.
      if (isPhoneish(v)) {
        setDestination(v)
        setResults([])
        setShowDropdown(false)
        return
      }
      // Else search by name.
      setDestination('')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (v.trim().length < 2) {
        setResults([])
        setShowDropdown(false)
        return
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/admin/comhub/search-recipients?q=${encodeURIComponent(v)}&limit=8`,
          )
          if (!res.ok) {
            setResults([])
            return
          }
          const data = (await res.json()) as { results?: RecipientResult[] }
          setResults((data.results ?? []).filter(r => r.phone))
          setShowDropdown(true)
        } catch {
          setResults([])
        }
      }, 200)
    },
    [setDestination, isPhoneish],
  )

  const select = useCallback(
    (r: RecipientResult) => {
      if (!r.phone) return
      setDestination(r.phone)
      setQuery(r.name || r.phone)
      setSelectedLabel(`${r.name || r.phone} · ${r.role}`)
      setResults([])
      setShowDropdown(false)
    },
    [setDestination],
  )

  return (
    <div className="relative mb-1">
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Name or number"
        className="w-full bg-transparent text-center font-mono tabular-nums text-2xl text-neutral-100 placeholder:text-neutral-700 placeholder:font-sans placeholder:text-base focus:outline-none py-2"
        aria-label="Recipient name or phone"
      />
      <div className="text-center text-xs text-neutral-500 h-4 mb-3">
        {selectedLabel
          ? selectedLabel
          : destination
            ? formatPretty(normalizePhone(destination))
            : ' '}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full -mt-2 mb-3 z-10 rounded-xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {results.map(r => (
            <button
              key={`${r.role}:${r.id}`}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                select(r)
              }}
              className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3 border-b border-white/5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-neutral-100 truncate flex items-center gap-2">
                  {r.name || 'Unnamed'}
                  {r.do_not_service && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/40">
                      DNS
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 font-mono tabular-nums truncate">
                  {r.phone ? formatPretty(normalizePhone(r.phone)) : 'no phone'}
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-500 shrink-0">
                {r.role}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
