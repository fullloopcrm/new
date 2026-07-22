'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Booking = {
  id: string
  start_time: string
  end_time: string | null
  status: string
  service_type: string | null
  price: number | null
  clients: { name: string; address: string | null } | null
  team_members: { name: string } | null
}

// Today's ET calendar-day boundaries, expressed as UTC ISO timestamps. Derived
// from "now" so DST is handled correctly for the current date; re-derived on
// every mount/refresh, so at ET midnight the window naturally rolls to the new
// day and yesterday's completed jobs drop out — no separate "clear" job needed.
function todayETBoundsUTC(): { startISO: string; endISO: string; dateLabel: string } {
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const y = dateParts.find(p => p.type === 'year')!.value
  const m = dateParts.find(p => p.type === 'month')!.value
  const d = dateParts.find(p => p.type === 'day')!.value
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', timeZoneName: 'shortOffset',
  }).formatToParts(now).find(p => p.type === 'timeZoneName')!.value // e.g. "GMT-4"
  const offsetHours = parseInt(offsetName.replace('GMT', ''), 10) || 0
  const sign = offsetHours >= 0 ? '+' : '-'
  const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`
  const start = new Date(`${y}-${m}-${d}T00:00:00.000${offsetStr}`)
  const end = new Date(start.getTime() + 24 * 3600 * 1000)
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    dateLabel: start.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' }),
  }
}

function formatTimeET(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
}

const SECTIONS: { key: string; label: string; statuses: string[]; dotClass: string }[] = [
  { key: 'live', label: 'Live', statuses: ['in_progress'], dotClass: 'bg-green-500' },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled', 'confirmed', 'pending'], dotClass: 'bg-slate-400' },
  { key: 'completed', label: 'Completed', statuses: ['completed'], dotClass: 'bg-teal-600' },
]

export default function MobileDayListView() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [dateLabel, setDateLabel] = useState('')

  function load() {
    setLoading(true)
    const { startISO, endISO, dateLabel } = todayETBoundsUTC()
    setDateLabel(dateLabel)
    fetch(`/api/bookings?from=${encodeURIComponent(startISO)}&to=${encodeURIComponent(endISO)}&limit=200`)
      .then(r => r.json())
      .then(data => {
        const list: Booking[] = Array.isArray(data) ? data : (data.bookings ?? [])
        setBookings(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{dateLabel}</p>
        <button onClick={load} className="text-xs text-teal-700 font-medium px-2 py-1 -mr-2">Refresh</button>
      </div>

      {loading && bookings.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">Loading today&apos;s jobs…</p>
      )}

      {!loading && bookings.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">No jobs today.</p>
      )}

      {SECTIONS.map(section => {
        const items = bookings
          .filter(b => section.statuses.includes(b.status))
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        if (items.length === 0) return null
        return (
          <div key={section.key}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-2 h-2 rounded-full ${section.dotClass}`} />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label} ({items.length})</p>
            </div>
            <div className="space-y-2">
              {items.map(b => (
                <Link
                  key={b.id}
                  href={`/dashboard/bookings/${b.id}`}
                  className="block border border-slate-200 rounded-lg p-3 bg-white active:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 text-sm">{b.clients?.name || 'Client'}</p>
                    <p className="text-xs text-slate-400">{formatTimeET(b.start_time)}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {b.service_type || 'Cleaning'}{b.team_members?.name ? ` · ${b.team_members.name}` : ''}
                  </p>
                  {b.clients?.address && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{b.clients.address}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
