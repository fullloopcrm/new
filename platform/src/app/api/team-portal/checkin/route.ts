import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'
import { formatET } from '@/lib/dates'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id, lat, lng } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  // Verify booking belongs to this team member
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, status, team_member_id, start_time, check_in_time')
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .single()

  if (!booking || booking.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Block double check-in
  if (booking.check_in_time) {
    return NextResponse.json({ error: 'Already checked in' }, { status: 400 })
  }

  // Block check-in on future bookings (compare date in ET)
  const todayET = formatET(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })
  const bookingDateET = formatET(booking.start_time, { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (bookingDateET > todayET) {
    return NextResponse.json({ error: 'Cannot check in to a future booking' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      check_in_time: new Date().toISOString(),
      check_in_lat: lat || null,
      check_in_lng: lng || null,
      status: 'in_progress',
    })
    .eq('id', booking_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ booking: data })
}
