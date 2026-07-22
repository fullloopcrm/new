'use client'

/**
 * In-browser record + canvas-still capture for a job media note, uploaded via
 * signed URL and posted to /api/team-portal/media-note. Ported from the
 * ~/loopcam-standalone prototype's /record page — adapted to team-portal
 * bearer auth (no separate crew-name entry, the token already identifies the
 * team member) and to booking_notes as the storage target instead of a
 * standalone job_media_sessions table.
 */
import { useRef, useState, useCallback, useEffect } from 'react'

type SessionType = 'walkthrough' | 'before' | 'during' | 'after' | 'issue-flag'
const SESSION_TYPE_VALUES: SessionType[] = ['walkthrough', 'before', 'during', 'after', 'issue-flag']

interface PendingStill {
  url: string
  timestamp_seconds: number
}

function pickMimeType(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

// Job sites have bad bandwidth — a single dropped connection shouldn't lose a
// recording. 3 attempts with exponential backoff covers a transient drop.
async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 1500): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)))
    }
  }
  throw lastError
}

async function uploadViaSignedUrl(
  token: string,
  bookingId: string,
  kind: 'video' | 'still',
  file: Blob,
  filename: string
): Promise<{ path: string; publicUrl: string }> {
  return retryWithBackoff(async () => {
    const params = new URLSearchParams({
      booking_id: bookingId,
      kind,
      filename,
      content_type: file.type || (kind === 'video' ? 'video/webm' : 'image/jpeg'),
    })
    const res = await fetch(`/api/team-portal/media-note?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Failed to get upload URL for ${filename}`)
    const { path, signedUrl, publicUrl } = await res.json()

    const putRes = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    if (!putRes.ok) throw new Error(`Upload failed for ${filename}`)

    return { path, publicUrl }
  })
}

export default function LoopCamRecorder({
  bookingId,
  token,
  t,
  onComplete,
  defaultSessionType = 'walkthrough',
}: {
  bookingId: string
  token: string
  t: (en: string, es: string) => string
  onComplete: (noteId: string) => void
  defaultSessionType?: SessionType
}) {
  const [sessionType, setSessionType] = useState<SessionType>(defaultSessionType)
  const [phase, setPhase] = useState<'select' | 'recording' | 'saving' | 'save-failed'>('select')
  const [elapsed, setElapsed] = useState(0)
  const [stillCount, setStillCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saveProgress, setSaveProgress] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const stillsRef = useRef<PendingStill[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingSaveRef = useRef<{ blob: Blob; durationSeconds: number; ext: string } | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      stillsRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(1000) // 1s timeslices
      recorderRef.current = recorder

      startTimeRef.current = Date.now()
      setElapsed(0)
      setStillCount(0)
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 250)

      setPhase('recording')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not start camera/mic', 'No se pudo iniciar la cámara/micrófono'))
    }
  }, [t])

  const captureStill = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError(t('Camera not ready yet — try again in a moment.', 'La cámara todavía no está lista — intenta de nuevo.'))
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const timestampSeconds = (Date.now() - startTimeRef.current) / 1000
    const index = stillsRef.current.length

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError(t('Still capture failed.', 'Error al capturar la foto.'))
          return
        }
        try {
          const { publicUrl } = await uploadViaSignedUrl(token, bookingId, 'still', blob, `still-${index}.jpg`)
          stillsRef.current = [...stillsRef.current, { url: publicUrl, timestamp_seconds: timestampSeconds }]
          setStillCount(stillsRef.current.length)
        } catch (err) {
          setError(err instanceof Error ? err.message : t('Still upload failed', 'Error al subir la foto'))
        }
      },
      'image/jpeg',
      0.85
    )
  }, [t, token, bookingId])

  const performSave = useCallback(async () => {
    const pending = pendingSaveRef.current
    if (!pending) return
    const { blob, durationSeconds, ext } = pending

    try {
      setPhase('saving')
      setError(null)
      setSaveProgress(t('Uploading video…', 'Subiendo video…'))
      const { path: videoPath, publicUrl: videoUrl } = await uploadViaSignedUrl(token, bookingId, 'video', blob, `session.${ext}`)

      setSaveProgress(t('Saving note…', 'Guardando nota…'))
      const createRes = await fetch('/api/team-portal/media-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_id: bookingId,
          video_url: videoUrl,
          video_storage_path: videoPath,
          video_duration_seconds: durationSeconds,
          session_type: sessionType,
          stills: stillsRef.current,
        }),
      })
      if (!createRes.ok) throw new Error(t('Failed to save note', 'Error al guardar la nota'))
      const { note } = await createRes.json()

      // Fire-and-forget: transcription/AI overview runs server-side, the note
      // shows "processing" in the thread until it flips to complete.
      fetch(`/api/team-portal/media-note/${note.id}/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})

      pendingSaveRef.current = null
      onComplete(note.id)
    } catch (err) {
      // The recording stays in pendingSaveRef — "Retry" re-uploads the same
      // blob instead of losing the take and forcing a re-record.
      setError(
        err instanceof Error ? err.message : t('Save failed — your recording is still here, tap Retry.', 'Error al guardar — tu grabación sigue aquí, toca Reintentar.')
      )
      setPhase('save-failed')
    }
  }, [token, bookingId, sessionType, onComplete, t])

  const stopAndSave = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder) return

    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('saving')
    setSaveProgress(t('Finishing recording…', 'Terminando grabación…'))

    const finalBlob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }))
      recorder.stop()
    })
    streamRef.current?.getTracks().forEach((tr) => tr.stop())

    pendingSaveRef.current = {
      blob: finalBlob,
      durationSeconds: (Date.now() - startTimeRef.current) / 1000,
      ext: (recorder.mimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm',
    }
    await performSave()
  }, [performSave, t])

  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    setPhase('select')
  }, [])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="w-full max-w-sm mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {phase === 'select' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">{t('Record a LoopCam session', 'Grabar sesión LoopCam')}</p>
          <div className="grid grid-cols-2 gap-2 w-full">
            {SESSION_TYPE_VALUES.map((st) => (
              <button
                key={st}
                onClick={() => setSessionType(st)}
                className={`rounded-xl border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.08em] ${
                  sessionType === st ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={startRecording} className="w-full rounded-xl bg-red-600 text-white py-3 font-semibold">
            {t('Start Recording', 'Iniciar Grabación')}
          </button>
        </div>
      )}

      {(phase === 'recording' || phase === 'saving' || phase === 'save-failed') && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[70vh]">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />

          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-full px-3 py-1 font-mono text-sm">
            {mm}:{ss}
          </div>
          {stillCount > 0 && (
            <div className="absolute top-3 right-3 bg-black/60 text-white rounded-full px-2 py-1 text-xs">
              {stillCount} {t(stillCount === 1 ? 'still' : 'stills', stillCount === 1 ? 'foto' : 'fotos')}
            </div>
          )}

          {phase === 'saving' && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <p className="text-white text-sm">{saveProgress}</p>
            </div>
          )}

          {phase === 'save-failed' && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-white/60 text-xs">
                {t('Nothing was lost — retry when you have a better signal.', 'No se perdió nada — reintenta con mejor señal.')}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { pendingSaveRef.current = null; setPhase('select') }} className="rounded-full bg-white/20 text-white px-4 py-2 text-xs">
                  {t('Discard', 'Descartar')}
                </button>
                <button onClick={performSave} className="rounded-full bg-red-600 text-white px-4 py-2 text-xs font-semibold">
                  {t('Retry Upload', 'Reintentar')}
                </button>
              </div>
            </div>
          )}

          {phase === 'recording' && (
            <div className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-between">
              <button onClick={cancel} className="rounded-full bg-white/20 text-white px-3 py-2 text-xs">
                {t('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={captureStill}
                className="w-14 h-14 rounded-full border-4 border-white bg-white/30"
                aria-label={t('Capture still', 'Capturar foto')}
              />
              <button onClick={stopAndSave} className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-semibold">
                {t('Stop & Save', 'Detener y Guardar')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
