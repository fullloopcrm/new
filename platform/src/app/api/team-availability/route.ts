import { NextRequest, NextResponse } from 'next/server'
import { checkTeamAvailability } from '@/lib/availability'
import { getCurrentTenant } from '@/lib/tenant'

/**
 * Admin endpoint — returns per-team-member availability for a specific time slot.
 * GET /api/team-availability?date=2026-03-15&start_time=10:00&duration=3&exclude_booking=uuid
 */
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time') || '09:00'
  const duration = Math.min(Math.max(Number(searchParams.get('duration')) || 2, 1), 8)
  const excludeBooking = searchParams.get('exclude_booking') || undefined

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  const members = await checkTeamAvailability(tenant.id, date, startTime, duration, excludeBooking)
  return NextResponse.json({ members })
}
