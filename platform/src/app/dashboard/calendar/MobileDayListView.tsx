'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Booking = {
  id: string
  start_time: string
  end_time: string | null
  status: string
  check_in_time: string | null
  check_out_time: string | null
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
  const [busyId, setBusyId] = useState<string | null>(null)

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

  async function checkIn(id: string) {
    setBusyId(id)
    await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress', check_in_time: new Date().toISOString(), skip_email: true }),
    }).catch(() => {})
    setBusyId(null)
    load()
  }

  async function sendThirtyMin(id: string) {
    setBusyId(id)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: '15min_warning', booking_id: id, message: '30-min heads up sent from mobile list' }),
    }).catch(() => {})
    setBusyId(null)
  }

  async function checkOut(id: string) {
    setBusyId(id)
    await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', check_out_time: new Date().toISOString(), skip_email: true }),
    }).catch(() => {})
    setBusyId(null)
    load()
  }

  async function undo(id: string, stage: 'check-in' | 'check-out') {
    if (!confirm(stage === 'check-out' ? 'Undo check-out? Sends this job back to in-progress.' : 'Undo check-in? Sends this job back to scheduled.')) return
    setBusyId(id)
    await fetch(`/api/bookings/${id}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    }).catch(() => {})
    setBusyId(null)
    load()
  }

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
              {items.map(b => {
                const isBusy = busyId === b.id
                return (
                  <div key={b.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <Link href={`/dashboard/bookings/${b.id}`} className="block active:opacity-70">
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
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                      {section.key === 'scheduled' && (
                        <button disabled={isBusy} onClick={() => checkIn(b.id)} className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-medium disabled:opacity-50">Check In</button>
                      )}
                      {section.key === 'live' && (
                        <>
                          <button disabled={isBusy} onClick={() => sendThirtyMin(b.id)} className="px-2.5 py-1 bg-amber-500 text-white rounded text-[11px] font-medium disabled:opacity-50">30-Min</button>
                          <button disabled={isBusy} onClick={() => checkOut(b.id)} className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium disabled:opacity-50">Check Out</button>
                          <button disabled={isBusy} onClick={() => undo(b.id, 'check-in')} className="px-2 py-1 text-[11px] text-red-600 underline disabled:opacity-50">undo check-in</button>
                        </>
                      )}
                      {section.key === 'completed' && (
                        <button disabled={isBusy} onClick={() => undo(b.id, 'check-out')} className="px-2 py-1 text-[11px] text-red-600 underline disabled:opacity-50">undo check-out</button>
                      )}
                      <Link href={`/dashboard/bookings/${b.id}`} className="px-2.5 py-1 border border-slate-300 rounded text-[11px] font-medium text-slate-600 ml-auto">Edit</Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
