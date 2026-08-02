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
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null
}

export function useVoiceTranscription() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
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
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [])

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  return { supported, listening, start, stop }
}

function MicButton({ listening, supported, onClick, className }: { listening: boolean; supported: boolean; onClick: () => void; className?: string }) {
  if (!supported) return null
  return (
    <button
      type="button"
      onClick={onClick}
      title={listening ? 'Stop recording' : 'Speak instead of typing'}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
        listening ? 'border-red-300 bg-red-50 text-red-600 animate-pulse' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
      } ${className || ''}`}
    >
      🎤
    </button>
  )
}

/** Full textarea + mic, for long free-text fields. Voice text lands in the
 *  same editable box as typed text — nothing saves until the tenant moves on
 *  (same autosave-on-blur/change as every other field). */
export function VoiceTextarea({ value, onChange, placeholder, rows = 4, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string
}) {
  const { supported, listening, start, stop } = useVoiceTranscription()
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
        <p className="mt-1 text-xs text-slate-400">
          {listening ? '🎤 Listening — tap the mic again to stop.' : "Don't want to type? Tap the mic and talk instead."}
        </p>
      )}
    </div>
  )
}

/** Standalone mic button for appending transcribed text into a chip field's
 *  "other/custom" slot or any non-textarea field. Calls onResult(text) once
 *  recording stops (final transcript only — never mid-sentence partials). */
export function VoiceMicButton({ onResult, className }: { onResult: (text: string) => void; className?: string }) {
  const { supported, listening, start, stop } = useVoiceTranscription()
  const latestRef = useRef('')

  const toggle = () => {
    if (listening) { stop(); if (latestRef.current.trim()) onResult(latestRef.current.trim()); return }
    latestRef.current = ''
    start((text) => { latestRef.current = text })
  }

  return <MicButton listening={listening} supported={supported} onClick={toggle} className={className} />
}
