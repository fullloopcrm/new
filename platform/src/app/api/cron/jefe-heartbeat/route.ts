// Jefe heartbeat cron — runs runHeartbeat() on a schedule (vercel.json) and
// pushes unprompted alerts to the group when the platform newly breaks.
// Same CRON_SECRET auth as the other monitoring crons.
import { NextResponse } from 'next/server'
import { runHeartbeat } from '@/lib/jefe/heartbeat'

export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runHeartbeat()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)).slice(0, 300) }, { status: 500 })
  }
}
