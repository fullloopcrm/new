'use client'

/**
 * Shared voice-to-text for the onboarding wizard — mic button, live
 * transcription, text always lands back in an editable field before it
 * saves (never auto-submits from voice alone). Built on the browser's
 * native SpeechRecognition (Web Speech API) — no server round-trip, no
 * vendor key, works on both mobile and desktop Chrome/Edge/Safari. Firefox
 * desktop and a few mobile browsers don't implement it; on those the mic
 * button simply doesn't render and the field is a normal text input — never
 * a broken/dead button.
 *
 * One hook (useVoiceTranscription) + two ready-made pieces:
 *   - VoiceTextarea: full textarea with a mic button, for long free-text
 *     fields (business description, your story).
 *   - VoiceMicButton: standalone small mic button that calls back with
 *     transcribed text, for appending to a chip field's "other" input or any
 *     custom field that isn't a full textarea.
 */
import { useEffect, useRef, useState, useCallback } from 'react'

// The Web Speech API isn't in TS's default DOM lib. Minimal shape for what
// we actually use, not a full type-fest.
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

// Web Speech API error codes -> a plain-language reason, since the raw
// codes ("not-allowed", "audio-capture", ...) mean nothing to a tenant.
// Silently reverting the button with no message (the bug this fixes) reads
// as "the mic doesn't work" even when the real cause is a one-click fix.
function describeVoiceError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked for this site — check your browser\'s site settings and allow the mic, then try again.'
    case 'audio-capture':
      return 'No microphone found — check that one is connected and try again.'
    case 'no-speech':
      return 'Didn\'t catch anything — tap the mic and try again.'
    case 'network':
      return 'Connection issue reaching speech recognition — try again in a moment.'
    case 'aborted':
      return ''
    default:
      return 'Couldn\'t use the mic just now — try again, or just type instead.'
  }
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null
}

export function useVoiceTranscription() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onResultRef = useRef<((text: string, isFinal: boolean) => void) | null>(null)

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback((onResult: (text: string, isFinal: boolean) => void) => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    setError(null)
    onResultRef.current = onResult
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      let text = ''
      let isFinal = false
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
        if (e.results[i].isFinal) isFinal = true
      }
      onResultRef.current?.(text, isFinal)
    }
    rec.onerror = (e) => {
      const msg = describeVoiceError(e.error)
      if (msg) setError(msg)
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError(describeVoiceError('default'))
    }
  }, [])

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  return { supported, listening, error, start, stop }
}

function MicButton({ listening, supported, onClick, className }: { listening: boolean; supported: boolean; onClick: () => void; className?: string }) {
  if (!supported) return null
  const label = listening ? 'Stop recording' : 'Speak instead of typing'
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
        listening ? 'border-red-300 bg-red-50 text-red-600 animate-pulse' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
      } ${className || ''}`}
    >
      <span aria-hidden="true">🎤</span>
    </button>
  )
}

/** Full textarea + mic, for long free-text fields. Voice text lands in the
 *  same editable box as typed text — nothing saves until the tenant moves on
 *  (same autosave-on-blur/change as every other field). */
export function VoiceTextarea({ value, onChange, placeholder, rows = 4, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string
}) {
  const { supported, listening, error, start, stop } = useVoiceTranscription()
  const baseTextRef = useRef('')

  const toggle = () => {
    if (listening) { stop(); return }
    baseTextRef.current = value ? `${value} ` : ''
    start((text) => onChange(baseTextRef.current + text))
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={className || 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500'}
        />
        <MicButton listening={listening} supported={supported} onClick={toggle} />
      </div>
      {supported && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-slate-400'}`}>
          {error || (listening ? '🎤 Listening — tap the mic again to stop.' : "Don't want to type? Tap the mic icon to talk instead of typing.")}
        </p>
      )}
    </div>
  )
}

/** Standalone mic button for appending transcribed text into a chip field's
 *  "other/custom" slot or any non-textarea field. Calls onResult(text) once
 *  recording stops (final transcript only — never mid-sentence partials). */
export function VoiceMicButton({ onResult, className }: { onResult: (text: string) => void; className?: string }) {
  const { supported, listening, error, start, stop } = useVoiceTranscription()
  const latestRef = useRef('')

  const toggle = () => {
    if (listening) { stop(); if (latestRef.current.trim()) onResult(latestRef.current.trim()); return }
    latestRef.current = ''
    start((text) => { latestRef.current = text })
  }

  return (
    <span className="relative inline-flex">
      <MicButton listening={listening} supported={supported} onClick={toggle} className={className} />
      {error && (
        <span className="absolute left-1/2 top-full z-10 mt-1 w-40 -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-center text-[11px] text-red-600 shadow-sm">
          {error}
        </span>
      )}
    </span>
  )
}
