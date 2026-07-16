// seomgr — Jefe/Telegram alerting for critical seo_issues. The fleet health
// watchdog (health.ts) and the (upcoming) indexation-cliff detector write
// critical seo_issues rows, but nothing told a human — the dashboard is
// pull, not push. This closes that gap: diff the currently-open critical
// issues against the last alerted snapshot and page Jeff via alertOwner()
// for whatever is NEW. Mirrors jefe/heartbeat.ts's dedup shape (state in a
// snapshot table, alert only on fresh fingerprints) so a site that stays
// down for days pages once, not on every cron tick.
import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'

// Issue types severe enough to page Jeff directly instead of waiting for the
// seomgr dashboard: a dead site (health.ts) or a mass deindexation (the
// indexation-cliff detector). Both are platform-level, FL-admin-engine
// signals keyed by property/domain, not tenant — same access model as the
// rest of seo_issues' consumers.
const CRITICAL_TYPES = ['site_down', 'index_cliff']

interface CriticalIssueRow {
  property: string
  type: string
  severity: string
  target_url: string | null
  detail: Record<string, unknown> | null
}

function fingerprint(issue: Pick<CriticalIssueRow, 'property' | 'type'>): string {
  return `${issue.type}:${issue.property}`
}

function describe(issue: CriticalIssueRow): string {
  const detail = issue.detail ?? {}
  if (issue.type === 'site_down') {
    const status = detail.http_status ?? 'unreachable'
    const vercelError = detail.vercel_error ? ` (${detail.vercel_error})` : ''
    return `SITE DOWN: ${issue.property} — HTTP ${status}${vercelError}`
  }
  if (issue.type === 'index_cliff') {
    const from = detail.prev_indexed ?? '?'
    const to = detail.current_indexed ?? '?'
    return `INDEX CLIFF: ${issue.property} — indexed pages ${from} → ${to}`
  }
  return `${issue.type.toUpperCase()}: ${issue.property}`
}

export interface SeoAlertResult {
  checked: number
  active: number
  new: number
  sent: boolean
  send_ok?: boolean
}

/**
 * Diff open critical seo_issues (site_down, index_cliff) against the last
 * alerted snapshot and push anything NEW to Jeff's Jefe/Telegram channel.
 * An issue that stays open across runs alerts once; if it resolves (row
 * disappears from the open set) and later reopens, that fingerprint is
 * treated as new again.
 */
export async function checkCriticalSeoAlerts(): Promise<SeoAlertResult> {
  const { data, error } = await supabaseAdmin
    .from('seo_issues') // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .select('property,type,severity,target_url,detail')
    .eq('status', 'open')
    .in('type', CRITICAL_TYPES)
  if (error) throw new Error(`seo_issues query failed: ${error.message}`)

  const issues = (data ?? []) as CriticalIssueRow[]

  const { data: lastRows } = await supabaseAdmin
    .from('seo_alert_snapshots')
    .select('active_fingerprints')
    .order('created_at', { ascending: false })
    .limit(1)
  const prevFps = new Set<string>((lastRows?.[0]?.active_fingerprints as string[] | null) ?? [])

  const currentFps = issues.map(fingerprint)
  const newIssues = issues.filter((issue) => !prevFps.has(fingerprint(issue)))

  await supabaseAdmin.from('seo_alert_snapshots').insert({ active_fingerprints: currentFps })

  if (newIssues.length === 0) {
    return { checked: issues.length, active: issues.length, new: 0, sent: false }
  }

  const lines = newIssues.map((i) => `• ${describe(i)}`).join('\n')
  const subject = `🔴 seomgr — ${newIssues.length} new critical issue${newIssues.length > 1 ? 's' : ''}`
  const send = await alertOwner(subject, lines)

  return { checked: issues.length, active: issues.length, new: newIssues.length, sent: send !== null, send_ok: send?.ok }
}
