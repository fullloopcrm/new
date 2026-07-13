import { NextResponse } from 'next/server'
import { runAutopilot } from '@/lib/seo/autopilot'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// SIGNAL autopilot — daily canary auto-apply of gated Tier-1 title/meta fixes.
// No-op unless SEO_AUTOPILOT_ENABLED=true. Every change clears the safety gate;
// per site it applies at most a few new pages and stays under a weekly rate cap.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const result = await runAutopilot()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
