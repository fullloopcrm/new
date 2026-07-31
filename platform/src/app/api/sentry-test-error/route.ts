import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

// Temporary verification route for the 2026-07-31 Sentry install — hit this
// once to confirm real events reach the Sentry dashboard, then remove it.
export async function GET() {
  try {
    throw new Error(`Sentry verification test error — ${new Date().toISOString()}`)
  } catch (e) {
    Sentry.captureException(e)
    await Sentry.flush(2000)
    return NextResponse.json({ ok: true, message: 'Test error sent to Sentry' })
  }
}
