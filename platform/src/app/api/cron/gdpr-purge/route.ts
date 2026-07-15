import { NextResponse } from 'next/server'
import { purgeDueDeletions } from '@/lib/gdpr-deletion'
import { safeEqual } from '@/lib/timing-safe-equal'

export const maxDuration = 300

// Daily GDPR/CCPA purge — anonymizes any deletion request whose 30-day grace
// period has elapsed. See src/lib/gdpr-deletion.ts for the purge logic.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { purged, errors } = await purgeDueDeletions()

  return NextResponse.json({ success: true, purged, errors })
}
