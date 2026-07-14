// Jefe heartbeat cron — runs runHeartbeat() on a schedule (vercel.json) and
// pushes unprompted alerts to the group when the platform newly breaks.
// Same CRON_SECRET auth as the other monitoring crons.
import { NextResponse } from 'next/server'
import { runHeartbeat } from '@/lib/jefe/heartbeat'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const result = await runHeartbeat()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)).slice(0, 300) }, { status: 500 })
  }
}
