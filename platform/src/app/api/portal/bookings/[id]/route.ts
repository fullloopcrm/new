import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../../auth/token'
import { notify } from '@/lib/notify'
import { supabaseAdmin } from '@/lib/supabase'

// Mirrors portal/bookings/[id]/page.tsx's own canReschedule/canCancel gates
// exactly — those only control which buttons render, they were never
// enforced here. Any bearer-token-authenticated client could otherwise PUT
// a new start_time or status:'cancelled' directly at this route regardless
// of the booking's actual status. finance/payroll-prep and
// finance/cleaner-income both filter on `.eq('status', 'completed')`, so
// flipping a completed booking to 'cancelled' silently zeroes out the
// assigned team member's pay for work already done.
const RESCHEDULABLE_STATUSES = ['pending', 'scheduled', 'confirmed']
const CANCELLABLE_STATUSES = ['scheduled', 'confirmed']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { id } = await params

  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name, phone)')
    .eq('id', id)
    .eq('client_id', auth.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ booking: data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { start_time, end_time, notes, status, special_instructions } = body
  const db = tenantDb(auth.tid)

  // Get old booking for notification context
  const { data: oldBooking } = await db
    .from('bookings')
    .select('status, start_time, end_time, team_member_id, clients(name)')
    .eq('id', id)
    .eq('client_id', auth.id)
    .single<{ status: string; start_time: string; end_time: string | null; team_member_id: string | null; clients: { name?: string | null } | null }>()

  if (!oldBooking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if ((start_time || end_time) && !RESCHEDULABLE_STATUSES.includes(oldBooking.status)) {
    return NextResponse.json({ error: 'This booking can no longer be rescheduled' }, { status: 400 })
  }
  if (status === 'cancelled' && !CANCELLABLE_STATUSES.includes(oldBooking.status)) {
    return NextResponse.json({ error: 'This booking can no longer be cancelled' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (start_time) update.start_time = start_time
  if (end_time) update.end_time = end_time
  if (notes !== undefined) update.notes = notes
  if (special_instructions !== undefined) update.special_instructions = special_instructions
  if (status === 'cancelled') update.status = 'cancelled'

  const { data, error } = await db
    .from('bookings')
    .update(update)
    .eq('id', id)
    .eq('client_id', auth.id)
    .select('*, team_members!bookings_team_member_id_fkey(name, phone)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const clientName = (oldBooking.clients as unknown as { name: string } | null)?.name || 'Client'

  // Same timezone-awareness gap as items (70)/(115) — these dates render in
  // the tenant's own zone, not the server runtime default. Only fetched when
  // one of the two notify branches below can actually fire.
  let tz = 'America/New_York'
  if ((start_time && start_time !== oldBooking.start_time) || status === 'cancelled') {
    const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', auth.tid).single()
    tz = tenantRow?.timezone || 'America/New_York'
  }

  // Notifications for reschedule
  if (start_time && start_time !== oldBooking.start_time) {
    const oldDate = new Date(oldBooking.start_time).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
    const newDate = new Date(start_time).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
    const newTime = new Date(start_time).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

    // Admin notification
    await db.from('notifications').insert({
      type: 'reschedule',
      title: 'Client Rescheduled',
      message: `${clientName} moved from ${oldDate} to ${newDate} at ${newTime}`,
      booking_id: id,
      channel: 'in_app',
      status: 'sent',
    })

    // Admin email
    await notify({
      tenantId: auth.tid,
      type: 'booking_reminder',
      title: `Reschedule: ${clientName}`,
      message: `${clientName} rescheduled from ${oldDate} to ${newDate} at ${newTime}`,
      channel: 'email',
      recipientType: 'admin',
      bookingId: id,
    })

    // Team member notification
    if (oldBooking.team_member_id) {
      await notify({
        tenantId: auth.tid,
        type: 'booking_reminder',
        title: 'Job Rescheduled',
        message: `${clientName} moved to ${newDate} at ${newTime}`,
        channel: 'sms',
        recipientType: 'team_member',
        recipientId: oldBooking.team_member_id,
        bookingId: id,
      })
    }
  }

  // Notifications for cancellation
  if (status === 'cancelled') {
    const bookingDate = new Date(oldBooking.start_time).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })

    await db.from('notifications').insert({
      type: 'booking_cancelled',
      title: 'Client Cancelled',
      message: `${clientName} cancelled their ${bookingDate} booking`,
      booking_id: id,
      channel: 'in_app',
      status: 'sent',
    })

    await notify({
      tenantId: auth.tid,
      type: 'booking_cancelled',
      title: `Cancellation: ${clientName}`,
      message: `${clientName} cancelled their ${bookingDate} booking via the portal.`,
      channel: 'email',
      recipientType: 'admin',
      bookingId: id,
    })

    if (oldBooking.team_member_id) {
      await notify({
        tenantId: auth.tid,
        type: 'booking_cancelled',
        title: 'Job Cancelled',
        message: `${clientName}'s ${bookingDate} booking has been cancelled`,
        channel: 'sms',
        recipientType: 'team_member',
        recipientId: oldBooking.team_member_id,
        bookingId: id,
      })
    }
  }

  return NextResponse.json({ booking: data })
}
