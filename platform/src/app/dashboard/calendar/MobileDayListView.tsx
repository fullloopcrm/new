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

// Current ET calendar month's boundaries, expressed as UTC ISO timestamps.
// Derived from "now" so DST is handled correctly for the current date;
// re-derived on every mount/refresh, so the window naturally rolls to the
// new month at ET midnight on the 1st — no separate clear job needed.
function monthBoundsUTC(): { startISO: string; endISO: string } {
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit',
  }).formatToParts(now)
  const y = Number(dateParts.find(p => p.type === 'year')!.value)
  const m = Number(dateParts.find(p => p.type === 'month')!.value)
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', timeZoneName: 'shortOffset',
  }).formatToParts(now).find(p => p.type === 'timeZoneName')!.value // e.g. "GMT-4"
  const offsetHours = parseInt(offsetName.replace('GMT', ''), 10) || 0
  const sign = offsetHours >= 0 ? '+' : '-'
  const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`
  const start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00.000${offsetStr}`)
  const nextMonth = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
  const end = new Date(`${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01T00:00:00.000${offsetStr}`)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

function etDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

function todayETDateKey(): string {
  return etDateKey(new Date().toISOString())
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const noon = new Date(Date.UTC(y, m - 1, d, 12))
  return noon.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTimeET(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
}

const STATUS_META: Record<string, { label: string; dotClass: string }> = {
  in_progress: { label: 'Live', dotClass: 'bg-green-500' },
  scheduled: { label: 'Scheduled', dotClass: 'bg-slate-400' },
  confirmed: { label: 'Scheduled', dotClass: 'bg-slate-400' },
  pending: { label: 'Scheduled', dotClass: 'bg-slate-400' },
  completed: { label: 'Completed', dotClass: 'bg-teal-600' },
}

export default function MobileDayListView() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    const { startISO, endISO } = monthBoundsUTC()
    fetch(`/api/bookings?from=${encodeURIComponent(startISO)}&to=${encodeURIComponent(endISO)}&limit=1000`)
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
      body: JSON.stringify({ type: '30min_warning', booking_id: id, message: '30-min heads up sent from mobile list' }),
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

  const todayKey = todayETDateKey()

  const byDay = new Map<string, Booking[]>()
  for (const b of bookings) {
    const key = etDateKey(b.start_time)
    const group = byDay.get(key)
    if (group) group.push(b)
    else byDay.set(key, [b])
  }
  const dayKeys = Array.from(byDay.keys()).sort()
  for (const key of dayKeys) {
    byDay.get(key)!.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">This Month</p>
        <button onClick={load} className="text-xs text-teal-700 font-medium px-2 py-1 -mr-2">Refresh</button>
      </div>

      {loading && bookings.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">Loading this month&apos;s jobs…</p>
      )}

      {!loading && bookings.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">No jobs this month.</p>
      )}

      {dayKeys.map(dayKey => {
        const items = byDay.get(dayKey)!
        const isToday = dayKey === todayKey
        return (
          <div key={dayKey}>
            <div className="flex items-center gap-2 mb-2">
              <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-teal-700' : 'text-slate-500'}`}>
                {isToday ? 'Today' : formatDayLabel(dayKey)}
              </p>
              {isToday && <span className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-1.5 py-0.5">{formatDayLabel(dayKey)}</span>}
              <span className="text-[10px] text-slate-400">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map(b => {
                const isBusy = busyId === b.id
                const meta = STATUS_META[b.status] ?? { label: b.status, dotClass: 'bg-slate-300' }
                return (
                  <div key={b.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <Link href={`/dashboard/bookings/${b.id}`} className="block active:opacity-70">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                          <p className="font-medium text-slate-900 text-sm">{b.clients?.name || 'Client'}</p>
                        </div>
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
                      {(b.status === 'scheduled' || b.status === 'confirmed' || b.status === 'pending') && (
                        <button disabled={isBusy} onClick={() => checkIn(b.id)} className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-medium disabled:opacity-50">Check In</button>
                      )}
                      {b.status === 'in_progress' && (
                        <>
                          <button disabled={isBusy} onClick={() => sendThirtyMin(b.id)} className="px-2.5 py-1 bg-amber-500 text-white rounded text-[11px] font-medium disabled:opacity-50">30-Min</button>
                          <button disabled={isBusy} onClick={() => checkOut(b.id)} className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium disabled:opacity-50">Check Out</button>
                          <button disabled={isBusy} onClick={() => undo(b.id, 'check-in')} className="px-2 py-1 text-[11px] text-red-600 underline disabled:opacity-50">undo check-in</button>
                        </>
                      )}
                      {b.status === 'completed' && (
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
