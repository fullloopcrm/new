import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { ingestAllProperties } from '@/lib/seo/ingest'

// gsc.ts signs a JWT with node:crypto — must run on the Node runtime, not edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL Phase 1 ingest cron. Pulls Search Analytics for every granted GSC
// property into seo_metrics (dual-intent tagged). Read-only against the sites;
// writes only to the seo_* tables via the service role.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  // Allow ?days=90 for a deeper backfill on first run.
  const url = new URL(request.url)
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 480)

  try {
    const summary = await ingestAllProperties({ days })
    return NextResponse.json({
      ok: true,
      days,
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
