// ---------------------------------------------------------------------------
// Owner-facing SEO alert digest — closes the gap where seo_issues only ever
// surfaced in /admin/seo. Real-time site-down alerting already exists via
// cron/tenant-health (Fortress, every 15 min, alertOwner) -- that's a live
// reachability check, strictly faster and higher-fidelity than anything GSC's
// crawl-based signals could offer, so it is reused as-is and not duplicated
// here. This covers the slower-moving cadence: today just 'not_indexed', the
// seo_issues type that maps directly to the raw Google Search Console emails
// Jeff is currently getting flooded with.
//
// Each issue is alerted exactly once (notified_at marks it sent) rather than
// re-sent every day it stays open. The weekly seo-technical rescan deletes +
// reinserts the whole open not_indexed set fresh each run (see
// runTechnicalScan in ./technical), so a page still broken next week arrives
// as a genuinely new row and gets re-flagged -- that's the intended "still
// open" signal, not daily spam of the same page.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'

// The two types the LEADER's minimum bar names. site_down deliberately isn't
// here -- see file header. Only not_indexed exists as a real seo_issues type
// today; site_down is listed for documentation/intent, not because a
// detector emits it (none does).
const ALERT_TYPES: string[] = ['not_indexed']

const MAX_ISSUES_PER_DIGEST = 40
const URLS_SHOWN_PER_PROPERTY = 5

type PendingIssue = {
  id: string
  property: string
  target_url: string | null
  detail: { coverage_state?: string | null } | null
}

export type SeoAlertDigestResult = {
  sent: boolean
  issueCount: number
  propertyCount: number
}

function formatProperty(property: string, issues: PendingIssue[]): string {
  const shown = issues.slice(0, URLS_SHOWN_PER_PROPERTY).map(
    (i) => `  • ${i.target_url ?? '(unknown url)'} — ${i.detail?.coverage_state ?? 'not indexed'}`,
  )
  const remaining = issues.length - shown.length
  const more = remaining > 0 ? `\n  …and ${remaining} more` : ''
  return `${property} (${issues.length})\n${shown.join('\n')}${more}`
}

export async function sendSeoAlertDigest(): Promise<SeoAlertDigestResult> {
  const { data, error } = await supabaseAdmin
    .from('seo_issues') // tenant-scope-ok: platform-wide admin digest to Jeff via alertOwner (Telegram), never tenant-facing -- same cross-tenant aggregate pattern as /admin/seo
    .select('id, property, target_url, detail')
    .eq('status', 'open')
    .in('type', ALERT_TYPES)
    .is('notified_at', null)
    .limit(MAX_ISSUES_PER_DIGEST)
  if (error) throw new Error(error.message)

  const issues = (data ?? []) as PendingIssue[]
  if (issues.length === 0) return { sent: false, issueCount: 0, propertyCount: 0 }

  const byProperty = new Map<string, PendingIssue[]>()
  for (const issue of issues) {
    const list = byProperty.get(issue.property) ?? []
    list.push(issue)
    byProperty.set(issue.property, list)
  }

  const body = [...byProperty.entries()]
    .map(([property, propIssues]) => formatProperty(property, propIssues))
    .join('\n\n')

  await alertOwner(
    `📉 SIGNAL: ${issues.length} page${issues.length === 1 ? '' : 's'} not indexed by Google`,
    body,
  )

  await supabaseAdmin
    .from('seo_issues')
    .update({ notified_at: new Date().toISOString() })
    .in('id', issues.map((i) => i.id))

  return { sent: true, issueCount: issues.length, propertyCount: byProperty.size }
}
