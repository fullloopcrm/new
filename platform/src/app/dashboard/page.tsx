import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { getArAging } from '@/lib/finance/ar-aging'
import ScheduleIssues from './_components/ScheduleIssues'
import JobsMap, { type MapJob } from './_components/JobsMap'
import { crewNames, type CrewRow } from '@/lib/crew'
import { formatPhone } from '@/lib/format'

// Every query below is wrapped in unstable_cache with a 30s revalidate window.
// This page used to re-run all of them (incl. a full-year booking pagination
// and an unbounded 50k-row lead_clicks scan) from scratch on every single
// load — 30s of staleness is a fine trade for a KPI/ops dashboard.
const CACHE_TTL_SECONDS = 30

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
const formatDuration = (start: string, end: string | null) => {
  if (!end) return null
  const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3600000
  if (!(hrs > 0)) return null
  return `${hrs % 1 === 0 ? hrs : hrs.toFixed(1)}hr`
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
            {formatPhone(phone)}
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
  booking_team_members?: CrewRow[] | null
}

type FeedBooking = {
  id: string
  start_time: string
  end_time: string | null
  status: string
  service_type: string | null
  clients: { name: string | null; phone: string | null; address: string | null } | null
  team_members: { name: string | null } | null
  booking_team_members?: CrewRow[] | null
}

// Paginated fetch — FL caps PostgREST at 1000 rows/req; the year has ~1.8k bookings.
async function fetchYearBookings(tenantId: string, startISO: string, endISO: string): Promise<Booking[]> {
  const out: Booking[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id,start_time,price,status,payment_status,service_type,schedule_id,team_member_id,clients(name),team_members!bookings_team_member_id_fkey(name),booking_team_members(team_member_id,is_lead,position,team_members(id,name))')
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
const fetchYearBookingsCached = unstable_cache(fetchYearBookings, ['dashboard-year-bookings'], { revalidate: CACHE_TTL_SECONDS })

const COLLECTED = (j: Booking) => j.status === 'completed' && j.payment_status === 'paid'
const SCHEDULED = (j: Booking) => ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress'].includes(j.status)
const sum = (jobs: Booking[]) => jobs.reduce((s, j) => s + (j.price || 0), 0)
// bookings.start_time is a NAIVE Eastern wall-clock timestamp with no
// timezone info at all (see buildNaiveTime/shiftNaive in BookingsAdmin.tsx).
// A bare `new Date(...)` parses those digits in the SERVER's own zone (UTC
// on Vercel), which is wrong by the ET/UTC offset. Reinterpreting the same
// digits as if they WERE UTC (append "Z") keeps every naive-to-naive
// comparison in this file internally consistent without needing real DST
// math — it only has to agree with itself, not with true UTC.
const parseNaive = (s: string) => new Date(s.replace(' ', 'T').replace(/(\.\d+)?Z?$/, '') + 'Z')
const inRange = (j: { start_time: string }, a: Date, b: Date) => { const d = parseNaive(j.start_time); return d >= a && d <= b }
// created_at/accepted_at columns (clients, lead_clicks, quotes) ARE real
// timestamptz — a bare `new Date(iso)` is already correct for these.
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
const fetchLeadVisitsCached = unstable_cache(fetchLeadVisits, ['dashboard-lead-visits'], { revalidate: CACHE_TTL_SECONDS })

async function fetchRosterCount(tenantId: string): Promise<number> {
  const { count } = await supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  return count || 0
}
const fetchRosterCountCached = unstable_cache(fetchRosterCount, ['dashboard-roster-count'], { revalidate: CACHE_TTL_SECONDS })

async function fetchNewClientsCount(tenantId: string, sinceISO: string): Promise<number> {
  const { count } = await supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', sinceISO)
  return count || 0
}
const fetchNewClientsCountCached = unstable_cache(fetchNewClientsCount, ['dashboard-new-clients-count'], { revalidate: CACHE_TTL_SECONDS })

type QuoteForStats = { id: string; status: string; created_at: string; accepted_at: string | null }
async function fetchQuotesForStats(tenantId: string): Promise<QuoteForStats[]> {
  const { data } = await supabaseAdmin
    .from('quotes')
    .select('id,status,created_at,accepted_at')
    .eq('tenant_id', tenantId)
    .in('status', [...PENDING_QUOTE_STATUSES, 'accepted'])
    .limit(2000)
  return (data || []) as QuoteForStats[]
}
const fetchQuotesForStatsCached = unstable_cache(fetchQuotesForStats, ['dashboard-quotes'], { revalidate: CACHE_TTL_SECONDS })

// Map jobs — wide enough to cover Today/This week/This month, whichever range
// the map's own filter is set to (see JobsMap.tsx), with client address + any
// already-geocoded coords so the map can skip live geocoding for clients
// we've already resolved (see src/lib/geo-cache.ts).
type MapRow = {
  id: string
  start_time: string
  status: string
  service_type: string | null
  team_member_id: string | null
  clients: { name: string; address: string; latitude: number | null; longitude: number | null } | null
  team_members: { name: string } | null
  booking_team_members: CrewRow[] | null
}
async function fetchMapRows(tenantId: string, startISO: string, endISO: string): Promise<MapRow[]> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id,start_time,status,service_type,team_member_id,clients(name,address,latitude,longitude),team_members!bookings_team_member_id_fkey(name),booking_team_members(team_member_id,is_lead,position,team_members(id,name))')
    .eq('tenant_id', tenantId)
    .gte('start_time', startISO)
    .lte('start_time', endISO)
    .order('start_time', { ascending: true })
    .limit(1000)
  return (data || []) as unknown as MapRow[]
}
const fetchMapRowsCached = unstable_cache(fetchMapRows, ['dashboard-map-rows'], { revalidate: CACHE_TTL_SECONDS })

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  // "Today" per the TENANT's own configured timezone (Settings → Time Zone),
  // not the server process's zone (UTC on Vercel) — without this, every
  // day/week/month cutoff below rolls over 4-5 hours early, e.g. "Today's
  // Jobs" starting to show tomorrow's bookings from ~8pm ET onward.
  const tz = tenant.timezone || 'America/New_York'
  const now = new Date()

  // True UTC instants for a given tenant-local Y-M-D midnight — correct for
  // filtering genuine timestamptz columns (clients/lead_clicks/quotes
  // created_at/accepted_at) via inDateRange() above.
  const zonedMidnight = (ymd: string): Date => {
    const guess = new Date(`${ymd}T00:00:00Z`)
    const asIfInTz = new Date(guess.toLocaleString('en-US', { timeZone: tz }))
    const asIfUTC = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }))
    return new Date(guess.getTime() + (asIfUTC.getTime() - asIfInTz.getTime()))
  }
  // Naive fake-UTC instant for the same Y-M-D — for bookings.start_time,
  // matching how parseNaive() above reads it back.
  const naiveMidnight = (ymd: string): Date => new Date(`${ymd}T00:00:00Z`)
  const addDaysYMD = (ymd: string, days: number): string => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
  }

  const todayYMD = now.toLocaleDateString('en-CA', { timeZone: tz }) // 'YYYY-MM-DD'
  const zonedNow = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const weekStartYMD = addDaysYMD(todayYMD, -zonedNow.getDay())
  const monthStartYMD = `${todayYMD.slice(0, 7)}-01`
  const [tyY, tyM] = todayYMD.slice(0, 7).split('-').map(Number)
  const nextMonthStartYMD = tyM === 12 ? `${tyY + 1}-01-01` : `${tyY}-${String(tyM + 1).padStart(2, '0')}-01`
  const yearStartYMD = `${todayYMD.slice(0, 4)}-01-01`
  const nextYearStartYMD = `${Number(todayYMD.slice(0, 4)) + 1}-01-01`

  // Real instants — for created_at/accepted_at (timestamptz) filtering and
  // for display (monthShort/yearStr).
  const startOfDay = zonedMidnight(todayYMD)
  const endOfDay = zonedMidnight(addDaysYMD(todayYMD, 1))
  const startOfWeek = zonedMidnight(weekStartYMD)
  const endOfWeek = zonedMidnight(addDaysYMD(weekStartYMD, 7))
  const startOfMonth = zonedMidnight(monthStartYMD)
  const endOfMonth = zonedMidnight(nextMonthStartYMD)
  const monthShort = now.toLocaleDateString('en-US', { month: 'short', timeZone: tz })
  const yearStr = todayYMD.slice(0, 4)

  // Naive fake-UTC — for bookings.start_time DB query bounds and for
  // inRange()/parseNaive() comparisons against Booking.start_time.
  const startOfDayNaive = naiveMidnight(todayYMD)
  const endOfDayNaive = naiveMidnight(addDaysYMD(todayYMD, 1))
  const startOfWeekNaive = naiveMidnight(weekStartYMD)
  const endOfWeekNaive = naiveMidnight(addDaysYMD(weekStartYMD, 7))
  const startOfMonthNaive = naiveMidnight(monthStartYMD)
  const endOfMonthNaive = naiveMidnight(nextMonthStartYMD)
  const startOfYearNaive = naiveMidnight(yearStartYMD)
  const endOfYearNaive = naiveMidnight(nextYearStartYMD)

  // Map jobs — wide enough to cover Today/This week/This month, whichever
  // range the map's own filter is set to (see JobsMap.tsx). The week can
  // spill into the previous/next calendar month, so the query spans the
  // union of the week and month windows, not just the month.
  const mapRangeStart = new Date(Math.min(startOfWeekNaive.getTime(), startOfMonthNaive.getTime()))
  const mapRangeEnd = new Date(Math.max(endOfWeekNaive.getTime(), endOfMonthNaive.getTime()))

  const [allJobs, roster, newThisMonth, leads, quotesForStats, mapRows, ytdPnl, arAging] = await Promise.all([
    fetchYearBookingsCached(tenant.id, startOfYearNaive.toISOString(), endOfYearNaive.toISOString()),
    fetchRosterCountCached(tenant.id),
    fetchNewClientsCountCached(tenant.id, startOfMonth.toISOString()),
    fetchLeadVisitsCached(tenant.id),
    fetchQuotesForStatsCached(tenant.id),
    fetchMapRowsCached(tenant.id, mapRangeStart.toISOString(), mapRangeEnd.toISOString()),
    // Ledger-true YTD, replacing a raw sum() over bookings — same ledger-vs-
    // raw-table bug already fixed on /dashboard/finance and /admin/finance,
    // now fixed here too so all three surfaces report the same "Actual".
    ledgerProfitAndLoss(tenant.id, yearStartYMD, todayYMD),
    // Same AR-aging source /api/finance/ar-aging and Finance Overview use —
    // replacing a raw "completed + payment_status=pending" booking sum that
    // double-counted refunded bookings as owed and ignored unpaid invoices.
    getArAging(tenant.id),
  ])

  const mapJobs = mapRows.map((r) => ({
    id: r.id, start_time: r.start_time, status: r.status, service_type: r.service_type,
    cleaner_id: r.team_member_id,
    clients: r.clients,
    team_members: r.team_members,
    booking_team_members: r.booking_team_members,
  })) as MapJob[]

  const collected = (a: Date, b: Date) => allJobs.filter(j => COLLECTED(j) && inRange(j, a, b))
  const scheduled = (a: Date, b: Date) => allJobs.filter(j => SCHEDULED(j) && inRange(j, a, b))
  const collectedToday = collected(startOfDayNaive, endOfDayNaive)
  const collectedWeek = collected(startOfWeekNaive, endOfWeekNaive)
  const collectedMonth = collected(startOfMonthNaive, endOfMonthNaive)
  const collectedYear = collected(startOfYearNaive, endOfYearNaive)

  const all2026 = allJobs.filter(j => SCHEDULED(j))
  const scheduled2026Total = sum(all2026)
  const scheduledWeek = scheduled(startOfWeekNaive, endOfWeekNaive)
  const scheduledMonth = scheduled(startOfMonthNaive, endOfMonthNaive)

  // Remaining (booked, future months through year-end)
  const remaining = allJobs.filter(j => ['scheduled', 'confirmed'].includes(j.status) && inRange(j, endOfMonthNaive, endOfYearNaive))

  // AR aging — same ledger-backed source as /api/finance/ar-aging and
  // Finance Overview (see arAging fetched above).
  const ar30 = arAging.buckets.find(b => b.label === 'Current')?.total_cents ?? 0
  const ar60 = arAging.buckets.find(b => b.label === '31-60')?.total_cents ?? 0
  const ar90 = (arAging.buckets.find(b => b.label === '61-90')?.total_cents ?? 0) + (arAging.buckets.find(b => b.label === '90+')?.total_cents ?? 0)

  const recurringJobs = all2026.filter(j => j.schedule_id != null)
  // Was revenue-weighted (sum($) / sum($)) while the tile's own subtitle
  // ("N of M jobs") is a job-COUNT ratio — the two disagreed (31% vs the
  // 42% "377 of 896" implied). Job-count-weighted matches the subtitle it's
  // displayed next to and is the more standard "recurring rate" definition.
  const recurringPct = all2026.length > 0 ? Math.round((recurringJobs.length / all2026.length) * 100) : 0
  const avgJobValue = collectedMonth.length > 0 ? Math.round(sum(collectedMonth) / collectedMonth.length) : 0

  // nycmaid's V1 build includes a one-off January-actual adjustment (pre-migration
  // jobs/revenue not present in `bookings` — nycmaid didn't start on this platform
  // until February). Not a general formula — gated to that tenant only, same pattern
  // as other nycmaid-specific adjustments.
  const isNycmaid = tenant.id === NYCMAID_TENANT_ID
  const NYCMAID_JANUARY_ACTUAL_CENTS = 600000
  const NYCMAID_JANUARY_ACTUAL_JOBS = 30
  const projectedRevenue = isNycmaid
    ? NYCMAID_JANUARY_ACTUAL_CENTS + scheduled2026Total
    : scheduled2026Total
  const projectedJobs = isNycmaid
    ? NYCMAID_JANUARY_ACTUAL_JOBS + all2026.length
    : all2026.length

  const revenueLadder: Array<{ label: string; val: number; jobs: number; emphasize: boolean; note?: string }> = [
    { label: 'Today', val: sum(collectedToday), jobs: collectedToday.length, emphasize: false },
    { label: 'Week', val: sum(collectedWeek), jobs: collectedWeek.length, emphasize: false },
    { label: monthShort, val: sum(collectedMonth), jobs: collectedMonth.length, emphasize: false },
    { label: `${yearStr} · Actual`, val: ytdPnl.revenue_cents, jobs: collectedYear.length, emphasize: true },
    {
      label: `${yearStr} · Projected`, val: projectedRevenue, jobs: projectedJobs, emphasize: true,
      note: isNycmaid ? `incl. $${(NYCMAID_JANUARY_ACTUAL_CENTS / 100).toLocaleString()} pre-migration Jan (${NYCMAID_JANUARY_ACTUAL_JOBS} jobs)` : undefined,
    },
  ]
  const volumeLadder = [
    { label: 'Jobs · Week', val: scheduledWeek.length, sub: formatMoney(sum(scheduledWeek)) },
    { label: `Jobs · ${monthShort}`, val: scheduledMonth.length, sub: formatMoney(sum(scheduledMonth)) },
    { label: 'Jobs · YTD', val: projectedJobs, sub: formatMoney(projectedRevenue) },
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
    const ymd = `${yearStr}-${String(monthIdx + 1).padStart(2, '0')}-01`
    const mStart = naiveMidnight(ymd)
    const mEnd = naiveMidnight(monthIdx === 11 ? `${Number(yearStr) + 1}-01-01` : `${yearStr}-${String(monthIdx + 2).padStart(2, '0')}-01`)
    const jobs = allJobs.filter(j => SCHEDULED(j) && inRange(j, mStart, mEnd))
    // January is pre-migration for nycmaid — no `bookings` rows exist for it,
    // so fold in the same known actuals used in the Projected ladder above.
    const isNycmaidJan = isNycmaid && monthIdx === 0
    return {
      label: mStart.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      count: isNycmaidJan ? NYCMAID_JANUARY_ACTUAL_JOBS + jobs.length : jobs.length,
      revenue: isNycmaidJan ? NYCMAID_JANUARY_ACTUAL_CENTS + sum(jobs) : sum(jobs),
      isCurrent: monthIdx === zonedNow.getMonth(), isFuture: monthIdx > zonedNow.getMonth(),
    }
  })
  const kpis = [
    { label: 'AR Outstanding', val: formatMoney(arAging.total_cents), sub: `${arAging.rows.length} items · ${formatMoney(ar30)} 0-30 · ${formatMoney(ar60)} 31-60 · ${formatMoney(ar90)} 60+` },
    { label: `New Clients · ${monthShort}`, val: String(newThisMonth), sub: `Roster ${roster}` },
    { label: 'Recurring %', val: `${recurringPct}%`, sub: `${recurringJobs.length} of ${all2026.length} jobs` },
    { label: 'Avg Job Value', val: formatMoney(avgJobValue), sub: `${collectedMonth.length} paid · ${monthShort}` },
  ]

  // Today/Tomorrow feed rows need phone + address (Call/Text/Directions
  // without opening the booking) — a targeted 2-day query instead of adding
  // those columns to the whole-year fetch above.
  const tomorrowStartNaive = endOfDayNaive
  const tomorrowEndNaive = naiveMidnight(addDaysYMD(todayYMD, 2))
  const { data: feedRows } = await supabaseAdmin
    .from('bookings')
    .select('id,start_time,end_time,status,service_type,clients(name,phone,address),team_members!bookings_team_member_id_fkey(name),booking_team_members(team_member_id,is_lead,position,team_members(id,name))')
    .eq('tenant_id', tenant.id)
    .gte('start_time', startOfDayNaive.toISOString())
    .lt('start_time', tomorrowEndNaive.toISOString())
    .in('status', ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress'])
    .order('start_time', { ascending: true })
  const feedJobs = (feedRows || []) as unknown as FeedBooking[]
  const todayJobs = feedJobs.filter(j => inRange(j, startOfDayNaive, endOfDayNaive))
  const tomorrowJobs = feedJobs.filter(j => { const d = parseNaive(j.start_time); return d >= tomorrowStartNaive && d < tomorrowEndNaive })

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
            {c.note && <div style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.warn, marginTop: 3 }}>{c.note}</div>}
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
                    <p className="text-sm" style={{ color: V.muted }}>{job.service_type || 'Job'} · {crewNames(job)}</p>
                  </Link>
                  <ContactChips phone={job.clients?.phone} address={job.clients?.address} />
                  <Link href={`/dashboard/bookings?edit=${job.id}`} className="text-right flex-shrink-0">
                    <p style={{ fontFamily: V.mono, fontSize: '12px', color: V.ink }}>
                      {formatTime(job.start_time)}
                      {formatDuration(job.start_time, job.end_time) && ` · ${formatDuration(job.start_time, job.end_time)}`}
                    </p>
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
      <JobsMap
        jobs={mapJobs}
        dayRange={[startOfDayNaive.toISOString(), endOfDayNaive.toISOString()]}
        weekRange={[startOfWeekNaive.toISOString(), endOfWeekNaive.toISOString()]}
        monthRange={[startOfMonthNaive.toISOString(), endOfMonthNaive.toISOString()]}
      />
    </>
  )
}
