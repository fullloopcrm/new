import { NextResponse } from 'next/server'
import { trackError } from '@/lib/error-tracking'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'

// Known transient/harmless errors that don't need alerts
const IGNORABLE_PATTERNS = [
  'Script error',
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch',
  'Load failed',
  'NetworkError',
  'ResizeObserver loop',
  'AbortError',
  'cancelled',
  'TypeError: cancelled',
  '_leaflet_pos',
  'Minified React error',
  'Hydration failed',
  'Text content does not match',
  'Unable to store cookie',
  '$_Tawk',
  'removeChild',
  'Socket server did not execute',
  'i18next',
  'invalid origin',
]

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`errors:${ip}`, 30, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many reports' }, { status: 429 })
    }

    const body = await request.json()
    const { message, stack, url, source } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Only trust tenant context when the signed header is present. A caller-
    // supplied body.tenantId would let anyone attribute junk errors to any
    // tenant's error dashboard. Unsigned errors fall through as
    // platform-scope (tenantId undefined) and are filed under 'anonymous'.
    const hdrTenantId = request.headers.get('x-tenant-id')
    const sig = request.headers.get('x-tenant-sig')
    const verifiedTenantId = (hdrTenantId && verifyTenantHeaderSig(hdrTenantId, sig)) ? hdrTenantId : undefined

    const isTransient = IGNORABLE_PATTERNS.some(p => message.includes(p))

    if (isTransient) {
      console.info(`[TRANSIENT] ${source}: ${message.slice(0, 100)}`)
      return NextResponse.json({ success: true })
    }

    const error = new Error(message)
    if (stack) error.stack = stack

    // trackError's own Telegram-alert cooldown is keyed by source+message, both
    // caller-supplied on this public unauthenticated endpoint — an attacker can
    // vary either per request to mint a fresh cooldown key every time and spam
    // the owner's Telegram with fabricated "HIGH Error" alerts (up to the 30/min
    // accept-rate above), burying real incident alerts. Gate alert-eligibility
    // on a second, coarser per-IP budget that ignores message content entirely;
    // once it's spent, reports still get logged to error_logs/notifications
    // (nothing is lost) but stop paging the owner.
    const alertRl = await rateLimitDb(`errors-alert:${ip}`, 3, 10 * 60 * 1000)

    await trackError(error, {
      source: source || 'client',
      tenantId: verifiedTenantId,
      severity: alertRl.allowed ? 'high' : 'medium',
      url
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error reporting endpoint failed:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
