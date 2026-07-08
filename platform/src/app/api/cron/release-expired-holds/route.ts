/**
 * Cron: auto-release expired territory soft-holds.
 * A pending reservation whose hold window has passed is deleted, freeing the
 * (territory, category) for someone else. Keeps the exclusivity ledger honest
 * so a dropped deal doesn't lock a territory forever.
 */
import { NextResponse } from 'next/server'
import { releaseExpiredHolds } from '@/lib/territories/data'

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const released = await releaseExpiredHolds()
  return NextResponse.json({ ok: true, released })
}
