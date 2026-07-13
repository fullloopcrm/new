import { NextResponse } from 'next/server'
import { detectAllProperties } from '@/lib/seo/detect'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// SIGNAL detection cron — classifies per-page telemetry into typed, tiered
// opportunities in seo_issues. Read-only against sites; writes only seo_issues.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const summary = await detectAllProperties()
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
