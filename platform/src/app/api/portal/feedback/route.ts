import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/token'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { rating, comment, booking_id } = await request.json().catch(() => ({}))

  // A client-supplied booking_id must belong to this client — otherwise a
  // logged-in client could attach their review to another client's booking
  // within the same tenant (tenantDb only scopes by tenant_id, not owner).
  let verifiedBookingId: string | null = null
  if (booking_id) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('id', booking_id)
      .eq('tenant_id', auth.tid)
      .eq('client_id', auth.id)
      .maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    verifiedBookingId = booking.id
  }

  const { data, error } = await tenantDb(auth.tid)
    .from('reviews')
    .insert({
      client_id: auth.id,
      booking_id: verifiedBookingId,
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
