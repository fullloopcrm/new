// Jefe — Full Loop's platform GM. Jefe does NOT care about any tenant's revenue,
// clients, or day-to-day operations. Jefe cares about FULL LOOP itself:
//   - growth: the product's own sales pipeline (inquiries / prospects)
//   - security & stability: security events, errors, comms failures
//   - getting ahead of tenant problems BEFORE the tenant notices, so we can
//     reach out and fix them immediately
//
// This is Jefe's data layer. Every signal is platform-wide, with per-tenant
// attribution so Jefe can say "the-florida-maid has 3 comms failures — reach out."
import { supabaseAdmin } from '@/lib/supabase'

// Notification types that represent a PROBLEM worth surfacing to the operator.
export const ISSUE_TYPES = [
  'error',
  'selena_error',
  'comms_fail',
  'comms_monitor_alert',
  'schedule_issue',
  'security',
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
  // 7. SEO (SIGNAL) — the only other place these show up is the manual
  // /admin/seo dashboard, so Jefe is this data's one push-alert path.
  seo: {
    site_down: { domain: string; tenant_name: string }[]
    not_indexed_open: number
    awaiting_grant: { domain: string; tenant_name: string; days_waiting: number }[]
  }
}

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()
// bookings.end_time is `timestamp without time zone` — compare with a tz-less string.
const noTz = (iso: string) => iso.replace('T', ' ').replace('Z', '')
const hasValue = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim().length > 0

// Cron-silence checks — mirrors src/app/api/cron/health-monitor/route.ts. A cron
// that writes a known side-effect (notification type / email subject) for ANY
// tenant counts as alive; silence platform-wide means the cron itself is down.
type CronSource = 'notifications' | 'email_logs' | 'seo_properties'
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
  // seo-ingest writes last_ingest_at on every property it touches; if the whole
  // pipeline (ingest/detect/technical/health) goes dark, this is the one shared
  // side-effect all of them ultimately depend on refreshing daily.
  { cron: 'seo-ingest', source: 'seo_properties', match: {}, maxSilenceMin: 30 * 60 },
]

const CRON_SOURCE_TS_COLUMN: Record<CronSource, string> = {
  notifications: 'created_at',
  email_logs: 'created_at',
  seo_properties: 'last_ingest_at',
}

async function lastCronOccurrence(check: CronCheck): Promise<Date | null> {
  const tsCol = CRON_SOURCE_TS_COLUMN[check.source]
  let query = supabaseAdmin
    .from(check.source)
    .select(tsCol)
    .not(tsCol, 'is', null)
    .order(tsCol, { ascending: false })
    .limit(1)
  for (const [k, v] of Object.entries(check.match)) {
    if (k === 'subject') query = query.ilike(k, `%${v}%`)
    else query = query.eq(k, v)
  }
  const { data, error } = await query
  if (error || !data || data.length === 0) return null
  const ts = (data[0] as unknown as Record<string, string>)[tsCol]
  return ts ? new Date(ts) : null
}

// Most CRON_CHECKS are single-column `notifications.type` lookups that only
// differ by which type they're looking for. Firing one Supabase round-trip
// per check (up to 10) fans out a lot of concurrent connections for one page
// load; batching the `notifications`-by-type checks into a single query cuts
// that fan-out without changing the per-check result.
async function resolveCronLasts(checks: readonly CronCheck[]): Promise<(Date | null)[]> {
  const isBatchableType = (c: CronCheck) =>
    c.source === 'notifications' && Object.keys(c.match).length === 1 && 'type' in c.match

  const batchable = checks.map((c, i) => ({ c, i })).filter(({ c }) => isBatchableType(c))
  const individual = checks.map((c, i) => ({ c, i })).filter(({ c }) => !isBatchableType(c))

  const results: (Date | null)[] = new Array(checks.length).fill(null)

  const [batchRes, ...individualResults] = await Promise.all([
    batchable.length > 0
      ? supabaseAdmin
          .from('notifications')
          .select('type, created_at')
          .in('type', batchable.map(({ c }) => c.match.type))
          .order('created_at', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] as { type: string; created_at: string }[], error: null }),
    ...individual.map(({ c }) => lastCronOccurrence(c)),
  ])

  if (!batchRes.error && batchRes.data) {
    const latestByType = new Map<string, Date>()
    for (const row of batchRes.data as Array<{ type: string; created_at: string }>) {
      if (!latestByType.has(row.type)) latestByType.set(row.type, new Date(row.created_at))
    }
    for (const { c, i } of batchable) {
      results[i] = latestByType.get(c.match.type) ?? null
    }
  }

  individual.forEach(({ i }, idx) => {
    results[i] = individualResults[idx] as Date | null
  })

  return results
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
}

export async function getPlatformHealth(now: Date = new Date()): Promise<PlatformHealth> {
  const since7d = hoursAgo(now, 24 * 7)
  const since24h = hoursAgo(now, 24)
  const since1h = hoursAgo(now, 1)
  const stuckBefore = noTz(hoursAgo(now, 24)) // ended >24h ago
  const stuckAfter = noTz(hoursAgo(now, 24 * 30)) // bounded to last 30d so "stuck" stays a recent signal

  const [
    tenantsRes,
    issuesRes,
    inquiriesTotalRes,
    inquiriesNewRes,
    prospectsRes,
    secRes,
    commsRes,
    errLogs7dRes,
    stuckRes,
    cronLasts,
    seoSiteDownRes,
    seoNotIndexedRes,
    seoAwaitingGrantRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, status, telnyx_api_key, resend_api_key, stripe_api_key, created_at, last_active_at')
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
    // Single bounded fetch covering the widest (7d) window; 1h/24h/7d counts are
    // sliced from it client-side instead of firing 3 separate count round-trips.
    supabaseAdmin.from('error_logs').select('created_at').gte('created_at', since7d),
    supabaseAdmin
      .from('bookings')
      .select('tenant_id, payment_status')
      .eq('status', 'completed')
      .lt('end_time', stuckBefore)
      .gt('end_time', stuckAfter)
      .limit(1000),
    resolveCronLasts(CRON_CHECKS),
    supabaseAdmin
      .from('seo_issues')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
      .select('tenant_id, target_url, detail')
      .eq('status', 'open')
      .eq('type', 'site_down'),
    supabaseAdmin
      .from('seo_issues')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .eq('type', 'not_indexed'),
    supabaseAdmin
      .from('seo_properties')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
      .select('domain, tenant_id, first_seen_at')
      .is('last_ingest_at', null),
  ])

  const errorLogRows = (errLogs7dRes.data || []) as Array<{ created_at: string }>
  const errors = {
    last_1h: errorLogRows.filter((r) => r.created_at >= since1h).length,
    last_24h: errorLogRows.filter((r) => r.created_at >= since24h).length,
    last_7d: errorLogRows.length,
  }

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
  const stuck = (stuckRes.data || []) as Array<{ tenant_id: string | null; payment_status: string | null }>
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

  // --- 7. seo (SIGNAL) ---
  const seoSiteDown = (seoSiteDownRes.data || []) as Array<{ tenant_id: string | null; target_url: string | null; detail: unknown }>
  const site_down = seoSiteDown.map((r) => {
    let domain = r.target_url || 'unknown'
    try {
      if (r.target_url) domain = new URL(r.target_url).hostname
    } catch {
      // target_url wasn't a full URL — fall back to the raw value above
    }
    return { domain, tenant_name: r.tenant_id ? nameById.get(r.tenant_id) || 'unknown tenant' : 'unlinked' }
  })

  // Give a freshly-activated tenant a few days before flagging the GSC grant
  // as neglected — the grant is a manual Jeff/ops step, not instant.
  const grantGraceCutoff = hoursAgo(now, 24 * 3)
  const seoAwaitingGrant = (seoAwaitingGrantRes.data || []) as Array<{ domain: string | null; tenant_id: string | null; first_seen_at: string | null }>
  const awaiting_grant = seoAwaitingGrant
    .filter((r) => r.first_seen_at && r.first_seen_at < grantGraceCutoff)
    .map((r) => ({
      domain: r.domain || 'unknown',
      tenant_name: r.tenant_id ? nameById.get(r.tenant_id) || 'unknown tenant' : 'unlinked',
      days_waiting: Math.floor((now.getTime() - new Date(r.first_seen_at as string).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.days_waiting - a.days_waiting)

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
    errors,
    payments: { stuck_unpaid_24h: stuckUnpaid.length, by_tenant: payments_by_tenant },
    lifecycle: { new_7d, inactive },
    tenants_with_issues,
    recent_issues,
    seo: {
      site_down,
      not_indexed_open: seoNotIndexedRes.count || 0,
      awaiting_grant,
    },
  }
}
