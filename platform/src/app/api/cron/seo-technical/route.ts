import { NextResponse } from 'next/server'
import { runTechnicalScan } from '@/lib/seo/technical'
import { safeEqual } from '@/lib/secret-compare'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL technical scan — daily (matches ingest/detect cadence so not_indexed
// stays as fresh as deep_underperformer/striking_distance; URL Inspection quota
// is ~2k/day/property and this uses 20/day, so daily is well within budget).
// Reads sitemaps + inspects a budgeted set of URLs per property (URL Inspection
// API) and opens 'not_indexed' issues for pages the site wants indexed but
// Google isn't. Read-only against GSC; writes seo_sitemaps / seo_url_status /
// seo_issues.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const propertyLimit = Number(url.searchParams.get('properties')) || undefined
  try {
    const result = await runTechnicalScan({ propertyLimit })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
