import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import ScheduleIssues from './_components/ScheduleIssues'
import JobsMap, { type MapJob } from './_components/JobsMap'
import ClickableStatGrid, { type ClickableStatTile } from './_components/ClickableStatGrid'
import type { BreakdownItem } from './_components/BreakdownModal'

// The Loop — global tenant dashboard, ported to match nycmaid's V1 Loop.
// Server-rendered, tenant-scoped. bookings.price is stored in CENTS.
// Sections: Revenue ladder, Jobs ladder, Jobs-by-month, KPIs, Today/Tomorrow.
// (Schedule-Issues triage + live Map land in a follow-on increment.)
export const dynamic = 'force-dynamic'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', muted2: 'var(--color-loop-muted-2)',
  good: 'var(--color-loop-good)', warn: 'var(--color-loop-warn)',
  display: 'var(--display)', mono: 'var(--mono)',
}

const formatMoney = (cents: number) =>
  '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

type Booking = {
  id: string
  start_time: string
  price: number | null
  status: string
  payment_status: string | null
  service_type: string | null
  schedule_id: string | null
  team_member_id: string | null
  clients: { name: string | null; address: string | null } | null
  team_members: { name: string | null } | null
}

// Paginated fetch — FL caps PostgREST at 1000 rows/req; the year has ~1.8k bookings.
async function fetchYearBookings(tenantId: string, startISO: string, endISO: string): Promise<Booking[]> {
  const out: Booking[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id,start_time,price,status,payment_status,service_type,schedule_id,team_member_id,clients(name,address),team_members!bookings_team_member_id_fkey(name)')
      .eq('tenant_id', tenantId)
      .gte('start_time', startISO)
      .lte('start_time', endISO)
      .order('start_time', { ascending: true })
      .range(from, from + page - 1)
    if (error || !data || data.length === 0) break
    out.push(...(data as unknown as Booking[]))
    if (data.length < page) break
  }
  return out
}

const COLLECTED = (j: Booking) => j.status === 'completed' && j.payment_status === 'paid'
const SCHEDULED = (j: Booking) => ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress'].includes(j.status)
const sum = (jobs: Booking[]) => jobs.reduce((s, j) => s + (j.price || 0), 0)
const inRange = (j: Booking, a: Date, b: Date) => { const d = new Date(j.start_time); return d >= a && d <= b }

// Feeds the click-through "how was this number calculated" breakdown modal.
function bookingToItem(j: Booking): BreakdownItem {
  return {
    id: j.id,
    title: j.clients?.name || 'No client',
    subtitle: `${j.service_type || 'Job'} · ${j.team_members?.name || 'Unassigned'}`,
    meta: j.clients?.address || undefined,
    amountCents: j.price || 0,
    date: formatDate(j.start_time),
    status: j.payment_status === 'paid' ? 'paid' : j.status,
    statusTone: j.payment_status === 'paid' ? 'good' : j.status === 'completed' ? 'warn' : 'muted',
    href: `/dashboard/bookings?edit=${j.id}`,
  }
}

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  const monthShort = now.toLocaleDateString('en-US', { month: 'short' })
  const yearStr = String(now.getFullYear())

  const [allJobs, rosterRes, newClientsRes] = await Promise.all([
    fetchYearBookings(tenant.id, startOfYear.toISOString(), endOfYear.toISOString()),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('created_at', startOfMonth.toISOString()),
  ])
  const roster = rosterRes.count || 0
  const newThisMonth = newClientsRes.count || 0

  // Map jobs — this month, with client address for geocoding. allJobs
  // already covers the full year (including this month) with the same
  // clients/team_members join, so this month's slice is derived in memory
  // instead of firing a second, largely-duplicate DB round trip.
  const mapJobs = allJobs
    .filter(j => inRange(j, startOfMonth, endOfMonth))
    .map((j) => ({
      id: j.id, start_time: j.start_time, status: j.status, service_type: j.service_type,
      cleaner_id: j.team_member_id,
      clients: j.clients,
      team_members: j.team_members,
    })) as MapJob[]

  const collected = (a: Date, b: Date) => allJobs.filter(j => COLLECTED(j) && inRange(j, a, b))
  const scheduled = (a: Date, b: Date) => allJobs.filter(j => SCHEDULED(j) && inRange(j, a, b))
  const collectedToday = collected(startOfDay, endOfDay)
  const collectedWeek = collected(startOfWeek, endOfWeek)
  const collectedMonth = collected(startOfMonth, endOfMonth)
  const collectedYear = collected(startOfYear, endOfYear)

  const all2026 = allJobs.filter(j => ['completed', 'scheduled', 'confirmed', 'in_progress'].includes(j.status))
  const scheduled2026Total = sum(all2026)
  const scheduledWeek = scheduled(startOfWeek, endOfWeek)
  const scheduledMonth = scheduled(startOfMonth, endOfMonth)

  // Remaining (booked, future months through year-end)
  const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const remaining = allJobs.filter(j => ['scheduled', 'confirmed'].includes(j.status) && inRange(j, startNextMonth, endOfYear))

  // AR aging on completed-but-unpaid
  const toCollect = allJobs.filter(j => j.status === 'completed' && j.payment_status === 'pending')
  const ageDays = (j: Booking) => Math.floor((now.getTime() - new Date(j.start_time).getTime()) / 86400000)
  const ar30 = sum(toCollect.filter(j => ageDays(j) <= 30))
  const ar60 = sum(toCollect.filter(j => { const a = ageDays(j); return a > 30 && a <= 60 }))
  const ar90 = sum(toCollect.filter(j => ageDays(j) > 60))

  const recurringJobs = all2026.filter(j => j.schedule_id != null)
  const recurringPct = scheduled2026Total > 0 ? Math.round((sum(recurringJobs) / scheduled2026Total) * 100) : 0
  const avgJobValue = collectedMonth.length > 0 ? Math.round(sum(collectedMonth) / collectedMonth.length) : 0

  const revenueLadder: ClickableStatTile[] = [
    { key: 'today', label: 'Today', value: formatMoney(sum(collectedToday)), sub: `${collectedToday.length} jobs`, modalTitle: 'Today · Collected', items: collectedToday.map(bookingToItem) },
    { key: 'week', label: 'Week', value: formatMoney(sum(collectedWeek)), sub: `${collectedWeek.length} jobs`, modalTitle: 'This Week · Collected', items: collectedWeek.map(bookingToItem) },
    { key: 'month', label: monthShort, value: formatMoney(sum(collectedMonth)), sub: `${collectedMonth.length} jobs`, modalTitle: 'This Month · Collected', items: collectedMonth.map(bookingToItem) },
    { key: 'year', label: `${yearStr} · Actual`, value: formatMoney(sum(collectedYear)), sub: `${collectedYear.length} jobs`, background: '#FBFBF6', valueFontSize: 32, modalTitle: `${yearStr} · Collected YTD`, items: collectedYear.map(bookingToItem) },
    { key: 'projected', label: `${yearStr} · Projected`, value: formatMoney(scheduled2026Total), sub: `${all2026.length} jobs`, background: '#FBFBF6', valueFontSize: 32, modalTitle: `${yearStr} · Projected (booked)`, items: all2026.map(bookingToItem) },
  ]
  const volumeLadder: ClickableStatTile[] = [
    { key: 'week', label: 'Jobs · Week', value: String(scheduledWeek.length), sub: formatMoney(sum(scheduledWeek)), modalTitle: 'This Week · Jobs', items: scheduledWeek.map(bookingToItem) },
    { key: 'month', label: `Jobs · ${monthShort}`, value: String(scheduledMonth.length), sub: formatMoney(sum(scheduledMonth)), modalTitle: 'This Month · Jobs', items: scheduledMonth.map(bookingToItem) },
    { key: 'ytd', label: 'Jobs · YTD', value: String(all2026.length), sub: formatMoney(scheduled2026Total), modalTitle: `${yearStr} · All Jobs YTD`, items: all2026.map(bookingToItem) },
    { key: 'remaining', label: 'Remaining', value: String(remaining.length), sub: formatMoney(sum(remaining)), modalTitle: `${yearStr} · Booked through year-end`, items: remaining.map(bookingToItem) },
  ]
  const monthsByYear: ClickableStatTile[] = Array.from({ length: 12 }, (_, monthIdx) => {
    const mStart = new Date(now.getFullYear(), monthIdx, 1)
    const mEnd = new Date(now.getFullYear(), monthIdx + 1, 0, 23, 59, 59)
    const jobs = allJobs.filter(j => ['completed', 'scheduled', 'confirmed', 'in_progress'].includes(j.status) && inRange(j, mStart, mEnd))
    const isCurrent = monthIdx === now.getMonth()
    const isFuture = monthIdx > now.getMonth()
    const label = mStart.toLocaleDateString('en-US', { month: 'short' })
    return {
      key: label,
      label,
      labelColor: isCurrent ? V.ink : undefined,
      value: String(jobs.length),
      valueColor: jobs.length === 0 ? V.muted2 : undefined,
      sub: jobs.length > 0 ? formatMoney(sum(jobs)) : '—',
      background: isCurrent ? '#FBFBF6' : (isFuture ? 'transparent' : undefined),
      modalTitle: `${label} ${yearStr} · Jobs`,
      items: jobs.map(bookingToItem),
    }
  })
  const kpis = [
    { label: 'AR Outstanding', val: formatMoney(sum(toCollect)), sub: `${toCollect.length} jobs · ${formatMoney(ar30)} 0-30 · ${formatMoney(ar60)} 31-60 · ${formatMoney(ar90)} 60+` },
    { label: `New Clients · ${monthShort}`, val: String(newThisMonth), sub: `Roster ${roster}` },
    { label: 'Recurring %', val: `${recurringPct}%`, sub: `${recurringJobs.length} of ${all2026.length} jobs` },
    { label: 'Avg Job Value', val: formatMoney(avgJobValue), sub: `${collectedMonth.length} paid · ${monthShort}` },
  ]

  const todayJobs = allJobs.filter(j => inRange(j, startOfDay, endOfDay)).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const tomorrowStart = new Date(startOfDay.getTime() + 86400000)
  const tomorrowEnd = new Date(startOfDay.getTime() + 2 * 86400000)
  const tomorrowJobs = allJobs.filter(j => { const d = new Date(j.start_time); return d >= tomorrowStart && d < tomorrowEnd }).sort((a, b) => a.start_time.localeCompare(b.start_time))

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>
      {children}
    </div>
  )

  return (
    <>
      {/* SCHEDULE ISSUES — Fix-now triage (client; tenant-scoped API) */}
      <ScheduleIssues />

      {/* REVENUE LADDER — click a tile to see the bookings behind the number */}
      <Bar>Revenue</Bar>
      <ClickableStatGrid tiles={revenueLadder} columns={5} tokens={V} valueFontSize={26} />

      {/* JOBS LADDER */}
      <Bar>Jobs</Bar>
      <ClickableStatGrid tiles={volumeLadder} columns={4} tokens={V} valueFontSize={28} />

      {/* JOBS BY MONTH */}
      <Bar>{`Jobs · ${yearStr} by Month`}</Bar>
      <ClickableStatGrid tiles={monthsByYear} columns={12} tokens={V} padding="px-3 py-4" valueFontSize={22} labelLetterSpacing="0.14em" />

      {/* KPIs */}
      <Bar>KPIs</Bar>
      <div className="grid mb-8" style={{ gridTemplateColumns: 'repeat(4, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {kpis.map((k, i, arr) => (
          <div key={k.label} className="px-5 py-4" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '24px', fontWeight: 500, color: V.ink }}>{k.val}</div>
            <div style={{ fontFamily: V.mono, fontSize: '10px', color: V.muted, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* TODAY / TOMORROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[{ label: 'Today · Schedule', jobs: todayJobs, empty: 'No jobs today', showStatus: true },
          { label: 'Tomorrow · Schedule', jobs: tomorrowJobs, empty: 'No jobs tomorrow', showStatus: false }].map(col => (
          <div key={col.label}>
            <Bar>{col.label}</Bar>
            <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
              {col.jobs.length === 0 ? (
                <p className="p-4" style={{ color: V.muted }}>{col.empty}</p>
              ) : col.jobs.map((job, i, arr) => (
                <Link key={job.id} href={`/dashboard/bookings?edit=${job.id}`} className="flex items-start gap-3 p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
                  <span style={{ width: 4, alignSelf: 'stretch', background: V.muted2, borderRadius: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: V.ink }}>{job.clients?.name || 'No client'}</p>
                    <p className="text-sm truncate" style={{ color: V.muted }}>{job.service_type || 'Job'} · {job.team_members?.name || 'Unassigned'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p style={{ fontFamily: V.mono, fontSize: '12px', color: V.ink }}>{formatTime(job.start_time)}</p>
                    {col.showStatus && (
                      <span style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: job.status === 'completed' ? V.good : job.status === 'in_progress' ? V.warn : V.muted }}>
                        {job.status === 'in_progress' ? 'live' : job.status}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* JOBS MAP — this month, geocoded */}
      <JobsMap jobs={mapJobs} />
    </>
  )
}
