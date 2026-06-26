import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'
import { parseTimestamp } from '@/lib/dates'
import { clientBilledHours, cleanerPaidHours } from '@/lib/billing-hours'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id, lat, lng } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  // Get booking with check-in time + the fields needed to compute the bill.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, check_in_time, hourly_rate, pay_rate, team_size, max_hours, price, team_member_id, team_members(pay_rate)')
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .single()

  if (!booking || booking.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Compute the bill at checkout (the 30-min alert + Stripe webhook rely on these
  // persisted values). Client billed hours round up past 10 min; cleaner paid
  // hours past 15 min (billing-hours grace windows). Honor a client max_hours cap.
  const checkOutTime = new Date()
  let actualHours: number | null = null
  let teamMemberPayCents: number | null = null
  let updatedPriceCents: number | null = (booking.price as number) ?? null
  let hoursWorked = 0

  const checkInParsed = booking.check_in_time ? parseTimestamp(booking.check_in_time as string) : null
  if (checkInParsed) {
    const rawMinutes = Math.max(0, (checkOutTime.getTime() - checkInParsed.getTime()) / 60000)
    hoursWorked = rawMinutes / 60
    const clientHours = clientBilledHours(rawMinutes)
    const cleanerHours = cleanerPaidHours(rawMinutes)
    const cap = typeof booking.max_hours === 'number' && booking.max_hours > 0 ? (booking.max_hours as number) : null
    const billableClient = cap != null ? Math.min(clientHours, cap) : clientHours
    const billableCleaner = cap != null ? Math.min(cleanerHours, cap) : cleanerHours
    actualHours = billableClient
    const member = booking.team_members as unknown as { pay_rate?: number | null } | null
    const cleanerRate = member?.pay_rate || (booking.pay_rate as number) || 25
    const clientRate = (booking.hourly_rate as number) || 69
    const teamSize = Math.max(1, (booking.team_size as number) || 1)
    teamMemberPayCents = Math.round(billableCleaner * cleanerRate * 100)
    updatedPriceCents = Math.round(billableClient * clientRate * teamSize * 100)
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      check_out_time: checkOutTime.toISOString(),
      check_out_lat: lat || null,
      check_out_lng: lng || null,
      status: 'completed',
      actual_hours: actualHours,
      team_member_pay: teamMemberPayCents,
      price: updatedPriceCents,
    })
    .eq('id', booking_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    booking: data,
    hours_worked: Math.round(hoursWorked * 100) / 100,
    billed_hours: actualHours,
    client_total: updatedPriceCents != null ? Math.round(updatedPriceCents) / 100 : null,
    earnings: teamMemberPayCents != null ? Math.round(teamMemberPayCents) / 100 : 0,
    gps: { lat, lng },
  })
}
