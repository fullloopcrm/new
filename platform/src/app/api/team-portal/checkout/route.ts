import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id, lat, lng } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  // Get booking with check-in time
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, check_in_time, pay_rate, team_member_id')
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .single()

  if (!booking || booking.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const checkOutTime = new Date()
  let hoursWorked = 0
  let earnings = 0

  if (booking.check_in_time) {
    hoursWorked = (checkOutTime.getTime() - new Date(booking.check_in_time).getTime()) / 3600000
    if (booking.pay_rate) {
      earnings = hoursWorked * booking.pay_rate
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      check_out_time: checkOutTime.toISOString(),
      check_out_lat: lat || null,
      check_out_lng: lng || null,
      status: 'completed',
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
    earnings: Math.round(earnings * 100) / 100,
    gps: { lat, lng },
  })
}
