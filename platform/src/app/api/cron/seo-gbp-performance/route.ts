import { NextResponse } from 'next/server'
import { runGbpPerformanceScan } from '@/lib/seo/gbp-performance'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL Google Business Profile performance scan (Phase 2). Pulls daily
// search/maps views, calls, direction requests, and website clicks per
// connected location, upserting a trailing window so late-arriving Google
// revisions correct prior rows. Not yet wired into vercel.json — runs on
// manual invocation until scheduled as part of cron consolidation.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  const url = new URL(request.url)
  const windowDays = Number(url.searchParams.get('days')) || undefined
  try {
    const result = await runGbpPerformanceScan({ windowDays })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
