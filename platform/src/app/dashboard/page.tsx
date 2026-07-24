import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import ScheduleIssues from './_components/ScheduleIssues'
import JobsMap, { type MapJob } from './_components/JobsMap'

// The Loop — global tenant dashboard, ported to match nycmaid's V1 Loop.
// Server-rendered, tenant-scoped. bookings.price is stored in CENTS.
// Sections: Revenue ladder, Sales (leads + proposals), Jobs ladder, Jobs-by-month, KPIs, Today/Tomorrow.
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

function formatPhoneDisplay(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
  return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
}

// Call/Text/Directions right on the feed row — matches the same chips on the
// bookings list (BookingsAdmin.tsx) so Jeff never has to open a booking just
// to reach the client.
function ContactChips({ phone, address }: { phone?: string | null; address?: string | null }) {
  if (!phone && !address) return null
  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0 mx-1" style={{ fontFamily: V.mono }}>
      {phone && (
        <div className="flex items-center gap-1">
          <a href={`/admin/comhub?dial=${encodeURIComponent(phone)}`} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-medium hover:bg-green-100 whitespace-nowrap">
            {formatPhoneDisplay(phone)}
          </a>
          <a href={`sms:${phone}`} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200 font-medium hover:bg-gray-100">Text</a>
        </div>
      )}
      {address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] hover:text-blue-600 hover:underline truncate max-w-[140px]"
          style={{ color: V.muted }}
          title="Get directions"
        >
          Directions
        </a>
      )}
    </div>
  )
}

type Booking = {
  id: string
  start_time: string
  price: number | null
  status: string
  payment_status: string | null
  service_type: string | null
  schedule_id: string | null
  team_member_id: string | null
  clients: { name: string | null } | null
  team_members: { name: string | null } | null
}

type FeedBooking = {
  id: string
  start_time: string
  status: string
  service_type: string | null
  clients: { name: string | null; phone: string | null; address: string | null } | null
  team_members: { name: string | null } | null
}

// Paginated fetch — FL caps PostgREST at 1000 rows/req; the year has ~1.8k bookings.
async function fetchYearBookings(tenantId: string, startISO: string, endISO: string): Promise<Booking[]> {
  const out: Booking[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id,start_time,price,status,payment_status,service_type,schedule_id,team_member_id,clients(name),team_members!bookings_team_member_id_fkey(name)')
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
const inRange = (j: { start_time: string }, a: Date, b: Date) => { const d = new Date(j.start_time); return d >= a && d <= b }
const inDateRange = (iso: string, a: Date, b: Date) => { const d = new Date(iso); return d >= a && d <= b }

const PENDING_QUOTE_STATUSES = ['sent', 'viewed']

// A "lead" is a real external site visit, not a CRM deal row — ported from nycmaid's
// V1 /api/leads definition (Total Leads / Leads·Week / Leads·Today on its Sales tile).
// Pages that are NOT potential clients — job seekers, team, existing clients, legal, admin.
const NON_LEAD_PREFIXES = [
  '/careers', '/available-nyc-maid-jobs', '/apply',
  '/team', '/admin',
  '/book/collect', '/book/dashboard',
  '/privacy-policy', '/terms-conditions', '/refund-policy',
  '/unsubscribe',
]
const isLeadPage = (page: string | null) => {
  if (!page) return true // no page recorded = assume lead
  const p = page.toLowerCase()
  return !NON_LEAD_PREFIXES.some(prefix => p.startsWith(prefix))
}

async function fetchLeadVisits(tenantId: string): Promise<{ created_at: string }[]> {
  const [domainsRes, blockedRes] = await Promise.all([
    supabaseAdmin.from('tenant_domains').select('domain').eq('tenant_id', tenantId).eq('active', true),
    supabaseAdmin.from('blocked_referrers').select('domain').eq('tenant_id', tenantId),
  ])
  const ownedSet = new Set((domainsRes.data || []).map(d => (d.domain as string).toLowerCase()))
  const blockedSet = new Set((blockedRes.data || []).map(d => (d.domain as string).toLowerCase()))
  const isCleanVisit = (ref: string | null) => {
    if (!ref || ref === 'direct') return false
    const r = ref.toLowerCase()
    for (const d of ownedSet) { if (r.includes(d)) return false }
    for (const d of blockedSet) { if (r.includes(d)) return false }
    return true
  }

  const { data } = await supabaseAdmin
    .from('lead_clicks')
    .select('session_id, referrer, page, created_at')
    .eq('tenant_id', tenantId)
    .eq('action', 'visit')
    .order('created_at', { ascending: false })
    .limit(50000)

  // One session = one lead. feed is newest-first, so first hit per session wins.
  const seenSessions = new Set<string>()
  const leadVisits: { created_at: string }[] = []
  for (const e of (data || []) as { session_id: string | null; referrer: string | null; page: string | null; created_at: string }[]) {
    if (!isCleanVisit(e.referrer) || !isLeadPage(e.page)) continue
    const sid = e.session_id || e.created_at
    if (seenSessions.has(sid)) continue
    seenSessions.add(sid)
    leadVisits.push({ created_at: e.created_at })
  }
  return leadVisits
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

  const [allJobs, rosterRes, newClientsRes, leads, quotesRes] = await Promise.all([
    fetchYearBookings(tenant.id, startOfYear.toISOString(), endOfYear.toISOString()),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('created_at', startOfMonth.toISOString()),
    fetchLeadVisits(tenant.id),
    supabaseAdmin.from('quotes').select('id,status,created_at,accepted_at').eq('tenant_id', tenant.id).in('status', [...PENDING_QUOTE_STATUSES, 'accepted']).limit(2000),
  ])
  const roster = rosterRes.count || 0
  const newThisMonth = newClientsRes.count || 0
  const quotesForStats = (quotesRes.data || []) as { id: string; status: string; created_at: string; accepted_at: string | null }[]

  // Map jobs — this month, with client address for geocoding.
  const { data: mapRows } = await supabaseAdmin
    .from('bookings')
    .select('id,start_time,status,service_type,team_member_id,clients(name,address),team_members!bookings_team_member_id_fkey(name)')
    .eq('tenant_id', tenant.id)
    .gte('start_time', startOfMonth.toISOString())
    .lte('start_time', endOfMonth.toISOString())
    .order('start_time', { ascending: true })
    .limit(1000)
  const mapJobs = (mapRows || []).map((r) => ({
    id: r.id, start_time: r.start_time, status: r.status, service_type: r.service_type,
    cleaner_id: (r as { team_member_id?: string | null }).team_member_id ?? null,
    clients: r.clients as unknown as { name: string; address: string } | null,
    team_members: r.team_members as unknown as { name: string } | null,
  })) as MapJob[]

  const collected = (a: Date, b: Date) => allJobs.filter(j => COLLECTED(j) && inRange(j, a, b))
  const scheduled = (a: Date, b: Date) => allJobs.filter(j => SCHEDULED(j) && inRange(j, a, b))
  const collectedToday = collected(startOfDay, endOfDay)
  const collectedWeek = collected(startOfWeek, endOfWeek)
  const collectedMonth = collected(startOfMonth, endOfMonth)
  const collectedYear = collected(startOfYear, endOfYear)

  const all2026 = allJobs.filter(j => SCHEDULED(j))
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

  // nycmaid's V1 build includes a one-off January-actual adjustment (pre-migration
  // revenue not present in `bookings`) in its Projected total. Not a general formula —
  // gated to that tenant only, same pattern as other nycmaid-specific adjustments.
  const NYCMAID_JANUARY_ACTUAL_CENTS = 600000
  const projectedRevenue = tenant.id === NYCMAID_TENANT_ID
    ? NYCMAID_JANUARY_ACTUAL_CENTS + scheduled2026Total
    : scheduled2026Total

  const revenueLadder = [
    { label: 'Today', val: sum(collectedToday), jobs: collectedToday.length, emphasize: false },
    { label: 'Week', val: sum(collectedWeek), jobs: collectedWeek.length, emphasize: false },
    { label: monthShort, val: sum(collectedMonth), jobs: collectedMonth.length, emphasize: false },
    { label: `${yearStr} · Actual`, val: sum(collectedYear), jobs: collectedYear.length, emphasize: true },
    { label: `${yearStr} · Projected`, val: projectedRevenue, jobs: all2026.length, emphasize: true },
  ]
  const volumeLadder = [
    { label: 'Jobs · Week', val: scheduledWeek.length, sub: formatMoney(sum(scheduledWeek)) },
    { label: `Jobs · ${monthShort}`, val: scheduledMonth.length, sub: formatMoney(sum(scheduledMonth)) },
    { label: 'Jobs · YTD', val: all2026.length, sub: formatMoney(scheduled2026Total) },
    { label: 'Remaining', val: remaining.length, sub: formatMoney(sum(remaining)) },
  ]

  const leadsWeek = leads.filter(l => inDateRange(l.created_at, startOfWeek, endOfWeek)).length
  const leadsToday = leads.filter(l => inDateRange(l.created_at, startOfDay, endOfDay)).length
  const leadsLadder = [
    { label: 'Total Leads', val: leads.length },
    { label: 'Leads · Week', val: leadsWeek },
    { label: 'Leads · Today', val: leadsToday },
  ]

  const pendingQuotes = quotesForStats.filter(q => PENDING_QUOTE_STATUSES.includes(q.status))
  const approvedQuotes = quotesForStats.filter(q => q.status === 'accepted')
  const proposalsLadder = [
    { label: 'Pending · Day', val: pendingQuotes.filter(q => inDateRange(q.created_at, startOfDay, endOfDay)).length },
    { label: 'Pending · Week', val: pendingQuotes.filter(q => inDateRange(q.created_at, startOfWeek, endOfWeek)).length },
    { label: 'Pending · Month', val: pendingQuotes.filter(q => inDateRange(q.created_at, startOfMonth, endOfMonth)).length },
    { label: 'Approved · Day', val: approvedQuotes.filter(q => q.accepted_at && inDateRange(q.accepted_at, startOfDay, endOfDay)).length },
    { label: 'Approved · Week', val: approvedQuotes.filter(q => q.accepted_at && inDateRange(q.accepted_at, startOfWeek, endOfWeek)).length },
    { label: 'Approved · Month', val: approvedQuotes.filter(q => q.accepted_at && inDateRange(q.accepted_at, startOfMonth, endOfMonth)).length },
  ]
  const monthsByYear = Array.from({ length: 12 }, (_, monthIdx) => {
    const mStart = new Date(now.getFullYear(), monthIdx, 1)
    const mEnd = new Date(now.getFullYear(), monthIdx + 1, 0, 23, 59, 59)
    const jobs = allJobs.filter(j => SCHEDULED(j) && inRange(j, mStart, mEnd))
    return {
      label: mStart.toLocaleDateString('en-US', { month: 'short' }),
      count: jobs.length, revenue: sum(jobs),
      isCurrent: monthIdx === now.getMonth(), isFuture: monthIdx > now.getMonth(),
    }
  })
  const kpis = [
    { label: 'AR Outstanding', val: formatMoney(sum(toCollect)), sub: `${toCollect.length} jobs · ${formatMoney(ar30)} 0-30 · ${formatMoney(ar60)} 31-60 · ${formatMoney(ar90)} 60+` },
    { label: `New Clients · ${monthShort}`, val: String(newThisMonth), sub: `Roster ${roster}` },
    { label: 'Recurring %', val: `${recurringPct}%`, sub: `${recurringJobs.length} of ${all2026.length} jobs` },
    { label: 'Avg Job Value', val: formatMoney(avgJobValue), sub: `${collectedMonth.length} paid · ${monthShort}` },
  ]

  // Today/Tomorrow feed rows need phone + address (Call/Text/Directions
  // without opening the booking) — a targeted 2-day query instead of adding
  // those columns to the whole-year fetch above.
  const tomorrowStart = new Date(startOfDay.getTime() + 86400000)
  const tomorrowEnd = new Date(startOfDay.getTime() + 2 * 86400000)
  const { data: feedRows } = await supabaseAdmin
    .from('bookings')
    .select('id,start_time,status,service_type,clients(name,phone,address),team_members!bookings_team_member_id_fkey(name)')
    .eq('tenant_id', tenant.id)
    .gte('start_time', startOfDay.toISOString())
    .lt('start_time', tomorrowEnd.toISOString())
    .in('status', ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress'])
    .order('start_time', { ascending: true })
  const feedJobs = (feedRows || []) as unknown as FeedBooking[]
  const todayJobs = feedJobs.filter(j => inRange(j, startOfDay, endOfDay))
  const tomorrowJobs = feedJobs.filter(j => { const d = new Date(j.start_time); return d >= tomorrowStart && d < tomorrowEnd })

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>
      {children}
    </div>
  )

  return (
    <>
      {/* SCHEDULE ISSUES — Fix-now triage (client; tenant-scoped API) */}
      <ScheduleIssues />

      {/* REVENUE LADDER */}
      <Bar>Revenue</Bar>
      <div className="grid mb-8" style={{ gridTemplateColumns: 'repeat(5, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {revenueLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-4" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none', background: c.emphasize ? '#FBFBF6' : V.canvas }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: c.emphasize ? '32px' : '26px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{formatMoney(c.val)}</div>
            <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 6 }}>{c.jobs} jobs</div>
          </div>
        ))}
      </div>

      {/* SALES — leads + proposals */}
      <Bar>Sales</Bar>
      <div className="grid mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {leadsLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-4" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '26px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
          </div>
        ))}
      </div>
      <div className="grid mb-8" style={{ gridTemplateColumns: 'repeat(6, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {proposalsLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-4" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '24px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* JOBS LADDER */}
      <Bar>Jobs</Bar>
      <div className="grid mb-8" style={{ gridTemplateColumns: 'repeat(4, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {volumeLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-4" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
            <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 6 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* JOBS BY MONTH */}
      <Bar>{`Jobs · ${yearStr} by Month`}</Bar>
      <div className="grid mb-8" style={{ gridTemplateColumns: 'repeat(12, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {monthsByYear.map((m, i, arr) => (
          <div key={m.label} className="px-3 py-4" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none', background: m.isCurrent ? '#FBFBF6' : (m.isFuture ? 'transparent' : V.canvas) }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.14em', color: m.isCurrent ? V.ink : V.muted, fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '22px', fontWeight: 500, color: m.count === 0 ? V.muted2 : V.ink, lineHeight: 1, fontFeatureSettings: '"tnum","lnum"' }}>{m.count}</div>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.muted, marginTop: 4 }}>{m.revenue > 0 ? formatMoney(m.revenue) : '—'}</div>
          </div>
        ))}
      </div>

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
                <div key={job.id} className="flex items-start gap-3 p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
                  <span style={{ width: 4, alignSelf: 'stretch', background: V.muted2, borderRadius: 2, flexShrink: 0 }} />
                  <Link href={`/dashboard/bookings?edit=${job.id}`} className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: V.ink }}>{job.clients?.name || 'No client'}</p>
                    <p className="text-sm truncate" style={{ color: V.muted }}>{job.service_type || 'Job'} · {job.team_members?.name || 'Unassigned'}</p>
                  </Link>
                  <ContactChips phone={job.clients?.phone} address={job.clients?.address} />
                  <Link href={`/dashboard/bookings?edit=${job.id}`} className="text-right flex-shrink-0">
                    <p style={{ fontFamily: V.mono, fontSize: '12px', color: V.ink }}>{formatTime(job.start_time)}</p>
                    {col.showStatus && (
                      <span style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: job.status === 'completed' ? V.good : job.status === 'in_progress' ? V.warn : V.muted }}>
                        {job.status === 'in_progress' ? 'live' : job.status}
                      </span>
                    )}
                  </Link>
                </div>
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
