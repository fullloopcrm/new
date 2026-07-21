/**
 * Crew-facing checklist — view and check off items for the booking they're
 * on. Bearer-token auth (team portal). Crew can toggle `done`; adding/removing
 * items stays office-only.
 *
 * GET   ?booking_id=UUID → { items }
 * PATCH { item_id, done } → { item }
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'

async function ownedBooking(db: ReturnType<typeof tenantDb>, bookingId: string, teamMemberId: string) {
  const { data: booking } = await db.from('bookings').select('id, job_id, team_member_id').eq('id', bookingId).single()
  if (!booking || booking.team_member_id !== teamMemberId) return null
  return booking
}

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const db = tenantDb(auth.tid)
  const booking = await ownedBooking(db, bookingId, auth.id)
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const q = booking.job_id
    ? db.from('job_checklist_items').select('*').eq('job_id', booking.job_id).order('sort_order')
    : db.from('job_checklist_items').select('*').eq('booking_id', bookingId).order('sort_order')
  const { data: items, error } = await q
  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })

  return NextResponse.json({ items: items ?? [] })
}

export async function PATCH(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { item_id, booking_id, done } = await request.json().catch(() => ({}))
  if (!item_id || !booking_id || typeof done !== 'boolean') {
    return NextResponse.json({ error: 'item_id, booking_id, done required' }, { status: 400 })
  }

  const db = tenantDb(auth.tid)
  const booking = await ownedBooking(db, booking_id, auth.id)
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Scope the update to items that actually belong to this booking's job/visit —
  // team_member_id ownership on the booking isn't enough on its own since item_id
  // is caller-supplied.
  let q = db.from('job_checklist_items').update({ done, done_at: done ? new Date().toISOString() : null, done_by: auth.id }).eq('id', item_id)
  q = booking.job_id ? q.eq('job_id', booking.job_id) : q.eq('booking_id', booking_id)
  const { data: item, error } = await q.select('*').single()
  if (error || !item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ item })
}
