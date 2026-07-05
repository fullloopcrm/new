'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// Timeline / Dispatch projection — team members (rows) × time (columns) for a
// single day. This is the daily driver for slot trades: 1hr jobs read cleanly,
// gaps and back-to-backs are visible at a glance. Native CSS grid, no dependency
// (no FullCalendar Scheduler license). v1 is read-only view; drag-to-reschedule
// is a later brick. Reads /api/team + /api/bookings.

interface TeamMember { id: string; name: string; calendar_color?: string }
interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  service_type: string | null
  team_member_id: string | null
  clients: { name: string } | null
}

const DAY_START_MIN = 6 * 60   // 6 AM
const DAY_END_MIN = 22 * 60    // 10 PM
const RANGE = DAY_END_MIN - DAY_START_MIN
const HOURS = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 + 1 }, (_, i) => DAY_START_MIN / 60 + i)
const COLORS = ['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316']

function toMin(iso: string): number {
  const t = iso.split('T')[1] || '00:00'
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function hourLabel(h: number): string {
  const ampm = h >= 12 ? 'p' : 'a'
  const hr = h % 12 || 12
  return `${hr}${ampm}`
}
function localYMD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function TimelineView() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [day, setDay] = useState<string>(() => localYMD(new Date()))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/team').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      setTeam(Array.isArray(d) ? d : d.team_members || [])
    }).catch(() => {})
  }, [])

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const res = await fetch(`/api/bookings?from=${d}&to=${d}`)
    if (res.ok) {
      const data = await res.json()
      const all: Booking[] = Array.isArray(data) ? data : data.bookings || []
      setBookings(all.filter((b) => b.start_time.startsWith(d) && b.status !== 'cancelled'))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(day) }, [day, load])

  const colorFor = useMemo(() => {
    const map: Record<string, string> = {}
    team.forEach((m, i) => { map[m.id] = m.calendar_color || COLORS[i % COLORS.length] })
    return map
  }, [team])

  // Rows: every team member, plus an Unassigned row if any job lacks a member.
  const rows = useMemo(() => {
    const r: { id: string | null; name: string }[] = team.map((m) => ({ id: m.id, name: m.name }))
    if (bookings.some((b) => !b.team_member_id)) r.push({ id: null, name: 'Unassigned' })
    return r
  }, [team, bookings])

  function shiftDay(delta: number) {
    const [y, mo, d] = day.split('-').map(Number)
    const nd = new Date(y, mo - 1, d + delta)
    setDay(localYMD(nd))
  }

  const dayLabel = (() => {
    const [y, mo, d] = day.split('-').map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  })()

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => shiftDay(-1)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50">‹</button>
        <button onClick={() => setDay(localYMD(new Date()))} className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50">Today</button>
        <button onClick={() => shiftDay(1)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50">›</button>
        <span className="ml-2 text-sm font-semibold text-slate-900">{dayLabel}</span>
        {loading && <span className="text-xs text-slate-400">loading…</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="min-w-[720px]">
          {/* Hour header */}
          <div className="flex border-b border-slate-200">
            <div className="w-32 flex-shrink-0 border-r border-slate-200" />
            <div className="relative h-6 flex-1">
              {HOURS.map((h) => (
                <span key={h} className="absolute top-1 -translate-x-1/2 text-[10px] text-slate-400" style={{ left: `${((h * 60 - DAY_START_MIN) / RANGE) * 100}%` }}>{hourLabel(h)}</span>
              ))}
            </div>
          </div>

          {/* Member rows */}
          {rows.map((row) => {
            const jobs = bookings.filter((b) => (b.team_member_id || null) === row.id)
            return (
              <div key={row.id ?? 'unassigned'} className="flex border-b border-slate-100 last:border-0">
                <div className="flex w-32 flex-shrink-0 items-center gap-1.5 border-r border-slate-200 px-2 py-2">
                  {row.id && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: colorFor[row.id] }} />}
                  <span className="truncate text-xs font-medium text-slate-700">{row.name}</span>
                </div>
                <div className="relative h-12 flex-1">
                  {/* hour gridlines */}
                  {HOURS.map((h) => (
                    <div key={h} className="absolute top-0 bottom-0 w-px bg-slate-50" style={{ left: `${((h * 60 - DAY_START_MIN) / RANGE) * 100}%` }} />
                  ))}
                  {jobs.map((b) => {
                    const s = Math.max(DAY_START_MIN, toMin(b.start_time))
                    const e = Math.min(DAY_END_MIN, Math.max(s + 15, toMin(b.end_time)))
                    const left = ((s - DAY_START_MIN) / RANGE) * 100
                    const width = ((e - s) / RANGE) * 100
                    const bg = row.id ? colorFor[row.id] : '#94a3b8'
                    return (
                      <div
                        key={b.id}
                        className="absolute top-1.5 flex h-9 items-center overflow-hidden rounded px-1.5 text-white"
                        style={{ left: `${left}%`, width: `${Math.max(2, width)}%`, background: bg }}
                        title={`${b.clients?.name || 'Client'} · ${b.service_type || 'Job'}`}
                      >
                        <span className="truncate text-[10px] font-medium">{b.clients?.name || 'Client'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">No team members yet.</p>}
        </div>
      </div>
    </div>
  )
}
