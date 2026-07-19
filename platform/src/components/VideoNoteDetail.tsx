'use client'

import { useRef, useState } from 'react'
import { useLang } from '@/hooks/useLang'
import type { BookingNote } from './BookingNotes'

// Scoped to this component only (not merged into the dashboard's own palette)
// so the editorial look ported from the loopcam-standalone prototype renders
// exactly as designed without affecting the rest of the app.
const THEME_VARS = {
  '--vnd-canvas': '#ffffff',
  '--vnd-ink': '#1c1c1c',
  '--vnd-graphite': '#3a3a3a',
  '--vnd-muted': '#7a7a78',
  '--vnd-line': '#c8c5bc',
  '--vnd-good': '#1f4d2c',
  '--vnd-warn': '#8b4513',
} as React.CSSProperties

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function statusLabel(status: string | null | undefined, t: (en: string, es: string) => string): string {
  switch (status) {
    case 'uploading': return t('uploading', 'subiendo')
    case 'uploaded': return t('uploaded', 'subido')
    case 'transcribing': return t('transcribing', 'transcribiendo')
    case 'summarizing': return t('summarizing', 'resumiendo')
    case 'complete': return t('complete', 'completo')
    case 'failed': return t('failed', 'fallido')
    default: return status || ''
  }
}

function sessionTypeLabel(type: string | null | undefined, t: (en: string, es: string) => string): string {
  switch (type) {
    case 'walkthrough': return t('Walkthrough', 'Recorrido')
    case 'before': return t('Before', 'Antes')
    case 'during': return t('During', 'Durante')
    case 'after': return t('After', 'Después')
    case 'issue-flag': return t('Issue Flag', 'Problema')
    default: return type || t('Video', 'Video')
  }
}

interface TranscriptClip {
  start: number
  end: number
  speaker: number | null
  text: string
}

const CLIP_GAP_THRESHOLD_SECONDS = 4

function groupTranscriptIntoClips(segments: { start: number; end: number; text: string; speaker: number | null }[]): TranscriptClip[] {
  const clips: TranscriptClip[] = []
  for (const seg of segments) {
    const last = clips[clips.length - 1]
    const continuesLastClip = last && last.speaker === seg.speaker && seg.start - last.end < CLIP_GAP_THRESHOLD_SECONDS
    if (last && continuesLastClip) {
      last.end = seg.end
      last.text = `${last.text} ${seg.text}`
    } else {
      clips.push({ start: seg.start, end: seg.end, speaker: seg.speaker, text: seg.text })
    }
  }
  return clips
}

type Tab = 'overview' | 'transcript'

export default function VideoNoteDetail({
  note,
  projectName,
  onRetry,
}: {
  note: BookingNote
  projectName: string
  onRetry: () => void
}) {
  const { lang, setLang, t } = useLang()
  const [tab, setTab] = useState<Tab>('overview')
  const videoRef = useRef<HTMLVideoElement>(null)

  const overview = note.ai_overview_json
  const transcript = note.transcript_json
  const hasTranscript = !!transcript && transcript.length > 0
  // Covers every pre-complete state, including the 'uploaded' window right after
  // creation (before the background transcribe/summarize job picks it up) —
  // without this the card shows nothing at all during that gap.
  const busy =
    note.processing_status === 'uploading' ||
    note.processing_status === 'uploaded' ||
    note.processing_status === 'transcribing' ||
    note.processing_status === 'summarizing'

  function seek(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play()
    }
  }

  return (
    <div
      style={THEME_VARS}
      className="w-full border border-[var(--vnd-line)] bg-[var(--vnd-canvas)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col h-[560px] overflow-hidden"
    >
        {/* HEADER */}
        <div className="shrink-0 border-b border-[var(--vnd-line)] px-6 py-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] truncate">
              {projectName}
            </p>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--vnd-ink)] leading-tight">
              {sessionTypeLabel(note.video_session_type, t)} {t('session', 'sesión')}
            </h1>
            <p className="text-sm text-[var(--vnd-muted)]">
              {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              {new Date(note.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {note.author_name && (
                <>
                  {' · '}
                  {t('Recorded by', 'Grabado por')} {note.author_name}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.1em] border px-3 py-1 rounded-full ${
                note.processing_status === 'complete'
                  ? 'text-[var(--vnd-good)] border-[var(--vnd-good)]'
                  : note.processing_status === 'failed'
                    ? 'text-[var(--vnd-warn)] border-[var(--vnd-warn)]'
                    : 'text-[var(--vnd-muted)] border-[var(--vnd-line)]'
              }`}
            >
              {statusLabel(note.processing_status, t)}
            </span>
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="font-mono text-[10.5px] uppercase tracking-[0.1em] border border-[var(--vnd-line)] bg-[var(--vnd-canvas)] px-2 py-1 text-[var(--vnd-muted)] hover:border-[var(--vnd-muted)] transition-colors"
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT — video panel. No stills grid yet: the pipeline doesn't extract
              frame-captures from the video, only transcript + AI overview. */}
          <aside className="w-72 shrink-0 bg-[#f7f6f2] border-r border-[var(--vnd-line)] overflow-y-auto">
            <div className="bg-black">
              {note.video_url ? (
                <video ref={videoRef} src={note.video_url} controls className="w-full block" />
              ) : (
                <div className="h-56 flex items-center justify-center text-white/50 text-sm">
                  {t('No video', 'Sin video')}
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT — content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-5">
              {busy && (
                <div className="border-l-2 border-[var(--vnd-warn)] bg-[#f7f6f2] pl-3 py-2 text-[var(--vnd-warn)] text-sm">
                  {note.processing_status === 'uploading'
                    ? t('Uploading video…', 'Subiendo video…')
                    : note.processing_status === 'uploaded'
                      ? t('Queued for transcription…', 'En cola para transcripción…')
                      : note.processing_status === 'transcribing'
                        ? t('Transcribing audio via Deepgram…', 'Transcribiendo audio con Deepgram…')
                        : t('Generating AI overview via Claude…', 'Generando resumen de IA con Claude…')}
                </div>
              )}

              {note.processing_status === 'failed' && (
                <div className="border-l-2 border-[var(--vnd-warn)] bg-[#f7f6f2] pl-3 py-2 text-[var(--vnd-warn)] text-sm space-y-2">
                  <p>{t('Processing failed:', 'Error al procesar:')} {note.processing_failure_reason}</p>
                  <button onClick={onRetry} className="rounded-full bg-[var(--vnd-ink)] text-white px-3 py-1.5 text-sm font-medium">
                    {t('Retry', 'Reintentar')}
                  </button>
                </div>
              )}

              {overview && (
                <div>
                  <div className="flex gap-1 border-b border-[var(--vnd-line)]">
                    <button
                      onClick={() => setTab('overview')}
                      className={`font-mono text-[10.5px] uppercase tracking-[0.1em] px-3 py-2 border-b-2 -mb-px ${
                        tab === 'overview'
                          ? 'border-[var(--vnd-ink)] text-[var(--vnd-ink)]'
                          : 'border-transparent text-[var(--vnd-muted)] hover:text-[var(--vnd-graphite)]'
                      }`}
                    >
                      {t('Overview', 'Resumen')}
                    </button>
                    {hasTranscript && (
                      <button
                        onClick={() => setTab('transcript')}
                        className={`font-mono text-[10.5px] uppercase tracking-[0.1em] px-3 py-2 border-b-2 -mb-px ${
                          tab === 'transcript'
                            ? 'border-[var(--vnd-ink)] text-[var(--vnd-ink)]'
                            : 'border-transparent text-[var(--vnd-muted)] hover:text-[var(--vnd-graphite)]'
                        }`}
                      >
                        {t('Transcript', 'Transcripción')}
                      </button>
                    )}
                  </div>

                  <div className="pt-5">
                    {tab === 'overview' && (
                      <section className="space-y-4">
                        {overview.highlights?.length > 0 && (
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                              {t('Highlights', 'Aspectos Destacados')}
                            </h3>
                            <ul className="list-disc list-inside text-[var(--vnd-graphite)] space-y-0.5">
                              {overview.highlights.map((h, i) => <li key={i}>{h}</li>)}
                            </ul>
                          </div>
                        )}

                        <p className="text-[var(--vnd-graphite)] leading-relaxed">{overview.summary}</p>

                        {overview.location_overview && (
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                              {t('Location', 'Ubicación')}
                            </h3>
                            <p className="text-[var(--vnd-graphite)]">{overview.location_overview}</p>
                          </div>
                        )}

                        {(overview.areas_observed?.length ?? 0) > 0 && (
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                              {t('Areas Observed', 'Áreas Observadas')}
                            </h3>
                            <ul className="space-y-1">
                              {overview.areas_observed!.map((a, i) => (
                                <li key={i} className="text-sm text-[var(--vnd-graphite)]">
                                  <span className="font-medium">{a.name}</span> — {a.condition}. {a.notes}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(overview.issues_flagged?.length ?? 0) > 0 && (
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                              {t('Issues Flagged', 'Problemas Detectados')}
                            </h3>
                            <ul className="space-y-1">
                              {overview.issues_flagged!.map((iss, i) => (
                                <li key={i} className="text-sm text-[var(--vnd-graphite)]">
                                  <span className="uppercase text-[10px] font-bold text-[var(--vnd-warn)] mr-2">{iss.severity}</span>
                                  {iss.issue} <span className="text-[var(--vnd-muted)]">({iss.timestamp})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(overview.work_performed?.length ?? 0) > 0 && (
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                              {t('Work Performed', 'Trabajo Realizado')}
                            </h3>
                            <ul className="space-y-1">
                              {overview.work_performed!.map((w, i) => (
                                <li key={i} className="text-sm text-[var(--vnd-graphite)]">
                                  <span className="font-medium">{w.task}</span> — {w.notes}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(overview.recommendations?.length ?? 0) > 0 && (
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                              {t('Recommendations', 'Recomendaciones')}
                            </h3>
                            <ul className="list-disc list-inside text-sm text-[var(--vnd-graphite)] space-y-0.5">
                              {overview.recommendations!.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}

                        {(overview.customer_message || overview.internal_notes) && (
                          <div className="grid gap-3 sm:grid-cols-2 pt-1">
                            {overview.customer_message && (
                              <div className="border-l-2 border-[var(--vnd-good)] pl-3 py-1 text-sm">
                                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-good)] mb-1">
                                  {t('Customer message', 'Mensaje para el cliente')}
                                </p>
                                <p className="text-[var(--vnd-ink)]">{overview.customer_message}</p>
                              </div>
                            )}
                            {overview.internal_notes && (
                              <div className="border-l-2 border-[var(--vnd-line)] pl-3 py-1 text-sm">
                                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--vnd-muted)] mb-1">
                                  {t('Internal notes (never shown to customer)', 'Notas internas (nunca se muestran al cliente)')}
                                </p>
                                <p className="text-[var(--vnd-graphite)]">{overview.internal_notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    {tab === 'transcript' && hasTranscript && (
                      <section className="space-y-1">
                        {overview.transcript_clips?.length > 0
                          ? overview.transcript_clips.map((clip, i) => (
                              <button
                                key={i}
                                onClick={() => seek(clip.start_seconds)}
                                className="block w-full text-left p-3 rounded border border-transparent hover:border-[var(--vnd-line)] hover:bg-[#f7f6f2] transition-colors"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--vnd-muted)] shrink-0">
                                    {fmt(clip.start_seconds)}
                                  </span>
                                  <h4 className="text-sm font-semibold text-[var(--vnd-ink)]">{clip.title}</h4>
                                </div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {clip.bullets.map((b, j) => (
                                    <li key={j} className="text-sm text-[var(--vnd-graphite)]">{b}</li>
                                  ))}
                                </ul>
                              </button>
                            ))
                          : groupTranscriptIntoClips(transcript!).map((clip, i) => (
                              <button
                                key={i}
                                onClick={() => seek(clip.start)}
                                className="block w-full text-left p-3 rounded border border-transparent hover:border-[var(--vnd-line)] hover:bg-[#f7f6f2] transition-colors"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--vnd-muted)]">
                                    {fmt(clip.start)}–{fmt(clip.end)}
                                  </span>
                                  {clip.speaker !== null && (
                                    <span className="text-[10px] font-semibold text-[var(--vnd-muted)]">
                                      {t('Speaker', 'Interlocutor')} {clip.speaker}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-[var(--vnd-graphite)] leading-relaxed">{clip.text}</p>
                              </button>
                            ))}
                      </section>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}

