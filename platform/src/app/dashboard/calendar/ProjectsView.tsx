'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// Projects projection — long jobs (multiday / project duration-class) as spans on
// a horizon, Gantt-style. This is where a weeks-to-year job lives instead of
// smearing across a month grid. Reads /api/bookings and shows only multiday/project
// jobs; slot jobs stay in Month/Timeline. Empty until long jobs exist (today every
// booking is a same-day slot, so the honest state is "no long jobs yet").

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  service_type: string | null
  duration_class?: string | null
  clients: { name: string } | null
  team_members: { name: string } | null
}

const HORIZON_BACK_DAYS = 30
const HORIZON_FWD_DAYS = 180

function toDay(iso: string): number {
  const [d] = iso.split('T')
  const [y, mo, dd] = d.split('-').map(Number)
  return Math.floor(Date.UTC(y, mo - 1, dd) / 86_400_000)
}
function fmt(iso: string): string {
  const [d] = iso.split('T')
  const [y, mo, dd] = d.split('-').map(Number)
  return new Date(y, mo - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ProjectsView() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const now = new Date()
    const from = new Date(now); from.setDate(from.getDate() - HORIZON_BACK_DAYS)
    const to = new Date(now); to.setDate(to.getDate() + HORIZON_FWD_DAYS)
    const ymd = (d: Date) => d.toISOString().split('T')[0]
    const res = await fetch(`/api/bookings?from=${ymd(from)}&to=${ymd(to)}`)
    if (res.ok) {
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : data.bookings || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const { longJobs, startDay, totalDays, months } = useMemo(() => {
    const now = new Date()
    const from = new Date(now); from.setDate(from.getDate() - HORIZON_BACK_DAYS)
    const to = new Date(now); to.setDate(to.getDate() + HORIZON_FWD_DAYS)
    const s = Math.floor(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()) / 86_400_000)
    const e = Math.floor(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) / 86_400_000)
    const total = Math.max(1, e - s)

    const jobs = bookings
      .filter((b) => b.duration_class === 'project' || b.duration_class === 'multiday')
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    // Month tick labels across the horizon.
    const ticks: { label: string; left: number }[] = []
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cursor <= to) {
      const day = Math.floor(Date.UTC(cursor.getFullYear(), cursor.getMonth(), 1) / 86_400_000)
      if (day >= s) ticks.push({ label: cursor.toLocaleDateString('en-US', { month: 'short' }), left: ((day - s) / total) * 100 })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return { longJobs: jobs, startDay: s, totalDays: total, months: ticks }
  }, [bookings])

  if (loading) return <p className="py-16 text-center text-sm text-slate-400">Loading projects…</p>

  if (longJobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-700">No long jobs yet</p>
        <p className="mt-1 text-xs text-slate-500">Multi-day and project jobs (dumpster rentals, installs, builds) appear here as spans.</p>
        <p className="mt-1 text-xs text-slate-500">Same-day jobs live in Month &amp; Timeline.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Month scale */}
      <div className="relative mb-2 h-4 border-b border-slate-200">
        {months.map((m, i) => (
          <span key={i} className="absolute -top-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400" style={{ left: `${m.left}%` }}>{m.label}</span>
        ))}
      </div>
      <div className="space-y-2">
        {longJobs.map((b) => {
          const bs = toDay(b.start_time)
          const be = Math.max(bs + 1, toDay(b.end_time))
          const left = ((bs - startDay) / totalDays) * 100
          const width = Math.max(1.5, ((be - bs) / totalDays) * 100)
          const color = b.duration_class === 'project' ? 'bg-purple-500' : 'bg-amber-500'
          return (
            <div key={b.id} className="grid grid-cols-[160px_1fr] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{b.clients?.name || 'Client'}</p>
                <p className="truncate text-[11px] text-slate-500">{fmt(b.start_time)} – {fmt(b.end_time)}</p>
              </div>
              <div className="relative h-6">
                <div
                  className={`absolute top-0 h-6 rounded ${color} flex items-center overflow-hidden px-2`}
                  style={{ left: `${Math.max(0, left)}%`, width: `${width}%` }}
                  title={`${b.service_type || 'Job'} · ${b.team_members?.name || 'Unassigned'}`}
                >
                  <span className="cal-chip-sm truncate text-[10px] font-medium text-white">{b.service_type || 'Job'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
