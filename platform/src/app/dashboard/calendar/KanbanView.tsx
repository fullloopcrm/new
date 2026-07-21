'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildMemberColors, colorForMember, type ColorableMember } from './_colors'

// Kanban projection of the same jobs the calendar shows — grouped by status
// instead of by time. Drag a card to a new column to advance its status. Native
// HTML5 drag-and-drop (no new dependency). Reads /api/bookings, writes via the
// same PUT the calendar uses, so enforcement (overlap trigger, day-off) still
// applies. Moving TO "scheduled" fires the client confirmation the PUT already
// sends — so every move is confirm()-gated to avoid accidental client comms.

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  service_type: string | null
  price: number
  duration_class?: string | null
  team_member_id: string | null
  clients: { name: string } | null
  team_members: { name: string } | null
}

const COLUMNS: { key: string; label: string; accent: string }[] = [
  { key: 'pending', label: 'Pending', accent: 'border-t-red-500' },
  { key: 'scheduled', label: 'Scheduled', accent: 'border-t-teal-500' },
  { key: 'in_progress', label: 'In Progress', accent: 'border-t-blue-500' },
  { key: 'completed', label: 'Completed', accent: 'border-t-slate-400' },
]

const CLASS_BADGE: Record<string, string> = {
  slot: 'bg-slate-100 text-slate-500',
  multiday: 'bg-amber-100 text-amber-700',
  project: 'bg-purple-100 text-purple-700',
}

function fmtDate(iso: string): string {
  const [datePart] = iso.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function KanbanView() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/team').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      const members: ColorableMember[] = Array.isArray(d) ? d : (d.team || d.team_members || [])
      setMemberColors(buildMemberColors(members))
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    // A 120-day window centered on now — enough to see the active pipeline.
    const now = new Date()
    const from = new Date(now); from.setDate(from.getDate() - 30)
    const to = new Date(now); to.setDate(to.getDate() + 90)
    const ymd = (d: Date) => d.toISOString().split('T')[0]
    const res = await fetch(`/api/bookings?from=${ymd(from)}&to=${ymd(to)}`)
    if (res.ok) {
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : data.bookings || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const byColumn = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    for (const c of COLUMNS) map[c.key] = []
    for (const b of bookings) {
      if (map[b.status]) map[b.status].push(b)
    }
    for (const c of COLUMNS) map[c.key].sort((a, b) => a.start_time.localeCompare(b.start_time))
    return map
  }, [bookings])

  async function moveTo(bookingId: string, toStatus: string) {
    const b = bookings.find((x) => x.id === bookingId)
    if (!b || b.status === toStatus) return
    const label = COLUMNS.find((c) => c.key === toStatus)?.label || toStatus
    const clientName = b.clients?.name || 'this job'
    const note = toStatus === 'scheduled' ? ' (this notifies the client)' : ''
    if (!confirm(`Move ${clientName} to ${label}?${note}`)) return

    // Optimistic update; roll back on failure.
    const prev = bookings
    setBookings((cur) => cur.map((x) => (x.id === bookingId ? { ...x, status: toStatus } : x)))
    setError('')
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: toStatus }),
    })
    if (!res.ok) {
      setBookings(prev)
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not update status')
    }
  }

  if (loading) return <p className="py-16 text-center text-sm text-slate-400">Loading board…</p>

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault() }}
            onDrop={() => { if (dragId) moveTo(dragId, col.key); setDragId(null) }}
            className={`rounded-xl border border-slate-200 border-t-2 ${col.accent} bg-slate-50/50 p-2`}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{col.label}</span>
              <span className="text-xs font-medium text-slate-400">{byColumn[col.key].length}</span>
            </div>
            <div className="space-y-1.5">
              {byColumn[col.key].map((b) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-opacity active:cursor-grabbing ${dragId === b.id ? 'opacity-40' : ''}`}
                  style={{ borderLeftWidth: '3px', borderLeftColor: colorForMember(memberColors, b.team_member_id) }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="cal-chip-md truncate text-sm font-medium text-slate-900">{b.clients?.name || 'Client'}</span>
                    {b.duration_class && b.duration_class !== 'slot' && (
                      <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${CLASS_BADGE[b.duration_class] || CLASS_BADGE.slot}`}>{b.duration_class}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {fmtDate(b.start_time)} · {b.service_type || 'Job'}{b.team_members?.name ? ` · ${b.team_members.name}` : ''}
                  </p>
                </div>
              ))}
              {byColumn[col.key].length === 0 && (
                <p className="px-2 py-6 text-center text-[11px] text-slate-300">Drop here</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {(() => {
        const hidden = bookings.filter((b) => !COLUMNS.some((c) => c.key === b.status)).length
        return hidden > 0 ? (
          <p className="mt-3 text-xs text-slate-400">{hidden} canceled / other status not shown on the board.</p>
        ) : null
      })()}
    </div>
  )
}
