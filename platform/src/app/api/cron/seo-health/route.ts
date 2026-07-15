import { NextResponse } from 'next/server'

// STUB: @/lib/seo/health (runFleetHealth) was never built — this route was never
// wired into vercel.json crons, so nothing invokes it today. Left as a 501 rather
// than deleting the route, pending a decision on whether to build seomgr fleet-health.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: false, error: 'not implemented: seo/health module was never built' }, { status: 501 })
}
