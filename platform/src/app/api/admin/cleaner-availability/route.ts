import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { checkCleanerAvailability } from '@/lib/nycmaid/availability'

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time') || '09:00'
  const duration = Math.min(Math.max(parseInt(searchParams.get('duration') || '2') || 2, 1), 8)
  const excludeBooking = searchParams.get('exclude_booking') || undefined

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  }

  const cleaners = await checkCleanerAvailability(date, startTime, duration, excludeBooking)
  return NextResponse.json({ cleaners })
}
