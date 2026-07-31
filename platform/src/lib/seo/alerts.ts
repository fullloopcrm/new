// ---------------------------------------------------------------------------
// SIGNAL — owner alerting for critical/high open seo_issues.
//
// Real gap this closes (found 2026-07-31 during crm-03 re-verification):
// seo-health, seo-detect, seo-technical, and now seo-index-cliff all WRITE
// real findings into seo_issues (including 'critical' severity ones like
// site_down), but nothing ever actively pushed a critical finding anywhere.
// The admin SEO dashboard (src/app/admin/seo/page.tsx) is pull-only -- if
// nobody opens it, a critical issue (a tenant's whole domain going DNS-dead)
// can sit open for days with zero notification. Concretely proven live:
// fladumpsterrentals.com's site_down issue (detected 2026-07-31, DNS
// resolution failure) had no alert of any kind.
//
// Reuses the platform's existing, already-authorized owner-alert pipeline
// (trackError -> alertOwner Telegram always, + alertOwnerCritical SMS to the
// owner's own phone for severity:'critical') -- the same mechanism
// cron/system-check, cron/tenant-health, and cron/comms-monitor already fire
// unattended, every run, with no new alert channel introduced here. This is
// an ADMIN/OWNER notification only -- it never contacts a tenant, client, or
// lead, so it does not touch the no-client-SMS restriction that governs
// this codebase's other messaging.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'

export type SeoAlertSummary = { checked: number; alerted: number }

type OpenIssue = {
  id: string
  property: string
  tenant_id: string | null
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  target_url: string | null
  detail: Record<string, unknown> | null
}

/**
 * Pages the owner for every currently-open critical/high seo_issues row.
 * trackError already de-dupes the error_logs row itself (same
 * source+message within 24h bumps occurrence_count instead of inserting a
 * new row) and rate-limits the actual Telegram/SMS SEND per cold start --
 * on this cron's weekly cadence that's the right behavior: a still-open
 * critical issue gets re-alerted weekly (a real "this is STILL broken"
 * signal), not spammed every run.
 */
export async function runSeoAlerts(): Promise<SeoAlertSummary> {
  const { data, error } = await supabaseAdmin
    .from('seo_issues')
    .select('id, property, tenant_id, type, severity, target_url, detail')
    .eq('status', 'open')
    .in('severity', ['critical', 'high'])
    .limit(200)
  if (error) throw new Error(error.message)

  const issues = (data || []) as OpenIssue[]

  for (const issue of issues) {
    const detailText = issue.detail ? JSON.stringify(issue.detail).slice(0, 400) : ''
    const label = `SEO ${issue.type}: ${issue.property}${issue.target_url ? ` -> ${issue.target_url}` : ''}`
    await trackError(new Error(label), {
      source: 'cron/seo-alerts',
      severity: issue.severity === 'critical' ? 'critical' : 'high',
      tenantId: issue.tenant_id || undefined,
      extra: detailText,
    })
  }

  return { checked: issues.length, alerted: issues.length }
}
