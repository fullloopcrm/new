/**
 * Cron: sweep every tenant's Telnyx/Resend/Stripe (+ tenant-level Anthropic
 * override) keys for live validity. Persists into jefe_integration_health;
 * Jefe's get_platform_health reads that table rather than running these
 * checks itself (too slow/costly to run on every chat turn).
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { sweepIntegrationHealth } from '@/lib/jefe/integration-health'

export const maxDuration = 60

export async function GET(request: Request) {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  try {
    const summary = await sweepIntegrationHealth()
    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
