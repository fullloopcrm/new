'use client'

import { useEffect, useRef, useState } from 'react'

type Kind = 'video' | 'audio'
type Phase = 'idle' | 'recording' | 'preview' | 'uploading' | 'done' | 'error'

interface RecordedAnswerProps {
  questionKey: string
  label: string
  helpText?: string
  maxSeconds: number
  existingUrl?: string | null
  existingKind?: Kind | null
  onSaved: (questionKey: string, url: string, kind: Kind) => void
}

const VIDEO_MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
const AUDIO_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function pickSupportedMimeType(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return candidates.find((m) => MediaRecorder.isTypeSupported(m))
}

function browserSupportsRecording(): boolean {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

export default function RecordedAnswer({ questionKey, label, helpText, maxSeconds, existingUrl, existingKind, onSaved }: RecordedAnswerProps) {
  const [phase, setPhase] = useState<Phase>(existingUrl ? 'done' : 'idle')
  const [kind, setKind] = useState<Kind | null>(existingKind ?? null)
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds)
  const [error, setError] = useState('')
  const [savedUrl, setSavedUrl] = useState<string | null>(existingUrl ?? null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Starts false on both server and client to avoid a hydration mismatch —
  // browserSupportsRecording() reads navigator/window, which don't exist
  // during SSR. The real check runs client-only, right after mount.
  const [useFallback, setUseFallback] = useState(false)

  // existingUrl arrives from an async draft fetch in the parent, which
  // resolves after this component's first render — so the useState
  // initializer above never sees it. Sync once, the first time a draft
  // value shows up, so a returning applicant's saved answers actually
  // render as saved instead of looking wiped. Guarded to fire only once so
  // it doesn't fight the user's own re-record action later.
  const hasSyncedExistingRef = useRef(false)
  useEffect(() => {
    if (hasSyncedExistingRef.current || !existingUrl) return
    hasSyncedExistingRef.current = true
    setSavedUrl(existingUrl)
    if (existingKind) setKind(existingKind)
    setPhase('done')
  }, [existingUrl, existingKind])

  useEffect(() => {
    if (!browserSupportsRecording()) setUseFallback(true)
  }, [])

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => () => { stopStream(); clearTimer() }, [])

  const startRecording = async (chosenKind: Kind) => {
    setError('')
    setKind(chosenKind)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        chosenKind === 'video' ? { video: { facingMode: 'user' }, audio: true } : { audio: true }
      )
      streamRef.current = stream

      if (chosenKind === 'video' && videoElRef.current) {
        videoElRef.current.srcObject = stream
        videoElRef.current.muted = true
        videoElRef.current.play().catch(() => {})
      }

      const mimeType = pickSupportedMimeType(chosenKind === 'video' ? VIDEO_MIME_CANDIDATES : AUDIO_MIME_CANDIDATES)
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || (chosenKind === 'video' ? 'video/webm' : 'audio/webm') })
        blobRef.current = blob
        setPreviewUrl(URL.createObjectURL(blob))
        stopStream()
        clearTimer()
        setPhase('preview')
      }
      recorder.onerror = () => {
        setError('Recording failed. Please try again, or upload a file instead.')
        stopStream()
        clearTimer()
        setPhase('idle')
      }
      recorderRef.current = recorder
      recorder.start()
      setPhase('recording')
      setSecondsLeft(maxSeconds)
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (recorder.state === 'recording') recorder.stop()
            return 0
          }
          return s - 1
        })
      }, 1000)
    } catch {
      setError('Could not access your camera/microphone. You can upload a file instead.')
      setUseFallback(true)
      setPhase('idle')
    }
  }

  const stopEarly = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const reRecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    blobRef.current = null
    setPreviewUrl(null)
    setPhase('idle')
    setError('')
  }

  const upload = async (blob: Blob, uploadKind: Kind, filename: string) => {
    setPhase('uploading')
    setError('')
    try {
      const signedRes = await fetch('/api/management-applications/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: uploadKind, filename, contentType: blob.type || (uploadKind === 'video' ? 'video/webm' : 'audio/webm') }),
      })
      if (!signedRes.ok) throw new Error('signed-url failed')
      const { signedUrl, publicUrl } = await signedRes.json()

      const putRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob })
      if (!putRes.ok) throw new Error('upload failed')

      setSavedUrl(publicUrl)
      setPhase('done')
      onSaved(questionKey, publicUrl, uploadKind)
    } catch {
      // The fallback file-picker path never sets previewUrl (only the
      // in-browser recorder does), so phase 'preview' with no previewUrl
      // renders nothing — a dead end with no retry button. Fall back to
      // 'idle' in that case so "Upload video or audio file" reappears.
      if (blobRef.current && previewUrl) {
        setError('Upload failed. Your recording is still here — try again.')
        setPhase('preview')
      } else {
        setError('Upload failed. Please try again.')
        setPhase('idle')
      }
    }
  }

  const handleFallbackFile = (file: File | null) => {
    if (!file) return
    const uploadKind: Kind = file.type.startsWith('audio/') ? 'audio' : 'video'
    setKind(uploadKind)
    upload(file, uploadKind, file.name)
  }

  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <label className={labelClass}>{label} *</label>
      {helpText && <p className="text-xs text-gray-400 mb-2">{helpText}</p>}

      {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg mb-2">{error}</p>}

      {(phase === 'idle' || phase === 'recording') && (
        <p className="text-xs font-semibold text-slate-500 mb-2">Max {maxSeconds}s — make it count. It will auto-stop.</p>
      )}

      {phase === 'idle' && !useFallback && (
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => startRecording('video')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700 hover:bg-gray-50">
            🎥 Record Video
          </button>
          <button type="button" onClick={() => startRecording('audio')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700 hover:bg-gray-50">
            🎙️ Record Audio
          </button>
          <button type="button" onClick={() => setUseFallback(true)} className="px-3 py-2 text-xs text-gray-400 underline">
            Upload a file instead
          </button>
        </div>
      )}

      {phase === 'idle' && useFallback && (
        <div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
            Upload video or audio file
          </button>
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => handleFallbackFile(e.target.files?.[0] || null)} />
          {browserSupportsRecording() && (
            <button type="button" onClick={() => setUseFallback(false)} className="ml-3 text-xs text-gray-400 underline">
              Try recording instead
            </button>
          )}
        </div>
      )}

      {phase === 'recording' && (
        <div>
          {kind === 'video' && (
            <video ref={videoElRef} className="w-full max-w-xs rounded-lg bg-black mb-2" playsInline />
          )}
          {kind === 'audio' && (
            <div className="mb-2 text-sm text-red-600 font-medium">● Recording audio…</div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{secondsLeft}s left</span>
            <button type="button" onClick={stopEarly} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">
              Stop
            </button>
          </div>
        </div>
      )}

      {phase === 'preview' && previewUrl && (
        <div>
          {kind === 'video' ? (
            <video src={previewUrl} controls className="w-full max-w-xs rounded-lg bg-black mb-2" />
          ) : (
            <audio src={previewUrl} controls className="mb-2 w-full" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => blobRef.current && kind && upload(blobRef.current, kind, `${questionKey}.webm`)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">
              Use This
            </button>
            <button type="button" onClick={reRecord} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700">
              Re-record
            </button>
          </div>
        </div>
      )}

      {phase === 'uploading' && <p className="text-sm text-slate-500">Uploading…</p>}

      {phase === 'done' && savedUrl && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-emerald-700">✓ {kind === 'audio' ? 'Audio' : 'Video'} recorded</span>
          <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Play back</a>
          <button type="button" onClick={reRecord} className="text-xs text-gray-400 underline">Re-record</button>
        </div>
      )}
    </div>
  )
}
