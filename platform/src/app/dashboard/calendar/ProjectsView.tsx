'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { buildMemberColors, colorForMember, type ColorableMember } from './_colors'

// Project Central — the Projects tab. Jeff's rule: any job/booking spanning
// more than a day IS a project. Two real primitives already exist for that —
// we surface both instead of building a third:
//
//   1. Production jobs (`jobs` table, /api/jobs) — the rich project record:
//      status, contracted/collected/due money, scheduled sessions, payment
//      plan, timeline, and (via commit 38423006) job-site photos. This is
//      the primary view here; each card links straight into the existing
//      /dashboard/jobs/[id] detail page rather than re-building that surface.
//   2. Long-duration bookings with no job_id yet (`duration_class` multiday
//      or project, derived server-side in /api/bookings) — a booking that
//      spans days but was never promoted into a full Job. Shown as a
//      lighter-weight span list/timeline so nothing multi-day is invisible,
//      with the existing quick-create form for ad-hoc long spans.
//
// "Budget vs actual hours" was requested if the quote-line-item work supports
// it — it doesn't (quote line items are qty × unit price, no hours field), so
// this uses the money the Jobs system already tracks (contracted vs
// collected) as the real progress signal instead of fabricating an hours
// metric that doesn't exist.

interface JobRow {
  id: string
  title: string
  status: string
  client_name: string | null
  created_at: string
  starts_on: string | null
  ends_on: string | null
  sessions_total: number
  sessions_done: number
  contracted: number
  paid: number
  due: number
  overdue: number
}
interface JobTotals { contracted: number; paid: number; due: number; overdue: number }

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  service_type: string | null
  duration_class?: string | null
  job_id?: string | null
  team_member_id: string | null
  clients: { name: string } | null
  team_members: { name: string } | null
}

const HORIZON_BACK_DAYS = 30
const HORIZON_FWD_DAYS = 180

const JOB_STATUS_STYLE: Record<string, string> = {
  unscheduled: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  scheduled: 'bg-blue-50 text-blue-600',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-slate-100 text-slate-500',
}
const JOB_STATUS_ORDER: Record<string, number> = { in_progress: 0, scheduled: 1, unscheduled: 2, completed: 3, cancelled: 4 }

function money(c: number): string {
  return ((c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function toDay(iso: string): number {
  const [d] = iso.split('T')
  const [y, mo, dd] = d.split('-').map(Number)
  return Math.floor(Date.UTC(y, mo - 1, dd) / 86_400_000)
}
function fmt(iso: string | null): string {
  if (!iso) return '—'
  const [d] = iso.split('T')
  const [y, mo, dd] = d.split('-').map(Number)
  return new Date(y, mo - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${tone || 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function ProgressBar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

function JobCard({ job }: { job: JobRow }) {
  const hasSessions = job.sessions_total > 0
  const sessionPct = hasSessions ? Math.round((job.sessions_done / job.sessions_total) * 100) : null
  const moneyPct = job.contracted > 0 ? Math.round((job.paid / job.contracted) * 100) : null
  const pct = sessionPct ?? moneyPct
  return (
    <Link
      href={`/dashboard/jobs/${job.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-teal-300 hover:bg-teal-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{job.title}</p>
          {job.client_name && <p className="truncate text-xs text-slate-500">{job.client_name}</p>}
        </div>
        <span className={`flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${JOB_STATUS_STYLE[job.status] || 'bg-slate-100 text-slate-500'}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500">{fmt(job.starts_on)} – {fmt(job.ends_on)}</p>

      {pct != null && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>{hasSessions ? `${job.sessions_done} of ${job.sessions_total} sessions` : 'Collected'}</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <ProgressBar pct={pct} tone={job.status === 'completed' ? 'bg-slate-400' : 'bg-teal-500'} />
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-3 text-[11px]">
        <span className="text-slate-600">{money(job.contracted)} contracted</span>
        <span className="text-green-600">{money(job.paid)} collected</span>
        {job.overdue > 0 && <span className="font-medium text-red-600">{money(job.overdue)} overdue</span>}
      </div>
    </Link>
  )
}

export default function ProjectsView() {
  // Production jobs — the rich project record.
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [jobTotals, setJobTotals] = useState<JobTotals>({ contracted: 0, paid: 0, due: 0, overdue: 0 })
  const [jobsLoading, setJobsLoading] = useState(true)

  // Long-duration bookings not (yet) tracked as a Job.
  const [bookings, setBookings] = useState<Booking[]>([])
  const [spansLoading, setSpansLoading] = useState(true)
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

  const loadJobs = useCallback(async () => {
    const res = await fetch('/api/jobs')
    if (res.ok) {
      const data = await res.json()
      setJobs(data.jobs || [])
      setJobTotals(data.totals || { contracted: 0, paid: 0, due: 0, overdue: 0 })
    }
    setJobsLoading(false)
  }, [])

  const loadSpans = useCallback(async () => {
    const now = new Date()
    const from = new Date(now); from.setDate(from.getDate() - HORIZON_BACK_DAYS)
    const to = new Date(now); to.setDate(to.getDate() + HORIZON_FWD_DAYS)
    const ymd = (d: Date) => d.toISOString().split('T')[0]
    const res = await fetch(`/api/bookings?from=${ymd(from)}&to=${ymd(to)}`)
    if (res.ok) {
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : data.bookings || [])
    }
    setSpansLoading(false)
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])
  useEffect(() => { loadSpans() }, [loadSpans])

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (JOB_STATUS_ORDER[a.status] ?? 9) - (JOB_STATUS_ORDER[b.status] ?? 9) || (a.starts_on || '').localeCompare(b.starts_on || '')),
    [jobs],
  )
  const activeJobCount = jobs.filter((j) => j.status === 'in_progress' || j.status === 'scheduled' || j.status === 'unscheduled').length
  const completedJobCount = jobs.filter((j) => j.status === 'completed').length

  const { spans, startDay, totalDays, months } = useMemo(() => {
    const now = new Date()
    const from = new Date(now); from.setDate(from.getDate() - HORIZON_BACK_DAYS)
    const to = new Date(now); to.setDate(to.getDate() + HORIZON_FWD_DAYS)
    const s = Math.floor(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()) / 86_400_000)
    const e = Math.floor(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) / 86_400_000)
    const total = Math.max(1, e - s)

    // A span still tracked only as a booking — no job_id yet. Once promoted
    // to a Job (job_id set) it moves up into the Production jobs list above
    // instead of showing twice.
    const jobsList = bookings
      .filter((b) => (b.duration_class === 'project' || b.duration_class === 'multiday') && !b.job_id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    const ticks: { label: string; left: number }[] = []
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cursor <= to) {
      const day = Math.floor(Date.UTC(cursor.getFullYear(), cursor.getMonth(), 1) / 86_400_000)
      if (day >= s) ticks.push({ label: cursor.toLocaleDateString('en-US', { month: 'short' }), left: ((day - s) / total) * 100 })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return { spans: jobsList, startDay: s, totalDays: total, months: ticks }
  }, [bookings])

  async function createSpan(e: FormEvent) {
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
      loadSpans()
    } else {
      const d = await res.json().catch(() => ({}))
      setErr(d.error || 'Could not create span')
    }
  }

  const loading = jobsLoading && spansLoading

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="py-16 text-center text-sm text-slate-400">Loading projects…</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Active projects" value={String(activeJobCount)} />
            <Stat label="Completed" value={String(completedJobCount)} />
            <Stat label="Contracted" value={money(jobTotals.contracted)} />
            <Stat label="Collected" value={money(jobTotals.paid)} tone="text-green-600" />
          </div>

          {/* Production jobs — the real project-management list */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Production jobs</h2>
            {sortedJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-slate-700">No Production jobs yet</p>
                <p className="mt-1 text-xs text-slate-500">Convert an accepted quote into a job, or promote a long span below.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {sortedJobs.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            )}
          </div>

          {/* Spans not yet tracked as a Job */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Long spans (not yet a Job)</h2>
                <p className="text-xs text-slate-500">Any booking over 1 day — Production for tenants that haven&apos;t set up a full job/payment plan yet.</p>
              </div>
              <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
                {showForm ? 'Cancel' : '+ New Span'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={createSpan} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm lg:col-span-2" />
                <input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} placeholder="Service (optional)" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:col-span-2 lg:col-span-5">
                  {saving ? 'Creating…' : 'Create span'}
                </button>
                {err && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-5">{err}</p>}
              </form>
            )}

            {spans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-slate-700">No untracked spans</p>
                <p className="mt-1 text-xs text-slate-500">Every multi-day booking is either a Production job above, or none exist yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative mb-2 h-4 border-b border-slate-200">
                  {months.map((m, i) => (
                    <span key={i} className="absolute -top-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400" style={{ left: `${m.left}%` }}>{m.label}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  {spans.map((b) => {
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
        </>
      )}
    </div>
  )
}
