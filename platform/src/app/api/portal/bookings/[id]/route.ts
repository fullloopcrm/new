import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../../auth/token'
import { notify } from '@/lib/notify'

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

  // Get old booking for notification context
  const { data: oldBooking } = await tenantDb(auth.tid)
    .from('bookings')
    .select('start_time, end_time, team_member_id, clients(name)')
    .eq('id', id)
    .eq('client_id', auth.id)
    .single()

  if (!oldBooking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
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
    await tenantDb(auth.tid).from('notifications').insert({
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

    await tenantDb(auth.tid).from('notifications').insert({
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
