import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runIndexCliffScan } from '@/lib/seo/index-cliff'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// SIGNAL indexation-cliff scan — standalone re-run of index_cliff detection
// against whatever seo_sitemaps already has persisted (no fresh GSC call, so
// this is free to run more often than the weekly seo-technical scan that
// populates seo_sitemaps). Wired into vercel.json weekly, an hour after
// seo-technical (Tue 7am) repopulates seo_sitemaps.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const result = await runIndexCliffScan()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
