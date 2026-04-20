/**
 * GET available team members for a date/time/duration slot.
 * Ported from nycmaid `/api/admin/cleaner-availability`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { checkTeamAvailability } from '@/lib/availability'

export async function GET(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time') || '09:00'
  const duration = Math.min(Math.max(parseInt(searchParams.get('duration') || '2') || 2, 1), 8)
  const excludeBooking = searchParams.get('exclude_booking') || undefined

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  }

  const members = await checkTeamAvailability(tenant.tenantId, date, startTime, duration, excludeBooking)
  return NextResponse.json({ members })
}
