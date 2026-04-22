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

    await trackError(error, {
      source: source || 'client',
      tenantId: verifiedTenantId,
      severity: 'high',
      url
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error reporting endpoint failed:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
