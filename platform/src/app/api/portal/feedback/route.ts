import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/token'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { rating, comment, booking_id } = await request.json().catch(() => ({}))

  // booking_id is a caller-supplied FK with no cross-tenant check at the DB
  // layer — verify it belongs to this tenant before trusting it (same class
  // already guarded for client_id on POST /api/reviews).
  if (booking_id) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('id', booking_id)
      .eq('tenant_id', auth.tid)
      .single()
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      tenant_id: auth.tid,
      client_id: auth.id,
      booking_id: booking_id || null,
      rating: rating || null,
      comment: comment || null,
      source: 'internal',
      status: 'collected',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data }, { status: 201 })
}
