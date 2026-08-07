// Jefe — Full Loop's platform GM. Jefe does NOT care about any tenant's revenue,
// clients, or day-to-day operations. Jefe cares about FULL LOOP itself:
//   - growth: the product's own sales pipeline (inquiries / prospects)
//   - security & stability: security events, errors, comms failures
//   - getting ahead of tenant problems BEFORE the tenant notices, so we can
//     reach out and fix them immediately
//
// This is Jefe's data layer. Every signal is platform-wide, with per-tenant
// attribution so Jefe can say "the-florida-maid has 3 comms failures — reach out."
import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'

// Notification types that represent a PROBLEM worth surfacing to the operator.
export const ISSUE_TYPES = [
  'error',
  'selena_error',
  'comms_fail',
  'comms_monitor_alert',
  'schedule_issue',
  'security',
  // Platform-wide Anthropic key alerts (cron/anthropic-health) — shared key,
  // tenant_id is null, so these fall into the 'platform-wide' bucket below.
  'anthropic_health_alert_credit_low',
  'anthropic_health_alert_auth',
  'anthropic_health_alert_rate_limit',
] as const

export interface TenantIssues {
  tenant_id: string
  tenant_name: string
  total: number
  by_type: Record<string, number>
  latest: string // most recent issue title/message, trimmed
  latest_at: string
}

export interface RecentIssue {
  tenant_id: string | null
  tenant_name: string
  type: string
  title: string
  message: string
  created_at: string
}

// Per-tenant gap in what a tenant needs to actually OPERATE (text/email/charge).
export interface TenantGap {
  tenant_name: string
  missing: string[] // e.g. ['sms', 'payments']
}

export interface PlatformHealth {
  generated_at: string
  sales: {
    inquiries_total: number
    inquiries_new_7d: number
    prospects_total: number
  }
  security: {
    events_24h: number
  }
  stability: {
    issues_24h: number
    issues_7d: number
  }
  // 1. Provisioning — which tenants can't actually operate (no SMS/email/payments).
  provisioning: {
    tenants_total: number
    no_sms: number
    no_email: number
    no_payments: number
    fully_unprovisioned: number // can't text AND can't email AND can't charge
    by_gap: TenantGap[]
  }
  // 2. Comms deliverability — outbound notification success over the last 24h.
  comms: {
    sent_24h: number
    failed_24h: number
    unknown_24h: number // status is null
    success_rate: number // 0-100, of sent+failed (100 when nothing was sent)
    worst_tenants: { tenant_name: string; failed: number }[]
  }
  // 3. Cron health — jobs that have gone silent past their expected cadence.
  crons: {
    silent: { name: string; silent_hours: number | null; expected_hours: number }[]
  }
  // 4. Real app errors (from error_logs), with trend.
  errors: {
    last_1h: number
    last_24h: number
    last_7d: number
  }
  // 5. Stuck payments — completed jobs still unpaid >24h (platform signal, NOT revenue).
  payments: {
    stuck_unpaid_24h: number
    by_tenant: { tenant_name: string; count: number }[]
  }
  // 6. Tenant lifecycle — new signups and tenants going quiet.
  lifecycle: {
    new_7d: number
    inactive: { tenant_name: string; last_active: string }[]
  }
  // Tenants with active problems, worst first — this is what Jefe acts on.
  tenants_with_issues: TenantIssues[]
  recent_issues: RecentIssue[]
  // 9. Financial — Full Loop's own revenue (seat-based monthly_rate per tenant),
  // not any tenant's revenue. at_risk = billing_status='past_due' tenants' MRR +
  // dollar value of stuck-unpaid completed bookings (platform's own exposure,
  // not the tenant's cash flow).
  financial: {
    mrr_cents: number
    arr_cents: number
    setup_collected_cents: number
    past_due_count: number
    at_risk_cents: number
  }
  // 10. Sales pipeline — partner_requests (LEAD_STAGES: new/contacted/qualified/
  // proposed/sold/lost). This is the real, currently-used pipeline that feeds
  // /admin/sales's Leads tab — NOT the legacy inquiries/prospects tables in
  // `sales` above, which nothing in the active Sales UI reads from anymore.
  sales_pipeline: {
    total: number
    new_7d: number
    by_stage: Record<string, number>
    sold_total: number
    conversion_pct: number // sold / (total - still-open 'new'), 0 when no decided leads yet
  }
  // 11. Tenant status breakdown — distinct from `provisioning` (can they
  // operate) and `lifecycle` (are they active) — this is account status.
  tenant_status: {
    active: number
    setup: number
    suspended: number
    pending: number
    cancelled: number
    other: number
  }
  // 13. Communications — real volume across every channel, 7d window. Single
  // source: comhub_messages, the unified cross-channel inbox log (channel
  // column: sms/web/voice/email/admin). NOT comhub_softphone_calls (dead —
  // zero rows all-time; that only ever covered an admin's own browser-based
  // outbound dial, not real customer calls).
  communications: {
    calls_7d: number
    sms_7d: number
    email_7d: number
    webchats_7d: number
    total_7d: number
  }
  // 12. SEO — negative (alerts) and positive (real ranking data from
  // seo_metrics, ingested daily from Search Console via cron/seo-ingest).
  seo: {
    alerts_24h: number
    alerts_7d: number
    tenants_affected: number
    // Real Search Console data, not a stub — see /admin/seo for the same source.
    first_page_count: number // distinct query/page rankings at position <= 10, latest ingest date
    improved_count: number // rankings that moved up vs. ~7 days prior
    declined_count: number
    improvement_pct: number // improved / (improved + declined), 0 when no moves tracked yet
    rankings_as_of: string | null // the ingest date this snapshot is measured against
    tenants_tracked: number // properties in seo_properties with a linked tenant
  }
  // 7. Integration health — latest sweep (cron/integration-health-sweep) of
  // each tenant's Telnyx/Resend/Stripe (+ tenant Anthropic override) keys.
  // A dead key here is a tenant that's PROVISIONED but silently broken —
  // distinct from `provisioning`, which only checks a key is present at all.
  integrations: {
    swept_at: string | null // null if the sweep has never run
    tenants_with_failures: { tenant_name: string; failed: string[] }[]
  }
  // 8. Uptime — reads the existing Fortress cron's results (tenant_health),
  // does not re-run any checks itself. `failing` = site is down/misrouting
  // RIGHT NOW (Fortress already Telegrams this separately); `expiring_certs`
  // = SSL expiry within 14d, a slower-moving signal Fortress tracks but only
  // alerts on its own separate channel.
  uptime: {
    checked_at: string | null
    failing: { tenant_name: string; domain: string; detail: string }[]
    expiring_certs: { tenant_name: string; domain: string; days_remaining: number | null; detail: string }[]
  }
}

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()
// bookings.end_time is `timestamp without time zone` — compare with a tz-less string.
const noTz = (iso: string) => iso.replace('T', ' ').replace('Z', '')
const hasValue = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim().length > 0

// Cron-silence checks — mirrors src/app/api/cron/health-monitor/route.ts. A cron
// that writes a known side-effect (notification type / email subject) for ANY
// tenant counts as alive; silence platform-wide means the cron itself is down.
type CronSource = 'notifications' | 'email_logs'
interface CronCheck {
  cron: string
  source: CronSource
  match: Record<string, string>
  maxSilenceMin: number
}
const CRON_CHECKS: CronCheck[] = [
  { cron: 'email-monitor', source: 'notifications', match: { type: 'email_monitor_tick' }, maxSilenceMin: 60 },
  { cron: 'payment-reminder', source: 'notifications', match: { type: 'payment_reminder_fired' }, maxSilenceMin: 24 * 60 },
  { cron: 'late-check-in', source: 'notifications', match: { type: 'late_check_in' }, maxSilenceMin: 7 * 24 * 60 },
  { cron: 'generate-recurring', source: 'notifications', match: { type: 'recurring_generated' }, maxSilenceMin: 8 * 24 * 60 },
  { cron: 'daily-summary', source: 'notifications', match: { type: 'daily_summary_sent' }, maxSilenceMin: 28 * 60 },
  { cron: 'recurring-expenses', source: 'notifications', match: { type: 'recurring_expense_posted' }, maxSilenceMin: 48 * 60 },
  { cron: 'reminders', source: 'email_logs', match: { subject: 'reminder' }, maxSilenceMin: 36 * 60 },
  { cron: 'pipeline.new_lead', source: 'notifications', match: { type: 'new_lead' }, maxSilenceMin: 24 * 60 },
  { cron: 'pipeline.new_booking', source: 'notifications', match: { type: 'new_booking' }, maxSilenceMin: 3 * 24 * 60 },
]

async function lastCronOccurrence(check: CronCheck): Promise<Date | null> {
  let query = supabaseAdmin.from(check.source).select('created_at').order('created_at', { ascending: false }).limit(1)
  for (const [k, v] of Object.entries(check.match)) {
    if (k === 'subject') query = query.ilike(k, `%${v}%`)
    else query = query.eq(k, v)
  }
  const { data, error } = await query
  if (error || !data || data.length === 0) return null
  const ts = (data[0] as { created_at: string }).created_at
  return ts ? new Date(ts) : null
}

interface TenantRow {
  id: string
  name: string
  status: string | null
  telnyx_api_key: string | null
  resend_api_key: string | null
  stripe_api_key: string | null
  created_at: string | null
  last_active_at: string | null
  billing_status: string | null
  monthly_rate: number | null
  setup_fee: number | null
  setup_fee_paid_at: string | null
}

const TENANT_STATUSES = ['active', 'setup', 'suspended', 'pending', 'cancelled'] as const

type RankingSnapshot = {
  first_page_count: number
  improved_count: number
  declined_count: number
  improvement_pct: number
  rankings_as_of: string | null
  tenants_tracked: number
}

type SeoMetricRow = { property: string; page: string; query: string; position: number; date: string }

function baseSeoMetricsQuery() {
  return supabaseAdmin.from('seo_metrics').select('property, page, query, position, date')
}

// supabase-js silently caps an unbounded .select() at 1000 rows (PostgREST's
// default page size) — NOT an error, just a truncated result, which is how
// first_page_count ended up computed from ~10% of the real latest-date data.
// Paginate with .range() until a page comes back short.
async function fetchAllSeoMetrics(filter: (q: ReturnType<typeof baseSeoMetricsQuery>) => ReturnType<typeof baseSeoMetricsQuery>): Promise<SeoMetricRow[]> {
  const PAGE = 1000
  const out: SeoMetricRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await filter(baseSeoMetricsQuery()).range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    out.push(...(data as SeoMetricRow[]))
    if (data.length < PAGE) break
  }
  return out
}

// Real Search Console rankings (seo_metrics, ~600k+ rows across all ingested
// properties — see src/lib/seo/ingest.ts). Deliberately does NOT scan the
// whole table: pulls only the latest ingested date's slice plus a window
// covering the comparison date ~7 days earlier, joins them in memory by
// property+page+query. That's the same shape /admin/seo already reads from,
// just aggregated platform-wide instead of per-tenant. Both slices are fully
// paginated (see fetchAllSeoMetrics) — do not swap back to a bare .select()
// or .limit(), either silently truncates and undercounts.
async function computeSeoRankingsUncached(): Promise<RankingSnapshot> {
  const empty: RankingSnapshot = { first_page_count: 0, improved_count: 0, declined_count: 0, improvement_pct: 0, rankings_as_of: null, tenants_tracked: 0 }

  const { data: latestRow } = await supabaseAdmin.from('seo_metrics').select('date').order('date', { ascending: false }).limit(1)
  const latestDate = latestRow?.[0]?.date as string | undefined
  if (!latestDate) return empty

  const priorTarget = new Date(new Date(latestDate + 'T00:00:00Z').getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
  // Window, not a single date: ingestion doesn't run every day for every
  // property, so the nearest available date to "7 days back" varies per
  // property. A 10-day lookback window (fully paginated, not row-capped)
  // lets every property find its own nearest prior date fairly, instead of
  // whichever properties happened to sort first in a capped fetch.
  const priorWindowStart = new Date(new Date(priorTarget + 'T00:00:00Z').getTime() - 10 * 86_400_000).toISOString().slice(0, 10)

  const [propsRes, latest, priorWindow] = await Promise.all([
    supabaseAdmin.from('seo_properties').select('property, tenant_id').not('tenant_id', 'is', null),
    fetchAllSeoMetrics((q) => q.eq('date', latestDate)),
    fetchAllSeoMetrics((q) => q.gte('date', priorWindowStart).lte('date', priorTarget)),
  ])

  const trackedProperties = new Set((propsRes.data || []).map((p) => p.property as string))
  const latestFiltered = latest.filter((r) => trackedProperties.has(r.property))
  const priorFiltered = priorWindow.filter((r) => trackedProperties.has(r.property))

  // Per-property nearest-to-priorTarget date, so a property that only
  // ingested 9 days back isn't compared against one that ingested exactly on
  // priorTarget using two different baselines silently.
  const nearestDateByProperty = new Map<string, string>()
  for (const r of priorFiltered) {
    const cur = nearestDateByProperty.get(r.property)
    if (!cur || r.date > cur) nearestDateByProperty.set(r.property, r.date)
  }

  const priorByKey = new Map<string, number>()
  for (const r of priorFiltered) {
    if (nearestDateByProperty.get(r.property) !== r.date) continue // only that property's chosen baseline date
    const key = `${r.property}::${r.page}::${r.query}`
    priorByKey.set(key, r.position)
  }

  let firstPage = 0
  let improved = 0
  let declined = 0
  for (const r of latestFiltered) {
    if (r.position <= 10) firstPage++
    const key = `${r.property}::${r.page}::${r.query}`
    const priorPos = priorByKey.get(key)
    if (priorPos !== undefined) {
      if (r.position < priorPos) improved++
      else if (r.position > priorPos) declined++
    }
  }

  const decidedMoves = improved + declined
  return {
    first_page_count: firstPage,
    improved_count: improved,
    declined_count: declined,
    improvement_pct: decidedMoves > 0 ? Math.round((improved / decidedMoves) * 100) : 0,
    rankings_as_of: latestDate,
    tenants_tracked: new Set((propsRes.data || []).map((p) => p.tenant_id)).size,
  }
}

// Full pagination across ~600k+ real rows takes ~20s — fine for a cron, not
// for a page load. Rankings only actually change once a day (GSC ingest
// lag), so a 1h cache eliminates the repeat cost with no real staleness.
const computeSeoRankings = unstable_cache(computeSeoRankingsUncached, ['seo-rankings-snapshot'], { revalidate: 3600 })

export async function getPlatformHealth(now: Date = new Date()): Promise<PlatformHealth> {
  const since7d = hoursAgo(now, 24 * 7)
  const since24h = hoursAgo(now, 24)
  const since1h = hoursAgo(now, 1)
  const stuckBefore = noTz(hoursAgo(now, 24)) // ended >24h ago
  const stuckAfter = noTz(hoursAgo(now, 24 * 30)) // bounded to last 30d so "stuck" stays a recent signal

  const cronPromises = CRON_CHECKS.map((c) => lastCronOccurrence(c))
  const rankingsPromise = computeSeoRankings()

  const [
    tenantsRes,
    issuesRes,
    inquiriesTotalRes,
    inquiriesNewRes,
    prospectsRes,
    secRes,
    commsRes,
    err1hRes,
    err24hRes,
    err7dRes,
    stuckRes,
    cronLasts,
    integrationsRes,
    integrationsSweptAtRes,
    uptimeRes,
    leadsRes,
    seoRes,
    callsRes,
    smsRes,
    emailRes,
    webchatRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, status, telnyx_api_key, resend_api_key, stripe_api_key, created_at, last_active_at, billing_status, monthly_rate, setup_fee, setup_fee_paid_at')
      .neq('status', 'deleted'),
    supabaseAdmin
      .from('notifications')
      .select('tenant_id, type, title, message, created_at')
      .in('type', ISSUE_TYPES as unknown as string[])
      .gte('created_at', since7d)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabaseAdmin.from('prospects').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('security_events').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
    supabaseAdmin.from('notifications').select('tenant_id, status').gte('created_at', since24h),
    supabaseAdmin.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since1h),
    supabaseAdmin.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
    supabaseAdmin.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabaseAdmin
      .from('bookings')
      .select('tenant_id, payment_status, price')
      .eq('status', 'completed')
      .lt('end_time', stuckBefore)
      .gt('end_time', stuckAfter)
      .limit(1000),
    Promise.all(cronPromises),
    // Read-only: the sweep itself runs on cron/integration-health-sweep, not here.
    supabaseAdmin
      .from('jefe_integration_health')
      .select('tenant_name, failed, failed_count, checked_at')
      .gt('failed_count', 0)
      .order('failed_count', { ascending: false })
      .limit(20),
    supabaseAdmin.from('jefe_integration_health').select('checked_at').order('checked_at', { ascending: false }).limit(1),
    // Read-only: Fortress (cron/tenant-health) owns the actual checks + its
    // own direct alerting. Jefe just reads the latest results here.
    supabaseAdmin.from('tenant_health').select('slug, domain, status, checks, detail, checked_at'),
    // Real sales pipeline (see /admin/sales's Leads tab + /api/admin/requests/
    // convert) — partner_requests, not the legacy inquiries/prospects tables.
    supabaseAdmin.from('partner_requests').select('status, created_at'),
    // SEO ranking advisories (cron/seo-alerts) — logged into `notifications`
    // with type='error', which is why they were drowning out real errors in
    // `stability`/`tenants_with_issues`. Broken out into their own signal.
    supabaseAdmin.from('notifications').select('tenant_id, created_at').eq('title', 'cron/seo-alerts').gte('created_at', since7d), // tenant-scope-ok: Jefe platform-admin health dashboard aggregates across all tenants by design
    // Communications volume — comhub_messages is the real unified cross-
    // channel inbox log (channel: sms/web/voice/email/admin), confirmed live
    // (7d sample: sms 619, web 59, voice 76, email 162, admin 2). Count-only
    // queries are safe from the pagination-truncation bug that hit SEO —
    // {count:'exact', head:true} returns a real count, never a capped row set.
    supabaseAdmin.from('comhub_messages').select('id', { count: 'exact', head: true }).eq('channel', 'voice').gte('created_at', since7d),
    supabaseAdmin.from('comhub_messages').select('id', { count: 'exact', head: true }).eq('channel', 'sms').gte('created_at', since7d),
    supabaseAdmin.from('comhub_messages').select('id', { count: 'exact', head: true }).eq('channel', 'email').gte('created_at', since7d),
    supabaseAdmin.from('comhub_messages').select('id', { count: 'exact', head: true }).eq('channel', 'web').gte('created_at', since7d),
  ])

  const tenants = (tenantsRes.data || []) as TenantRow[]
  const nameById = new Map<string, string>(tenants.map((t) => [t.id, t.name]))

  // --- existing issue aggregation (7d) ---
  const issues = (issuesRes.data || []) as Array<{ tenant_id: string | null; type: string; title: string | null; message: string | null; created_at: string }>
  const byTenant = new Map<string, TenantIssues>()
  let issues24h = 0
  for (const it of issues) {
    if (it.created_at >= since24h) issues24h++
    const tid = it.tenant_id || 'platform'
    const name = it.tenant_id ? nameById.get(it.tenant_id) || 'unknown tenant' : 'platform-wide'
    const cur = byTenant.get(tid) || { tenant_id: tid, tenant_name: name, total: 0, by_type: {}, latest: '', latest_at: '' }
    cur.total++
    cur.by_type[it.type] = (cur.by_type[it.type] || 0) + 1
    if (!cur.latest_at) {
      cur.latest = (it.title || it.message || it.type).slice(0, 140)
      cur.latest_at = it.created_at
    }
    byTenant.set(tid, cur)
  }
  const tenants_with_issues = [...byTenant.values()].sort((a, b) => b.total - a.total)
  const recent_issues: RecentIssue[] = issues.slice(0, 15).map((it) => ({
    tenant_id: it.tenant_id,
    tenant_name: it.tenant_id ? nameById.get(it.tenant_id) || 'unknown tenant' : 'platform-wide',
    type: it.type,
    title: it.title || '',
    message: (it.message || '').slice(0, 200),
    created_at: it.created_at,
  }))

  // --- 1. provisioning ---
  let no_sms = 0
  let no_email = 0
  let no_payments = 0
  let fully_unprovisioned = 0
  const by_gap: TenantGap[] = []
  for (const t of tenants) {
    const missing: string[] = []
    if (!hasValue(t.telnyx_api_key)) missing.push('sms')
    if (!hasValue(t.resend_api_key)) missing.push('email')
    if (!hasValue(t.stripe_api_key)) missing.push('payments')
    if (missing.includes('sms')) no_sms++
    if (missing.includes('email')) no_email++
    if (missing.includes('payments')) no_payments++
    if (missing.length === 3) fully_unprovisioned++
    if (missing.length > 0) by_gap.push({ tenant_name: t.name, missing })
  }
  by_gap.sort((a, b) => b.missing.length - a.missing.length)

  // --- 2. comms deliverability (24h) ---
  const comms = (commsRes.data || []) as Array<{ tenant_id: string | null; status: string | null }>
  let sent_24h = 0
  let failed_24h = 0
  let unknown_24h = 0
  const failByTenant = new Map<string, number>()
  for (const c of comms) {
    if (c.status === 'sent') sent_24h++
    else if (c.status === 'failed') {
      failed_24h++
      const tid = c.tenant_id || 'platform'
      failByTenant.set(tid, (failByTenant.get(tid) || 0) + 1)
    } else unknown_24h++
  }
  const denom = sent_24h + failed_24h
  const success_rate = denom === 0 ? 100 : Math.round((sent_24h / denom) * 100)
  const worst_tenants = [...failByTenant.entries()]
    .map(([tid, failed]) => ({ tenant_name: tid === 'platform' ? 'platform-wide' : nameById.get(tid) || 'unknown tenant', failed }))
    .sort((a, b) => b.failed - a.failed)
    .slice(0, 5)

  // --- 3. cron health ---
  const silent: { name: string; silent_hours: number | null; expected_hours: number }[] = []
  CRON_CHECKS.forEach((c, i) => {
    const last = cronLasts[i]
    const silenceMs = last ? now.getTime() - last.getTime() : Number.POSITIVE_INFINITY
    if (silenceMs > c.maxSilenceMin * 60 * 1000) {
      silent.push({
        name: c.cron,
        silent_hours: last ? Math.round(silenceMs / 3600000) : null, // null = never seen
        expected_hours: Math.round(c.maxSilenceMin / 60),
      })
    }
  })

  // --- 5. stuck payments ---
  const stuck = (stuckRes.data || []) as Array<{ tenant_id: string | null; payment_status: string | null; price: number | null }>
  const stuckUnpaid = stuck.filter((b) => b.payment_status !== 'paid')
  const stuckByTenant = new Map<string, number>()
  for (const b of stuckUnpaid) {
    const tid = b.tenant_id || 'platform'
    stuckByTenant.set(tid, (stuckByTenant.get(tid) || 0) + 1)
  }
  const payments_by_tenant = [...stuckByTenant.entries()]
    .map(([tid, count]) => ({ tenant_name: tid === 'platform' ? 'platform-wide' : nameById.get(tid) || 'unknown tenant', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // --- 6. lifecycle ---
  const inactiveCutoff = hoursAgo(now, 24 * 14)
  let new_7d = 0
  const inactive: { tenant_name: string; last_active: string }[] = []
  for (const t of tenants) {
    if (t.created_at && t.created_at >= since7d) new_7d++
    if (t.last_active_at && t.last_active_at < inactiveCutoff) {
      inactive.push({ tenant_name: t.name, last_active: t.last_active_at })
    }
  }
  inactive.sort((a, b) => a.last_active.localeCompare(b.last_active)) // most stale first

  // --- 7. uptime (reads Fortress's existing tenant_health results) ---
  interface TenantHealthRow {
    slug: string
    domain: string
    status: string
    checks: { sslExpiry?: { daysRemaining: number | null; detail: string } } | null
    detail: string
    checked_at: string
  }
  const uptimeRows = (uptimeRes.data || []) as TenantHealthRow[]
  const uptimeFailing = uptimeRows
    .filter((r) => r.status === 'fail')
    .map((r) => ({ tenant_name: r.slug, domain: r.domain, detail: r.detail }))
  const expiringCerts = uptimeRows
    .filter((r) => {
      const d = r.checks?.sslExpiry?.daysRemaining
      return typeof d === 'number' && d < 14
    })
    .map((r) => ({
      tenant_name: r.slug,
      domain: r.domain,
      days_remaining: r.checks?.sslExpiry?.daysRemaining ?? null,
      detail: r.checks?.sslExpiry?.detail || '',
    }))
  const uptimeCheckedAt = uptimeRows.reduce<string | null>((latest, r) => (!latest || r.checked_at > latest ? r.checked_at : latest), null)
  const uptime: PlatformHealth['uptime'] = { checked_at: uptimeCheckedAt, failing: uptimeFailing, expiring_certs: expiringCerts }

  // --- 9. financial ---
  // MRR sums every tenant's monthly_rate regardless of status (matches
  // /api/admin/billing's definition) — /api/admin/sales computes a narrower
  // "active only" MRR for a different purpose (account-status review); this
  // is the platform revenue total, so it uses the billing definition.
  const mrr_cents = tenants.reduce((s, t) => s + (t.monthly_rate || 0), 0)
  const pastDueTenants = tenants.filter((t) => t.billing_status === 'past_due')
  const pastDueMrr = pastDueTenants.reduce((s, t) => s + (t.monthly_rate || 0), 0)
  const stuckUnpaidCents = stuckUnpaid.reduce((s, b) => s + (b.price || 0), 0)
  const financial: PlatformHealth['financial'] = {
    mrr_cents,
    arr_cents: mrr_cents * 12,
    // setup_fee_paid_at is only stamped once collected — count actual setup
    // fees, not the setup_fee owed on tenants still mid-setup. NOTE: the
    // $25k setup fee is collected by bank wire, not the Stripe checkout
    // (that only covers the $2,500/mo subscription — see
    // webhooks/stripe-platform/route.ts's own comment). This field is only
    // ever stamped by an admin manually confirming a wire in
    // api/admin/prospects/[id]/wire-received, so $0 here is expected/honest
    // until that confirmation happens for real invoiced tenants — it is NOT
    // evidence of a broken stamp.
    setup_collected_cents: tenants
      .filter((t) => t.setup_fee_paid_at)
      .reduce((s, t) => s + (t.setup_fee || 0), 0),
    past_due_count: pastDueTenants.length,
    at_risk_cents: pastDueMrr + stuckUnpaidCents,
  }

  // --- 10. sales pipeline (partner_requests / LEAD_STAGES) ---
  const leads = (leadsRes.data || []) as Array<{ status: string | null; created_at: string }>
  const by_stage: Record<string, number> = {}
  let soldTotal = 0
  let lostTotal = 0
  for (const l of leads) {
    const stage = l.status || 'new'
    by_stage[stage] = (by_stage[stage] || 0) + 1
    if (stage === 'sold') soldTotal++
    if (stage === 'lost') lostTotal++
  }
  const decided = soldTotal + lostTotal // leads that have left the open pipeline
  const sales_pipeline: PlatformHealth['sales_pipeline'] = {
    total: leads.length,
    new_7d: leads.filter((l) => l.created_at >= since7d).length,
    by_stage,
    sold_total: soldTotal,
    conversion_pct: decided > 0 ? Math.round((soldTotal / decided) * 100) : 0,
  }

  // --- 13. communications ---
  const commsCallsCount = callsRes.count || 0
  const commsSmsCount = smsRes.count || 0
  const commsEmailCount = emailRes.count || 0
  const commsWebchatCount = webchatRes.count || 0
  const communications: PlatformHealth['communications'] = {
    calls_7d: commsCallsCount,
    sms_7d: commsSmsCount,
    email_7d: commsEmailCount,
    webchats_7d: commsWebchatCount,
    total_7d: commsCallsCount + commsSmsCount + commsEmailCount + commsWebchatCount,
  }

  // --- 12. SEO ---
  const seoRows = (seoRes.data || []) as Array<{ tenant_id: string | null; created_at: string }>
  const rankings = await rankingsPromise
  const seo: PlatformHealth['seo'] = {
    alerts_24h: seoRows.filter((r) => r.created_at >= since24h).length,
    alerts_7d: seoRows.length,
    tenants_affected: new Set(seoRows.map((r) => r.tenant_id).filter(Boolean)).size,
    ...rankings,
  }

  // --- 11. tenant status breakdown ---
  const tenant_status: PlatformHealth['tenant_status'] = { active: 0, setup: 0, suspended: 0, pending: 0, cancelled: 0, other: 0 }
  for (const t of tenants) {
    const s = t.status || 'other'
    if ((TENANT_STATUSES as readonly string[]).includes(s)) {
      tenant_status[s as typeof TENANT_STATUSES[number]]++
    } else {
      tenant_status.other++
    }
  }

  return {
    generated_at: now.toISOString(),
    sales: {
      inquiries_total: inquiriesTotalRes.count || 0,
      inquiries_new_7d: inquiriesNewRes.count || 0,
      prospects_total: prospectsRes.count || 0,
    },
    security: { events_24h: secRes.count || 0 },
    stability: { issues_24h: issues24h, issues_7d: issues.length },
    provisioning: {
      tenants_total: tenants.length,
      no_sms,
      no_email,
      no_payments,
      fully_unprovisioned,
      by_gap,
    },
    comms: { sent_24h, failed_24h, unknown_24h, success_rate, worst_tenants },
    crons: { silent },
    errors: {
      last_1h: err1hRes.count || 0,
      last_24h: err24hRes.count || 0,
      last_7d: err7dRes.count || 0,
    },
    payments: { stuck_unpaid_24h: stuckUnpaid.length, by_tenant: payments_by_tenant },
    lifecycle: { new_7d, inactive },
    tenants_with_issues,
    recent_issues,
    integrations: {
      swept_at: (integrationsSweptAtRes.data?.[0] as { checked_at: string } | undefined)?.checked_at || null,
      tenants_with_failures: ((integrationsRes.data || []) as Array<{ tenant_name: string; failed: string[] }>).map((r) => ({
        tenant_name: r.tenant_name,
        failed: r.failed,
      })),
    },
    uptime,
    financial,
    sales_pipeline,
    tenant_status,
    seo,
    communications,
  }
}
