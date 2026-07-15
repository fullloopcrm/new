import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

type BookingWithRelations = {
  check_in_time: string | null
  check_out_time: string | null
  payment_status: string | null
  clients: { name?: string | null } | null
  team_members: { name?: string | null } | null
}

// Admin-side undo of an accidental check-in or check-out (looked up by booking id).
// Ported from nycmaid bookings/[id]/reset, tenant-scoped for FullLoop
// (cleaners -> team_members, tenant_id enforced on read + write).
//   stage: 'check-in'  -> revert to scheduled, clear check_in_time + location + 30-min alert
//   stage: 'check-out' -> revert to in_progress, clear check_out_time + location + actual_hours
//
// SAFETY: undo-checkout is BLOCKED once payment_status === 'paid' — money has
// already moved and texts have gone out; the office handles those manually.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string
  try {
    ({ tenantId } = await getTenantForRequest())
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const stage = body.stage === 'check-out' ? 'check-out' : 'check-in'
  const db = tenantDb(tenantId)

  const { data: booking } = await db
    .from('bookings')
    .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .eq('id', id)
    .single<BookingWithRelations>()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const client = booking.clients
  const member = booking.team_members

  if (stage === 'check-out') {
    if (!booking.check_out_time) {
      return NextResponse.json({ error: 'Not checked out' }, { status: 400 })
    }
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Payment already collected — undo manually; money/texts already went out.' }, { status: 400 })
    }
    const { data, error } = await db
      .from('bookings')
      .update({ status: 'in_progress', check_out_time: null, check_out_location: null, actual_hours: null })
      .eq('id', id)
      .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('notifications').insert({
      type: 'check_out_reset',
      title: 'Check-Out Undone',
      message: `Admin undid check-out for ${client?.name || 'client'} (${member?.name || 'unassigned'})`,
      booking_id: id,
    })
    return NextResponse.json(data)
  }

  // stage === 'check-in'
  if (!booking.check_in_time) {
    return NextResponse.json({ error: 'Not checked in' }, { status: 400 })
  }
  if (booking.check_out_time) {
    return NextResponse.json({ error: 'Undo check-out first' }, { status: 400 })
  }
  const { data, error } = await db
    .from('bookings')
    .update({ status: 'scheduled', check_in_time: null, check_in_location: null, fifteen_min_alert_time: null })
    .eq('id', id)
    .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('notifications').insert({
    type: 'check_in_reset',
    title: 'Check-In Undone',
    message: `Admin undid check-in for ${client?.name || 'client'} (${member?.name || 'unassigned'})`,
    booking_id: id,
  })
  return NextResponse.json(data)
}
