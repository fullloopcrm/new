import { NextResponse } from 'next/server'
import { getTenantForRequest } from '@/lib/tenant-query'
import { scoreTeamForBooking } from '@/lib/smart-schedule'

export async function GET(request: Request) {
  const ctx = await getTenantForRequest()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time')
  const duration = searchParams.get('duration')
  const clientAddress = searchParams.get('address')
  const clientId = searchParams.get('client_id')
  const excludeBookingId = searchParams.get('exclude_booking')

  if (!date || !startTime || !clientAddress) {
    return NextResponse.json({ error: 'date, start_time, and address required' }, { status: 400 })
  }

  const scores = await scoreTeamForBooking({
    tenantId: ctx.tenantId,
    date,
    startTime,
    durationHours: duration ? parseFloat(duration) : 2,
    clientAddress,
    clientId: clientId || undefined,
    excludeBookingId: excludeBookingId || undefined,
  })

  return NextResponse.json({ team: scores })
}
