import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { rating, comment, booking_id, anonymous } = await request.json().catch(() => ({}))

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

  // The client-facing copy ("your feedback is anonymous") was previously
  // unconditional on both web and mobile, but every submission has always
  // attached client_id (and booking_id, which an admin can trace back to a
  // client just as easily) — a real gap between what clients were told and
  // what actually happened. anonymous=true now genuinely omits both rather
  // than just not displaying them; client_id is nullable (verified against
  // the live PostgREST schema before writing this, not assumed).
  const isAnonymous = anonymous === true

  const { data, error } = await db
    .from('reviews')
    .insert({
      client_id: isAnonymous ? null : auth.id,
      booking_id: isAnonymous ? null : ownedBookingId,
      rating: rating || null,
      comment: comment || null,
      source: 'internal',
      status: 'collected',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }

  return NextResponse.json({ review: data }, { status: 201 })
})
