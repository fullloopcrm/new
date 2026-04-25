import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { scoreTeamForBooking } from '@/lib/smart-schedule'

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

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
