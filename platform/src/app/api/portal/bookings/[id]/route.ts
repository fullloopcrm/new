import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../../auth/token'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'

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

  // Every reschedule/cancel fires a real SMS to the assigned team member plus
  // an admin email with no other cap -- without this, looping the endpoint is
  // unmetered SMS/email-cost-abuse. Same pattern as team-portal/running-late.
  const rl = await rateLimitDb(`portal-booking-update:${auth.id}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { start_time, end_time, notes, status, special_instructions } = body

  // Get old booking for notification context
  const { data: oldBooking } = await tenantDb(auth.tid)
    .from('bookings')
    .select('status, start_time, end_time, team_member_id, clients(name)')
    .eq('id', id)
    .eq('client_id', auth.id)
    .single()

  if (!oldBooking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Mirror the staff-side state machine (bookings/[id]/status): once a job is
  // completed or paid it's a terminal state — no self-service cancel. Without
  // this, a client could flip an already-completed/paid booking straight to
  // 'cancelled' with no refund/payroll reconciliation, since this endpoint
  // has no downstream accounting effect of its own.
  const NON_CANCELLABLE_STATUSES = ['completed', 'paid', 'cancelled', 'no_show']
  if (status === 'cancelled' && NON_CANCELLABLE_STATUSES.includes(oldBooking.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a booking that is already ${oldBooking.status}` },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = {}
  if (start_time) update.start_time = start_time
  if (end_time) update.end_time = end_time
  if (notes !== undefined) update.notes = notes
  if (special_instructions !== undefined) update.special_instructions = special_instructions
  if (status === 'cancelled') update.status = 'cancelled'

  const { data, error } = await tenantDb(auth.tid)
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

  // Notifications for reschedule
  if (start_time && start_time !== oldBooking.start_time) {
    const oldDate = new Date(oldBooking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const newDate = new Date(start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const newTime = new Date(start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    // Admin notification
    await tenantDb(auth.tid)
      .from('notifications') // tenant-scope-ok: tenantDb() stamps tenant_id on insert; audit heuristic doesn't parse the wrapper
      .insert({
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
    const bookingDate = new Date(oldBooking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    await tenantDb(auth.tid)
      .from('notifications') // tenant-scope-ok: tenantDb() stamps tenant_id on insert; audit heuristic doesn't parse the wrapper
      .insert({
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
