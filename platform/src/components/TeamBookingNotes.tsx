'use client'

import { useState, useEffect, useCallback } from 'react'

// Lean thread view + text reply for the team/cleaner portal — reads and posts
// through the same /api/booking-notes thread the admin and client portals
// use (see BookingNotes.tsx), authenticated via the team-portal Bearer token
// instead of a cookie session. Intentionally doesn't carry the admin
// component's image/video/@-mention tooling — cleaners already have a
// separate LoopCam flow for photo/video notes; this is just the reply gap.
interface TeamBookingNote {
  id: string
  author_type: 'admin' | 'client' | 'system' | 'crew'
  author_name: string | null
  content: string | null
  created_at: string
  note_type?: 'text' | 'video'
}

function formatWhen(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

export default function TeamBookingNotes({
  bookingId,
  authToken,
  t,
}: {
  bookingId: string
  authToken: string
  t: (en: string, es: string) => string
}) {
  const [notes, setNotes] = useState<TeamBookingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const headers = { Authorization: `Bearer ${authToken}` }

  const load = useCallback(() => {
    fetch(`/api/booking-notes?booking_id=${bookingId}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: TeamBookingNote[]) => setNotes((rows || []).filter((n) => n.note_type !== 'video')))
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, authToken])

  useEffect(() => { load() }, [load])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/booking-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ booking_id: bookingId, content: text.trim() }),
      })
      if (res.ok) {
        setText('')
        load()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
      <p className="text-sm font-semibold text-slate-800 px-3 pt-3">{t('Notes / Notas', 'Notas')}</p>
      <div className="px-3 py-2 space-y-2 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-slate-400 italic">{t('Loading…', 'Cargando…')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-slate-400 italic">{t('No notes yet / Sin notas todavía', 'Sin notas todavía')}</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`text-sm p-2 rounded-lg ${n.author_type === 'crew' ? 'bg-teal-50 ml-4' : 'bg-gray-50 mr-4'}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-slate-700 text-xs">{n.author_name || n.author_type}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{formatWhen(n.created_at)}</span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 p-3 border-t border-gray-100">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={t('Reply…', 'Responder…')}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('Send', 'Enviar')}
        </button>
      </div>
    </div>
  )
}
