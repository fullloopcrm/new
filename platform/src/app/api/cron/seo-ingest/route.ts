import { NextResponse } from 'next/server'
import { ingestAllProperties } from '@/lib/seo/ingest'
import { backfillUntrackedDomains } from '@/lib/seo/onboarding'
import { safeEqual } from '@/lib/timing-safe-equal'

// gsc.ts signs a JWT with node:crypto — must run on the Node runtime, not edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL Phase 1 ingest cron. Pulls Search Analytics for every granted GSC
// property into seo_metrics (dual-intent tagged). Read-only against the sites;
// writes only to the seo_* tables via the service role.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Allow ?days=90 for a deeper backfill on first run.
  const url = new URL(request.url)
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 480)

  try {
    // backfillUntrackedDomains() was previously wired to nothing (test-only,
    // dead code) -- a tenant live only via tenant_domains/tenants.domain and
    // never GSC-discovered (e.g. onboarded before this hook existed, or
    // pre-cutover) stayed permanently untracked in seo_properties. Runs first
    // so any newly-registered awaiting_grant property is visible immediately;
    // it can't pull metrics until GSC access is separately granted, but it's
    // no longer invisible to the dashboard/Selena.
    const backfilled = await backfillUntrackedDomains()
    const summary = await ingestAllProperties({ days })
    return NextResponse.json({
      ok: true,
      days,
      backfilled: backfilled.length,
      properties: summary.properties,
      totalRows: summary.totalRows,
      errors: summary.results.filter((r) => r.error),
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
