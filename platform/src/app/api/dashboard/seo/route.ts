// Tenant-facing SEO summary — health + a plain-language weekly activity feed.
// Deliberately thin: everything here is translated to plain language before it
// leaves this route. Never forward raw seo_issues.detail, seo_changes.rationale,
// recipe/tier/field names, or anything else that names backend mechanics
// (safety-gate/autopilot/cron) or competitors. tenantDb() auto-scopes every
// query to the caller's own tenant_id — see tenant-db.ts.
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

type HealthStatus = 'up' | 'down'

interface HealthSummary {
  status: HealthStatus
  lastChecked: string | null
}

interface ActivityItem {
  id: string
  text: string
  date: string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Plain-language translation for every `field` value seo_changes actually
// writes today (see remediate.ts, competitor-remediate.ts, enrich.ts). Falls
// back to a generic sentence for any future field so a schema change here
// degrades gracefully instead of leaking a raw field name.
function describeChange(field: string | null, targetUrl: string | null): string {
  const url = targetUrl || 'a page on your site'
  switch (field) {
    case 'title':
      return `Improved the page title for ${url}`
    case 'meta_description':
      return `Improved the search description for ${url}`
    case 'enrichment':
      return `Added more detail to the content on ${url}`
    default:
      return `Made an SEO improvement to ${url}`
  }
}

async function loadHealth(db: ReturnType<typeof tenantDb>): Promise<HealthSummary> {
  // health.ts's runFleetHealth() deletes every 'site_down' row and re-inserts
  // only what's currently down — it never writes a resolved_at, so "up" has no
  // persisted last-checked timestamp to read. Show what's actually knowable:
  // an open row means down (detected_at = last time it was seen down); no row
  // means up, with no fabricated check time.
  const { data, error } = await db
    .from('seo_issues')
    .select('detected_at')
    .eq('type', 'site_down')
    .order('detected_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`seo_issues query failed: ${error.message}`)

  const row = data?.[0] as { detected_at: string } | undefined
  if (row) return { status: 'down', lastChecked: row.detected_at }
  return { status: 'up', lastChecked: null }
}

async function loadActivity(db: ReturnType<typeof tenantDb>): Promise<ActivityItem[]> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()
  // Only 'applied' | 'verified' — a tenant should never see proposed/approved/
  // rejected/failed/rolled_back rows, those are pipeline states, not outcomes.
  const { data, error } = await db
    .from('seo_changes')
    .select('id,target_url,field,applied_at')
    .in('status', ['applied', 'verified'])
    .gte('applied_at', since)
    .order('applied_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`seo_changes query failed: ${error.message}`)

  return (data ?? []).map((c: { id: string; target_url: string | null; field: string | null; applied_at: string }) => ({
    id: c.id,
    text: describeChange(c.field, c.target_url),
    date: c.applied_at,
  }))
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    const [health, activity] = await Promise.all([loadHealth(db), loadActivity(db)])

    return NextResponse.json({ health, activity })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
