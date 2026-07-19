import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { scoreRecentConversations } from '@/lib/nycmaid/conversation-scorer'

// Batch-scores conversations the booking-created trigger misses. Under the
// self-book-only strategy (create_booking is owner-only, see selena/tools.ts)
// almost no client SMS/web conversation ever creates a booking through chat
// — it happens on the self-book form instead. The old
// `if (result.bookingCreated)` trigger in src/app/api/yinez/route.ts rarely
// fires anymore, so self-review had gone silently dead. This is the
// catch-all: runs hourly, scores anything settled (no new message in 2+
// hours) that's still unscored. (nycmaid cc92e0e6 parity.)
export async function GET(request: Request) {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  try {
    const result = await scoreRecentConversations()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/score-conversations]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
