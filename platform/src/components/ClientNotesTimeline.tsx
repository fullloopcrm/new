'use client'

import { useEffect, useState } from 'react'

// Read-only rollup of a client's full notes history across every one of
// their bookings — the "copy of the notes in the client profile" view.
// Deliberately read-only: replying belongs on the specific booking it's
// about (BookingNotes.tsx), not forked into a second conversation here.
interface ClientNote {
  id: string
  booking_id: string | null
  author_type: 'admin' | 'client' | 'system' | 'crew'
  author_name: string | null
  content: string | null
  created_at: string
  note_type?: 'text' | 'video'
}

const AUTHOR_LABEL: Record<string, string> = {
  admin: 'Admin', client: 'Client', crew: 'Crew', system: 'System',
}

function formatWhen(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

export default function ClientNotesTimeline({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/booking-notes?client_id=${clientId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ClientNote[]) => { if (!cancelled) setNotes((rows || []).filter((n) => n.note_type !== 'video')) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [clientId])

  if (loading) return <p className="text-sm text-slate-400">Loading notes…</p>
  if (notes.length === 0) return <p className="text-sm text-slate-400 italic">No notes across any booking yet.</p>

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {notes.map((n) => (
        <div key={n.id} className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="font-medium text-slate-700">{n.author_name || AUTHOR_LABEL[n.author_type] || n.author_type}</span>
            <span className="text-xs text-slate-400 shrink-0">{formatWhen(n.created_at)}</span>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
          {n.booking_id && (
            <a href={`/dashboard/bookings/${n.booking_id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
              View booking →
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
