import { NextResponse } from 'next/server'
import { sendSeoAlertDigest } from '@/lib/seo/alert-digest'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Daily owner-facing digest for SEO issues that otherwise only ever surface
// in /admin/seo. Real-time site-down alerting already exists via
// cron/tenant-health (Fortress, every 15 min) -- this covers the slower
// "daily digest" cadence for the rest (currently: not_indexed).
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const result = await sendSeoAlertDigest()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
