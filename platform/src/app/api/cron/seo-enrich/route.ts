import { NextResponse } from 'next/server'
import { generateEnrichments } from '@/lib/seo/enrich'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL content enrichment — weekly. Drafts page-specific content for the
// highest-value deep_underperformer pages, grounded in each tenant's own
// authored business knowledge, gated by a content-quality check. Writes ONLY
// proposals (seo_changes field='enrichment', status='proposed'); nothing is
// applied to a live page — content stays human-reviewed.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 100)
  try {
    const result = await generateEnrichments({ limit })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
