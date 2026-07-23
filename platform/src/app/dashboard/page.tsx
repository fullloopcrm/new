import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import ScheduleIssues from './_components/ScheduleIssues'
import JobsMap, { type MapJob } from './_components/JobsMap'
import ClickableStatGrid from './_components/ClickableStatGrid'
import type { BreakdownGroup, BreakdownRow, StatCell } from './_components/stat-breakdown-types'

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

type Booking = {
  id: string
  start_time: string
  price: number | null
  status: string
  payment_status: string | null
  service_type: string | null
  schedule_id: string | null
  team_member_id: string | null
  clients: { name: string | null; phone: string | null; address: string | null } | null
  team_members: { name: string | null } | null
  booking_team_members: { is_lead: boolean; position: number; team_members: { name: string | null } | null }[] | null
}

// Multi-person bookings: prefer the full booking_team_members roster (lead +
// extras) over the single team_member_id FK, which only ever reflects the lead.
function assignedTeamNames(j: Booking): string[] {
  if (j.booking_team_members && j.booking_team_members.length > 0) {
    return j.booking_team_members
      .slice()
      .sort((a, b) => (a.is_lead === b.is_lead ? a.position - b.position : a.is_lead ? -1 : 1))
      .map(m => m.team_members?.name)
      .filter((n): n is string => Boolean(n))
  }
  return j.team_members?.name ? [j.team_members.name] : []
}
function assignedTeamLabel(j: Booking): string {
  const names = assignedTeamNames(j)
  return names.length > 0 ? names.join(', ') : 'Unassigned'
}

// Paginated fetch — FL caps PostgREST at 1000 rows/req; the year has ~1.8k bookings.
async function fetchYearBookings(tenantId: string, startISO: string, endISO: string): Promise<Booking[]> {
  const out: Booking[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id,start_time,price,status,payment_status,service_type,schedule_id,team_member_id,clients(name,phone,address),team_members!bookings_team_member_id_fkey(name),booking_team_members(is_lead,position,team_members(name))')
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

type LeadVisit = { created_at: string; referrer: string | null; page: string | null }

function bookingRows(jobs: Booking[]): BreakdownRow[] {
  return jobs.slice().sort((a, b) => b.start_time.localeCompare(a.start_time)).map(j => ({
    id: j.id,
    primary: j.clients?.name || 'No client',
    secondary: `${j.service_type || 'Job'} · ${assignedTeamLabel(j)}`,
    amountCents: j.price || 0,
    date: j.start_time,
    status: j.status,
  }))
}

function leadRows(leads: LeadVisit[]): BreakdownRow[] {
  return leads.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(l => ({
    id: l.created_at + '|' + (l.page || ''),
    primary: l.page || 'Unknown page',
    secondary: l.referrer ? `via ${l.referrer}` : 'Direct / organic',
    date: l.created_at,
  }))
}

type QuoteStat = { id: string; status: string; created_at: string; accepted_at: string | null; quote_number: string | null; total_cents: number | null; clients: { name: string | null } | null }

function quoteRows(quotes: QuoteStat[]): BreakdownRow[] {
  return quotes.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(q => ({
    id: q.id,
    primary: q.clients?.name || q.quote_number || 'Proposal',
    secondary: q.quote_number || undefined,
    amountCents: q.total_cents || 0,
    date: q.created_at,
    status: q.status,
  }))
}

function clientRows(clients: { id: string; name: string; created_at: string }[]): BreakdownRow[] {
  return clients.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(c => ({
    id: c.id,
    primary: c.name,
    date: c.created_at,
  }))
}

async function fetchLeadVisits(tenantId: string): Promise<LeadVisit[]> {
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
  const leadVisits: LeadVisit[] = []
  for (const e of (data || []) as { session_id: string | null; referrer: string | null; page: string | null; created_at: string }[]) {
    if (!isCleanVisit(e.referrer) || !isLeadPage(e.page)) continue
    const sid = e.session_id || e.created_at
    if (seenSessions.has(sid)) continue
    seenSessions.add(sid)
    leadVisits.push({ created_at: e.created_at, referrer: e.referrer, page: e.page })
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
    supabaseAdmin.from('clients').select('id,name,created_at').eq('tenant_id', tenant.id).gte('created_at', startOfMonth.toISOString()).order('created_at', { ascending: false }).limit(1000),
    fetchLeadVisits(tenant.id),
    supabaseAdmin.from('quotes').select('id,status,created_at,accepted_at,quote_number,total_cents,clients(name)').eq('tenant_id', tenant.id).in('status', [...PENDING_QUOTE_STATUSES, 'accepted']).limit(2000),
  ])
  const roster = rosterRes.count || 0
  const newClientsThisMonth = (newClientsRes.data || []) as { id: string; name: string; created_at: string }[]
  const newThisMonth = newClientsThisMonth.length
  const quotesForStats = (quotesRes.data || []) as unknown as QuoteStat[]

  // Map jobs — this month, with client address for geocoding.
  const { data: mapRows } = await supabaseAdmin
    .from('bookings')
    .select('id,start_time,status,service_type,team_member_id,clients(name,address),team_members!bookings_team_member_id_fkey(name),booking_team_members(is_lead,position,team_members(name))')
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

  const revenueLadder: StatCell[] = [
    { key: 'rev-today', label: 'Today', value: formatMoney(sum(collectedToday)), sub: `${collectedToday.length} jobs`, emphasize: false },
    { key: 'rev-week', label: 'Week', value: formatMoney(sum(collectedWeek)), sub: `${collectedWeek.length} jobs`, emphasize: false },
    { key: 'rev-month', label: monthShort, value: formatMoney(sum(collectedMonth)), sub: `${collectedMonth.length} jobs`, emphasize: false },
    { key: 'rev-year-actual', label: `${yearStr} · Actual`, value: formatMoney(sum(collectedYear)), sub: `${collectedYear.length} jobs`, emphasize: true },
    { key: 'rev-year-projected', label: `${yearStr} · Projected`, value: formatMoney(projectedRevenue), sub: `${all2026.length} jobs`, emphasize: true },
  ]
  const volumeLadder: StatCell[] = [
    { key: 'jobs-week', label: 'Jobs · Week', value: String(scheduledWeek.length), sub: formatMoney(sum(scheduledWeek)) },
    { key: 'jobs-month', label: `Jobs · ${monthShort}`, value: String(scheduledMonth.length), sub: formatMoney(sum(scheduledMonth)) },
    { key: 'jobs-ytd', label: 'Jobs · YTD', value: String(all2026.length), sub: formatMoney(scheduled2026Total) },
    { key: 'jobs-remaining', label: 'Remaining', value: String(remaining.length), sub: formatMoney(sum(remaining)) },
  ]

  const leadsWeek = leads.filter(l => inDateRange(l.created_at, startOfWeek, endOfWeek))
  const leadsToday = leads.filter(l => inDateRange(l.created_at, startOfDay, endOfDay))
  const leadsLadder: StatCell[] = [
    { key: 'leads-total', label: 'Total Leads', value: String(leads.length) },
    { key: 'leads-week', label: 'Leads · Week', value: String(leadsWeek.length) },
    { key: 'leads-today', label: 'Leads · Today', value: String(leadsToday.length) },
  ]

  const pendingQuotes = quotesForStats.filter(q => PENDING_QUOTE_STATUSES.includes(q.status))
  const approvedQuotes = quotesForStats.filter(q => q.status === 'accepted')
  const propPendingDay = pendingQuotes.filter(q => inDateRange(q.created_at, startOfDay, endOfDay))
  const propPendingWeek = pendingQuotes.filter(q => inDateRange(q.created_at, startOfWeek, endOfWeek))
  const propPendingMonth = pendingQuotes.filter(q => inDateRange(q.created_at, startOfMonth, endOfMonth))
  const propApprovedDay = approvedQuotes.filter(q => q.accepted_at && inDateRange(q.accepted_at, startOfDay, endOfDay))
  const propApprovedWeek = approvedQuotes.filter(q => q.accepted_at && inDateRange(q.accepted_at, startOfWeek, endOfWeek))
  const propApprovedMonth = approvedQuotes.filter(q => q.accepted_at && inDateRange(q.accepted_at, startOfMonth, endOfMonth))
  const proposalsLadder: StatCell[] = [
    { key: 'prop-pending-day', label: 'Pending · Day', value: String(propPendingDay.length) },
    { key: 'prop-pending-week', label: 'Pending · Week', value: String(propPendingWeek.length) },
    { key: 'prop-pending-month', label: 'Pending · Month', value: String(propPendingMonth.length) },
    { key: 'prop-approved-day', label: 'Approved · Day', value: String(propApprovedDay.length) },
    { key: 'prop-approved-week', label: 'Approved · Week', value: String(propApprovedWeek.length) },
    { key: 'prop-approved-month', label: 'Approved · Month', value: String(propApprovedMonth.length) },
  ]
  const monthsByYearData = Array.from({ length: 12 }, (_, monthIdx) => {
    const mStart = new Date(now.getFullYear(), monthIdx, 1)
    const mEnd = new Date(now.getFullYear(), monthIdx + 1, 0, 23, 59, 59)
    const jobs = allJobs.filter(j => SCHEDULED(j) && inRange(j, mStart, mEnd))
    return {
      key: `month-${monthIdx}`,
      label: mStart.toLocaleDateString('en-US', { month: 'short' }),
      jobs, count: jobs.length, revenue: sum(jobs),
      isCurrent: monthIdx === now.getMonth(), isFuture: monthIdx > now.getMonth(),
    }
  })
  const monthsByYear: StatCell[] = monthsByYearData.map(m => ({
    key: m.key, label: m.label, value: String(m.count), sub: m.revenue > 0 ? formatMoney(m.revenue) : '—',
    emphasize: m.isCurrent, bg: m.isCurrent ? '#FBFBF6' : (m.isFuture ? 'transparent' : V.canvas),
    valueColor: m.count === 0 ? V.muted2 : undefined,
  }))
  const kpis: StatCell[] = [
    { key: 'kpi-ar', label: 'AR Outstanding', value: formatMoney(sum(toCollect)), sub: `${toCollect.length} jobs · ${formatMoney(ar30)} 0-30 · ${formatMoney(ar60)} 31-60 · ${formatMoney(ar90)} 60+` },
    { key: 'kpi-newclients', label: `New Clients · ${monthShort}`, value: String(newThisMonth), sub: `Roster ${roster}` },
    { key: 'kpi-recurring', label: 'Recurring %', value: `${recurringPct}%`, sub: `${recurringJobs.length} of ${all2026.length} jobs` },
    { key: 'kpi-avgjob', label: 'Avg Job Value', value: formatMoney(avgJobValue), sub: `${collectedMonth.length} paid · ${monthShort}` },
  ]

  const breakdowns: Record<string, BreakdownGroup> = {
    'rev-today': { title: 'Revenue · Today', rows: bookingRows(collectedToday) },
    'rev-week': { title: 'Revenue · Week', rows: bookingRows(collectedWeek) },
    'rev-month': { title: `Revenue · ${monthShort}`, rows: bookingRows(collectedMonth) },
    'rev-year-actual': { title: `Revenue · ${yearStr} Actual`, rows: bookingRows(collectedYear) },
    'rev-year-projected': { title: `Revenue · ${yearStr} Projected`, rows: bookingRows(all2026), emptyLabel: tenant.id === NYCMAID_TENANT_ID ? 'Includes a fixed January pre-migration adjustment not tied to a booking record.' : undefined },
    'jobs-week': { title: 'Jobs · Week', rows: bookingRows(scheduledWeek) },
    'jobs-month': { title: `Jobs · ${monthShort}`, rows: bookingRows(scheduledMonth) },
    'jobs-ytd': { title: 'Jobs · YTD', rows: bookingRows(all2026) },
    'jobs-remaining': { title: 'Jobs · Remaining This Year', rows: bookingRows(remaining) },
    'leads-total': { title: 'Total Leads', rows: leadRows(leads) },
    'leads-week': { title: 'Leads · Week', rows: leadRows(leadsWeek) },
    'leads-today': { title: 'Leads · Today', rows: leadRows(leadsToday) },
    'prop-pending-day': { title: 'Proposals Pending · Day', rows: quoteRows(propPendingDay) },
    'prop-pending-week': { title: 'Proposals Pending · Week', rows: quoteRows(propPendingWeek) },
    'prop-pending-month': { title: 'Proposals Pending · Month', rows: quoteRows(propPendingMonth) },
    'prop-approved-day': { title: 'Proposals Approved · Day', rows: quoteRows(propApprovedDay) },
    'prop-approved-week': { title: 'Proposals Approved · Week', rows: quoteRows(propApprovedWeek) },
    'prop-approved-month': { title: 'Proposals Approved · Month', rows: quoteRows(propApprovedMonth) },
    'kpi-ar': { title: 'AR Outstanding', rows: bookingRows(toCollect) },
    'kpi-newclients': { title: `New Clients · ${monthShort}`, rows: clientRows(newClientsThisMonth) },
    'kpi-recurring': { title: 'Recurring Jobs', rows: bookingRows(recurringJobs) },
    'kpi-avgjob': { title: `Paid Jobs · ${monthShort}`, rows: bookingRows(collectedMonth) },
    ...Object.fromEntries(monthsByYearData.map(m => [m.key, { title: `Jobs · ${m.label} ${yearStr}`, rows: bookingRows(m.jobs) }])),
  }

  const todayJobs = allJobs.filter(j => SCHEDULED(j) && inRange(j, startOfDay, endOfDay)).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const tomorrowStart = new Date(startOfDay.getTime() + 86400000)
  const tomorrowEnd = new Date(startOfDay.getTime() + 2 * 86400000)
  const tomorrowJobs = allJobs.filter(j => { const d = new Date(j.start_time); return SCHEDULED(j) && d >= tomorrowStart && d < tomorrowEnd }).sort((a, b) => a.start_time.localeCompare(b.start_time))

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>
      {children}
    </div>
  )

  // This month's job count + revenue — the one stat block mobile keeps
  // (see mobile-only section below). Clickable, same breakdown keys as the
  // desktop Jobs/Revenue ladders.
  const monthSummaryCells: StatCell[] = [
    { key: 'jobs-month', label: `Jobs · ${monthShort}`, value: String(scheduledMonth.length), sub: formatMoney(sum(scheduledMonth)) },
    { key: 'rev-month', label: `Revenue · ${monthShort}`, value: formatMoney(sum(collectedMonth)), sub: `${collectedMonth.length} jobs` },
  ]

  const todayTomorrowBlock = (
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
                  <p className="text-sm truncate" style={{ color: V.muted }}>{job.service_type || 'Job'} · {assignedTeamLabel(job)}</p>
                  {(job.clients?.address || job.clients?.phone) && (
                    <p className="text-xs truncate" style={{ color: V.muted2, fontFamily: V.mono, fontSize: '10.5px' }}>
                      {[job.clients?.address, job.clients?.phone].filter(Boolean).join(' · ')}
                    </p>
                  )}
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
  )

  return (
    <>
      {/* MOBILE — today/tomorrow schedule + this month's job count/revenue only.
          No schedule-issues banner, no ladders/KPIs, no map. */}
      <div className="md:hidden">
        <Bar>{`This Month`}</Bar>
        <ClickableStatGrid cells={monthSummaryCells} columns={2} breakdowns={breakdowns} valueFontSize="24px" />
        {todayTomorrowBlock}
      </div>

      {/* DESKTOP / TABLET — full Loop */}
      <div className="hidden md:block">
        {/* SCHEDULE ISSUES — Fix-now triage (client; tenant-scoped API) */}
        <ScheduleIssues />

        {/* REVENUE LADDER */}
        <Bar>Revenue</Bar>
        <ClickableStatGrid cells={revenueLadder} columns={5} breakdowns={breakdowns} valueFontSize="26px" emphasizeFontSize="32px" />

        {/* SALES — leads + proposals */}
        <Bar>Sales</Bar>
        <ClickableStatGrid cells={leadsLadder} columns={3} breakdowns={breakdowns} valueFontSize="26px" className="mb-4" />
        <ClickableStatGrid cells={proposalsLadder} columns={6} breakdowns={breakdowns} valueFontSize="24px" />

        {/* JOBS LADDER */}
        <Bar>Jobs</Bar>
        <ClickableStatGrid cells={volumeLadder} columns={4} breakdowns={breakdowns} valueFontSize="28px" />

        {/* JOBS BY MONTH */}
        <Bar>{`Jobs · ${yearStr} by Month`}</Bar>
        <ClickableStatGrid cells={monthsByYear} columns={12} breakdowns={breakdowns} valueFontSize="22px" padding="px-3 py-4" />

        {/* KPIs */}
        <Bar>KPIs</Bar>
        <ClickableStatGrid cells={kpis} columns={4} breakdowns={breakdowns} valueFontSize="24px" />

        {/* TODAY / TOMORROW */}
        {todayTomorrowBlock}

        {/* JOBS MAP — this month, geocoded */}
        <JobsMap jobs={mapJobs} />
      </div>
    </>
  )
}
