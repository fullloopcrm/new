'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { buildMemberColors, colorForMember, type ColorableMember } from './_colors'
import '../bookings/schedule.css'

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
  team_member_id: string | null
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
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '', service_type: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/team').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      const members: ColorableMember[] = Array.isArray(d) ? d : (d.team || d.team_members || [])
      setMemberColors(buildMemberColors(members))
    }).catch(() => {})
  }, [])

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

  async function createProject(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.start_date || !form.end_date) { setErr('Title, start and end date are required'); return }
    if (form.end_date < form.start_date) { setErr('End date must be on or after start date'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setForm({ title: '', start_date: '', end_date: '', service_type: '' })
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setErr(d.error || 'Could not create project')
    }
  }

  const activeCount = longJobs.filter((b) => b.status === 'in_progress').length
  const upcomingCount = longJobs.filter((b) => b.status === 'scheduled').length
  const completedCount = longJobs.filter((b) => b.status === 'completed').length

  return (
    <div className="sched-scope">
      <div className="sched-outlook" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="sched-stat">
          <div className="sched-stat-label">Total Projects</div>
          <div className="sched-stat-value">{longJobs.length}</div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">Active</div>
          <div className="sched-stat-value">{activeCount}</div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">Upcoming</div>
          <div className="sched-stat-value">{upcomingCount}</div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">Completed</div>
          <div className="sched-stat-value">{completedCount}</div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">Long jobs (multi-day / project) as spans.</p>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm lg:col-span-2" />
          <input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} placeholder="Service (optional)" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:col-span-2 lg:col-span-5">
            {saving ? 'Creating…' : 'Create project'}
          </button>
          {err && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-5">{err}</p>}
        </form>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-400">Loading projects…</p>
      ) : longJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-slate-700">No long jobs yet</p>
          <p className="mt-1 text-xs text-slate-500">Create one above, or any booking spanning multiple days lands here as a span.</p>
        </div>
      ) : (
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
              const barColor = colorForMember(memberColors, b.team_member_id)
              return (
                <div key={b.id} className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{b.clients?.name || 'Client'}</p>
                    <p className="truncate text-[11px] text-slate-500">{fmt(b.start_time)} – {fmt(b.end_time)}</p>
                  </div>
                  <div className="relative h-6">
                    <div
                      className="absolute top-0 h-6 rounded flex items-center overflow-hidden px-2"
                      style={{ left: `${Math.max(0, left)}%`, width: `${width}%`, background: barColor }}
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
      )}
    </div>
  )
}
