import { NextResponse } from 'next/server'
import { runGbpProfileScan } from '@/lib/seo/gbp'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL Google Business Profile drift monitor. Reads Business Information
// (name/phone/address/hours/categories) for each tenant with a connected
// Google account, diffs against the last snapshot, and fires a notification
// on real change. Not yet wired into vercel.json — runs on manual invocation
// until scheduled as part of cron consolidation.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const result = await runGbpProfileScan()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
