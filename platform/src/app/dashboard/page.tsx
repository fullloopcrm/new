import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { getCurrentTenant } from '@/lib/tenant'
import { getTenantForRequest } from '@/lib/tenant-query'
import { hasPermission, type RolePermissionOverrides } from '@/lib/rbac'
import { supabaseAdmin } from '@/lib/supabase'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { getArAging } from '@/lib/finance/ar-aging'
import ScheduleIssues from './_components/ScheduleIssues'
import BillingIssues from './_components/BillingIssues'
import AutoScheduled from './_components/AutoScheduled'
import SectionVisibility from './_components/SectionVisibility'
import { JobsByMonthGrid } from './_components/JobsByMonthGrid'
import JobsMap, { type MapJob } from './_components/JobsMap'
import { CallTextCopy } from './_components/CallTextCopy'
import { crewNames, type CrewRow } from '@/lib/crew'
import { formatPhone } from '@/lib/format'
import { computeRecurringForecast, type ForecastSchedule } from '@/lib/recurring-forecast'
import type { RecurringType } from '@/lib/recurring'

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
// start_time is a NAIVE Eastern wall-clock string (see parseNaive comment
// below) — parse the digits directly instead of going through `new Date()`,
// which on the server (UTC on Vercel) treats it as a UTC instant and then
// double-shifts it when reformatted with timeZone: 'America/New_York'.
const formatTime = (s: string) => {
  const timePart = s.split(/[T ]/)[1] || '00:00'
  const [hStr, mStr] = timePart.split(':')
  const h24 = parseInt(hStr, 10)
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${h12}:${mStr} ${ampm}`
}
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
          <span className="text-[10px] text-gray-500 whitespace-nowrap">{formatPhone(phone)}</span>
          <CallTextCopy phone={phone} size="xs" />
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
  price: number | null
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

// Active recurring schedules -- read-only, feeds computeRecurringForecast
// (lib/recurring-forecast.ts). Never used to create/modify a booking; the
// real generators (cron/generate-recurring, admin+client recurring-schedule
// routes) are the only writers of `bookings` rows.
type ForecastScheduleRow = {
  id: string
  recurring_type: string
  day_of_week: number | null
  days_of_week: number[] | null
  duration_hours: number | null
  hourly_rate: number | null
  discount_percent: number | null
  created_at: string
}
async function fetchActiveRecurringSchedules(tenantId: string): Promise<ForecastScheduleRow[]> {
  const { data } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, recurring_type, day_of_week, days_of_week, duration_hours, hourly_rate, discount_percent, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
  return (data || []) as ForecastScheduleRow[]
}
const fetchActiveRecurringSchedulesCached = unstable_cache(fetchActiveRecurringSchedules, ['dashboard-active-recurring-schedules'], { revalidate: CACHE_TTL_SECONDS })

// Skip-exceptions -- an occurrence explicitly cancelled for one date must
// never be projected as forecasted revenue/labor.
async function fetchSkipExceptions(tenantId: string): Promise<{ schedule_id: string; occurrence_date: string }[]> {
  const { data } = await supabaseAdmin
    .from('recurring_exceptions')
    .select('schedule_id, occurrence_date')
    .eq('tenant_id', tenantId)
    .eq('type', 'skip')
  return (data || []) as { schedule_id: string; occurrence_date: string }[]
}
const fetchSkipExceptionsCached = unstable_cache(fetchSkipExceptions, ['dashboard-skip-exceptions'], { revalidate: CACHE_TTL_SECONDS })

// Per-tenant row on/off state (see /api/dashboard/section-visibility) — read
// fresh, not unstable_cache'd, so a toggle takes effect on the very next load.
async function fetchHiddenSections(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from('tenants').select('setup_progress').eq('id', tenantId).single()
  const sp = (data?.setup_progress || {}) as Record<string, unknown>
  return Array.isArray(sp.dashboard_hidden_sections) ? (sp.dashboard_hidden_sections as string[]) : []
}

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  // Best-effort display gate for money figures — the real security boundary
  // is requirePermission() on the finance API routes; this just keeps
  // revenue numbers off a role's screen when they lack finance.view. Fails
  // open (shows finance) on any resolution error, matching this page's
  // prior always-shown behavior.
  const viewerRole = await getTenantForRequest().then(t => t.role).catch(() => 'owner')
  const roleOverrides = (tenant.selena_config as { role_permissions?: RolePermissionOverrides } | null)?.role_permissions ?? null
  const canViewFinance = hasPermission(viewerRole, 'finance.view', roleOverrides)

  // "Today" per the TENANT's own configured timezone (Settings → Time Zone),
  // not the server process's zone (UTC on Vercel) — without this, every
  // day/week/month cutoff below rolls over 4-5 hours early, e.g. "Today's
  // Jobs" starting to show tomorrow's bookings from ~8pm ET onward.
  const tz = tenant.timezone || 'America/New_York'
  const now = new Date()

  // Wall-clock-in-tz for a UTC instant, as UTC-millis — ambient-timezone-
  // independent (formatToParts always reads the specified `tz`, regardless
  // of what timezone this process happens to be running in). The previous
  // version reformatted the instant as a locale STRING and reparsed it with
  // `new Date(string)`, which uses the CALLING ENVIRONMENT's ambient
  // timezone — correct only because this always runs on Vercel (UTC); see
  // the identical bug fixed in lib/tenant-time.ts's getTimezoneOffsetMinutes
  // 2026-08-14. Zero behavior change on Vercel; portable everywhere now.
  const wallAsUtcMs = (at: Date, atTz: string): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: atTz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(at)
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
    const hour = get('hour')
    return Date.UTC(get('year'), get('month') - 1, get('day'), hour === 24 ? 0 : hour, get('minute'), get('second'))
  }
  // True UTC instants for a given tenant-local Y-M-D midnight — correct for
  // filtering genuine timestamptz columns (clients/lead_clicks/quotes
  // created_at/accepted_at) via inDateRange() above.
  const zonedMidnight = (ymd: string): Date => {
    const guess = new Date(`${ymd}T00:00:00Z`)
    return new Date(2 * guess.getTime() - wallAsUtcMs(guess, tz))
  }
  // Naive fake-UTC instant for the same Y-M-D — for bookings.start_time,
  // matching how parseNaive() above reads it back.
  const naiveMidnight = (ymd: string): Date => new Date(`${ymd}T00:00:00Z`)
  const addDaysYMD = (ymd: string, days: number): string => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
  }

  const todayYMD = now.toLocaleDateString('en-CA', { timeZone: tz }) // 'YYYY-MM-DD'
  // UTC-anchored so .getUTCDay()/.getUTCMonth() below read the tz's wall
  // clock regardless of ambient timezone — same portability fix as
  // zonedMidnight above.
  const zonedNow = new Date(wallAsUtcMs(now, tz))
  const weekStartYMD = addDaysYMD(todayYMD, -zonedNow.getUTCDay())
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

  const [allJobs, roster, newThisMonth, leads, quotesForStats, mapRows, ytdPnl, arAging, hiddenSections, activeSchedules, skipExceptions] = await Promise.all([
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
    fetchHiddenSections(tenant.id),
    fetchActiveRecurringSchedulesCached(tenant.id),
    fetchSkipExceptionsCached(tenant.id),
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

  // Plain completion count for the month — independent of payment_status, so
  // it stays visible to roles without finance.view (unlike the Revenue
  // Ladder's "collected" jobs count, which requires status=completed AND
  // payment_status=paid).
  const completedMonth = allJobs.filter(j => j.status === 'completed' && inRange(j, startOfMonthNaive, endOfMonthNaive))

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

  // Recurring forecast — computed, never materialized as bookings rows (see
  // lib/recurring-forecast.ts). The real generators only ever keep a short
  // horizon of actual booking rows for a schedule, and can have genuine
  // mid-series gaps (recurring-reconcile.ts's own documented finding), so
  // "how many bookings exist right now" understates the rest of the year.
  // This fills that gap with math, anchored on each schedule's own real
  // established cadence, so recurring clients never get a materialized
  // booking they didn't actually get told about (the old system's mass-
  // cancellation-notification failure mode this was built to avoid).
  const yearEndYMD = `${yearStr}-12-31`
  const realDatesByScheduleId = new Set<string>()
  const earliestRealDateByScheduleId = new Map<string, string>()
  for (const j of all2026) {
    if (!j.schedule_id) continue
    const dateYMD = j.start_time.slice(0, 10)
    realDatesByScheduleId.add(`${j.schedule_id}:${dateYMD}`)
    const cur = earliestRealDateByScheduleId.get(j.schedule_id)
    if (!cur || dateYMD < cur) earliestRealDateByScheduleId.set(j.schedule_id, dateYMD)
  }
  const skippedDates = new Set(skipExceptions.map(e => `${e.schedule_id}:${e.occurrence_date}`))
  const forecastSchedules: ForecastSchedule[] = activeSchedules.map(s => ({
    id: s.id,
    recurring_type: s.recurring_type as RecurringType,
    day_of_week: s.day_of_week,
    days_of_week: s.days_of_week,
    duration_hours: s.duration_hours,
    hourly_rate: s.hourly_rate,
    discount_percent: s.discount_percent,
    custom_interval_days: null,
    phase_anchor_ymd: earliestRealDateByScheduleId.get(s.id) ?? s.created_at.slice(0, 10),
  }))
  const forecast = computeRecurringForecast({
    schedules: forecastSchedules,
    realDatesByScheduleId,
    skippedDates,
    todayYMD,
    yearEndYMD,
  })

  // nycmaid's V1 build includes a one-off January-actual adjustment (pre-migration
  // jobs/revenue not present in `bookings` — nycmaid didn't start on this platform
  // until February). Not a general formula — gated to that tenant only, same pattern
  // as other nycmaid-specific adjustments.
  const isNycmaid = tenant.id === NYCMAID_TENANT_ID
  const NYCMAID_JANUARY_ACTUAL_CENTS = 600000
  const NYCMAID_JANUARY_ACTUAL_JOBS = 30
  const projectedRevenue = (isNycmaid ? NYCMAID_JANUARY_ACTUAL_CENTS + scheduled2026Total : scheduled2026Total) + forecast.total.revenue_cents
  const projectedJobs = (isNycmaid ? NYCMAID_JANUARY_ACTUAL_JOBS + all2026.length : all2026.length) + forecast.total.jobs

  const revenueLadder: Array<{ label: string; val: number; jobs: number; emphasize: boolean; note?: string }> = [
    { label: 'Today', val: sum(collectedToday), jobs: collectedToday.length, emphasize: false },
    { label: 'Week', val: sum(collectedWeek), jobs: collectedWeek.length, emphasize: false },
    { label: monthShort, val: sum(collectedMonth), jobs: collectedMonth.length, emphasize: false },
    { label: `${yearStr} · Actual`, val: ytdPnl.revenue_cents, jobs: collectedYear.length, emphasize: true },
    {
      label: `${yearStr} · Projected`, val: projectedRevenue, jobs: projectedJobs, emphasize: true,
      note: [
        isNycmaid ? `incl. $${(NYCMAID_JANUARY_ACTUAL_CENTS / 100).toLocaleString()} pre-migration Jan (${NYCMAID_JANUARY_ACTUAL_JOBS} jobs)` : null,
        forecast.total.jobs > 0 ? `incl. ${formatMoney(forecast.total.revenue_cents)} forecasted from ${activeSchedules.length} active recurring schedule${activeSchedules.length === 1 ? '' : 's'} not yet booked (+${forecast.total.jobs} visits)` : null,
      ].filter(Boolean).join(' · ') || undefined,
    },
  ]
  const volumeLadder = [
    { label: 'Jobs · Week', val: scheduledWeek.length, sub: canViewFinance ? formatMoney(sum(scheduledWeek)) : '' },
    { label: `Booked · ${monthShort}`, val: scheduledMonth.length, sub: canViewFinance ? formatMoney(sum(scheduledMonth)) : '' },
    { label: `Completed · ${monthShort}`, val: completedMonth.length, sub: `${scheduledMonth.length > 0 ? Math.round((completedMonth.length / scheduledMonth.length) * 100) : 0}% of booked` },
    { label: 'Jobs · YTD', val: projectedJobs, sub: canViewFinance ? formatMoney(projectedRevenue) : '' },
    { label: 'Remaining', val: remaining.length, sub: canViewFinance ? formatMoney(sum(remaining)) : '' },
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
    // Real counts only, matching the `jobs` list below exactly — the forecast
    // is surfaced as a separate field so opening a month never shows a job
    // count that doesn't match the rows actually listed.
    return {
      label: mStart.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      count: isNycmaidJan ? NYCMAID_JANUARY_ACTUAL_JOBS + jobs.length : jobs.length,
      revenue: isNycmaidJan ? NYCMAID_JANUARY_ACTUAL_CENTS + sum(jobs) : sum(jobs),
      projectedCount: forecast.byMonth[monthIdx].jobs,
      projectedRevenue: forecast.byMonth[monthIdx].revenue_cents,
      isCurrent: monthIdx === zonedNow.getUTCMonth(), isFuture: monthIdx > zonedNow.getUTCMonth(),
      jobs: jobs
        .slice()
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(j => ({
          id: j.id,
          clientName: j.clients?.name || 'Unknown client',
          date: j.start_time,
          status: j.status,
          price: j.price || 0,
        })),
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
    .select('id,start_time,end_time,status,service_type,price,clients(name,phone,address),team_members!bookings_team_member_id_fkey(name),booking_team_members(team_member_id,is_lead,position,team_members(id,name))')
    .eq('tenant_id', tenant.id)
    .gte('start_time', startOfDayNaive.toISOString())
    .lt('start_time', tomorrowEndNaive.toISOString())
    .in('status', ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress'])
    .order('start_time', { ascending: true })
  const feedJobs = (feedRows || []) as unknown as FeedBooking[]
  const todayJobs = feedJobs.filter(j => inRange(j, startOfDayNaive, endOfDayNaive))
  const tomorrowJobs = feedJobs.filter(j => { const d = parseNaive(j.start_time); return d >= tomorrowStartNaive && d < tomorrowEndNaive })
  const todayTomorrowJobs = [...todayJobs, ...tomorrowJobs]
  const expectedRevenue = todayTomorrowJobs.reduce((s, j) => s + (j.price || 0), 0)

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-2" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>
      {children}
    </div>
  )

  return (
    <>
      {/* AUTO SCHEDULED — recap of every auto-booking assignment + why it was made */}
      <AutoScheduled />

      {/* SCHEDULE ISSUES — Fix-now triage (client; tenant-scoped API) */}
      <ScheduleIssues />

      {/* BILLING ISSUES — payment_overdue/cleaner_unpaid/price_mismatch split
          out of Schedule Issues (same table+API, filtered the other way) */}
      <BillingIssues />

      {/* REVENUE LADDER — money figures, hidden without finance.view */}
      {canViewFinance && (
      <SectionVisibility section="revenue" label="Revenue" initialHidden={hiddenSections.includes('revenue')}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {revenueLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-3" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none', background: c.emphasize ? '#FBFBF6' : V.canvas }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: c.emphasize ? '32px' : '26px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{formatMoney(c.val)}</div>
            <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 4 }}>{c.jobs} jobs</div>
            {c.note && <div style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.warn, marginTop: 3 }}>{c.note}</div>}
          </div>
        ))}
      </div>
      </SectionVisibility>
      )}

      {/* SALES — leads + proposals */}
      <SectionVisibility section="sales" label="Sales" initialHidden={hiddenSections.includes('sales')}>
      <div className="grid mb-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {leadsLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-3" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '26px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {proposalsLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-3" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '24px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
          </div>
        ))}
      </div>
      </SectionVisibility>

      {/* JOBS LADDER */}
      <SectionVisibility section="jobs" label="Jobs" initialHidden={hiddenSections.includes('jobs')}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {volumeLadder.map((c, i, arr) => (
          <div key={c.label} className="px-5 py-3" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
            <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>
      </SectionVisibility>

      {/* JOBS BY MONTH */}
      <SectionVisibility section="jobs_by_month" label={`Jobs · ${yearStr} by Month`} initialHidden={hiddenSections.includes('jobs_by_month')}>
      <JobsByMonthGrid months={monthsByYear} canViewFinance={canViewFinance} V={V} />
      </SectionVisibility>

      {/* KPIs — money-heavy (AR, avg job value), hidden without finance.view */}
      {canViewFinance && (
      <SectionVisibility section="kpis" label="KPIs" initialHidden={hiddenSections.includes('kpis')}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {kpis.map((k, i, arr) => (
          <div key={k.label} className="px-5 py-3" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '24px', fontWeight: 500, color: V.ink }}>{k.val}</div>
            <div style={{ fontFamily: V.mono, fontSize: '10px', color: V.muted, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      </SectionVisibility>
      )}

      {/* TODAY + TOMORROW AT A GLANCE */}
      <SectionVisibility section="today_tomorrow" label="Today + Tomorrow" initialHidden={hiddenSections.includes('today_tomorrow')}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        <div className="px-5 py-3" style={{ borderRight: `1px solid ${V.line}` }}>
          <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>Total Jobs</div>
          <div style={{ fontFamily: V.display, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{todayTomorrowJobs.length}</div>
          <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 4 }}>{todayJobs.length} today · {tomorrowJobs.length} tomorrow</div>
        </div>
        <div className="px-5 py-3">
          <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 6 }}>Expected Revenue</div>
          <div style={{ fontFamily: V.display, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{formatMoney(expectedRevenue)}</div>
          <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 4 }}>across {todayTomorrowJobs.length} job{todayTomorrowJobs.length === 1 ? '' : 's'}</div>
        </div>
      </div>
      </SectionVisibility>

      {/* TODAY / TOMORROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[{ label: 'Today · Schedule', jobs: todayJobs, empty: 'No jobs today', showStatus: true },
          { label: 'Tomorrow · Schedule', jobs: tomorrowJobs, empty: 'No jobs tomorrow', showStatus: false }].map(col => (
          <div key={col.label}>
            <div style={{ fontFamily: V.display, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: V.ink, fontFeatureSettings: '"tnum","lnum"', marginBottom: 8 }}>
              {formatMoney(col.jobs.reduce((s, j) => s + (j.price || 0), 0))}
            </div>
            <Bar>{col.label}</Bar>
            <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
              {col.jobs.length === 0 ? (
                <p className="p-4" style={{ color: V.muted }}>{col.empty}</p>
              ) : col.jobs.map((job, i, arr) => (
                <div key={job.id} className="flex items-start gap-3 p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
                  <span style={{ fontFamily: V.mono, fontSize: '11px', color: V.muted, width: 18, flexShrink: 0, textAlign: 'right', marginTop: 1 }}>{i + 1}</span>
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
