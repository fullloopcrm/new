import { NextResponse } from 'next/server'
import { runVitalsScan } from '@/lib/seo/vitals'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL Core Web Vitals scan. Queries the CrUX API (real-user field data) for
// each enabled property's origin (PHONE + DESKTOP) and its top-impression
// pages (PHONE), appending rows to seo_vitals. Not yet wired into vercel.json —
// runs on manual invocation until scheduled as part of cron consolidation.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  const url = new URL(request.url)
  const propertyLimit = Number(url.searchParams.get('properties')) || undefined
  try {
    const result = await runVitalsScan({ propertyLimit })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
