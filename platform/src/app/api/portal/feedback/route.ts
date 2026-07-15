import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { rating, comment, booking_id } = await request.json().catch(() => ({}))

  const db = tenantDb(auth.tid)

  // booking_id is caller-supplied — verify it's actually this client's own
  // booking for this tenant before attaching it, otherwise a forged id would
  // let a review reference another tenant's (or another client's) booking.
  let ownedBookingId: string | null = null
  if (booking_id) {
    const { data: booking } = await db
      .from('bookings')
      .select('id')
      .eq('id', booking_id)
      .eq('client_id', auth.id)
      .maybeSingle()
    ownedBookingId = booking?.id || null
  }

  const { data, error } = await db
    .from('reviews')
    .insert({
      client_id: auth.id,
      booking_id: ownedBookingId,
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
