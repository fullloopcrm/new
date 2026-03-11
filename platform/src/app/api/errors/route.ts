import { NextResponse } from 'next/server'
import { trackError } from '@/lib/error-tracking'

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
    const body = await request.json()
    const { message, stack, url, source, tenantId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const isTransient = IGNORABLE_PATTERNS.some(p => message.includes(p))

    if (isTransient) {
      console.log(`[TRANSIENT] ${source}: ${message.slice(0, 100)}`)
      return NextResponse.json({ success: true })
    }

    const error = new Error(message)
    if (stack) error.stack = stack

    await trackError(error, {
      source: source || 'client',
      tenantId: tenantId || undefined,
      severity: 'high',
      url
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error reporting endpoint failed:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
