import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['scheduled', 'cancelled'],
  scheduled: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: ['paid'],
  cancelled: [],
  no_show: [],
  paid: [],
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const { status } = await request.json()
    const db = tenantDb(tenantId)

    // Get current booking
    const { data: booking } = (await db
      .from('bookings')
      .select('status, team_member_id, start_time')
      .eq('id', id)
      .single()) as { data: { status: string; team_member_id: string | null; start_time: string } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const allowed = VALID_TRANSITIONS[booking.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${booking.status} to ${status}` },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync the mirrored booking-mode deal to match the booking outcome:
    //   scheduled/confirmed/in_progress/completed/paid → sold
    //   cancelled/no_show                              → lost
    // Keyed by booking_id + mode='booking' so only the linked mirror deal
    // moves. Non-blocking: never fail the status change on a deal-sync error.
    const dealStage =
      ['scheduled', 'confirmed', 'in_progress', 'completed', 'paid'].includes(status) ? 'sold'
      : ['cancelled', 'no_show'].includes(status) ? 'lost'
      : null
    if (dealStage) {
      try {
        await db
          .from('deals')
          .update({ stage: dealStage })
          .eq('booking_id', id)
          .eq('mode', 'booking')
      } catch (dealErr) {
        console.error('Deal sync error (non-blocking):', dealErr)
      }
    }

    await audit({ tenantId, action: 'booking.status_changed', entityType: 'booking', entityId: id, details: { from: booking.status, to: status } })

    // A tech assigned to a job that gets cancelled from the admin dashboard
    // was never told — they'd show up to a job that no longer exists. The
    // client-portal self-cancel path (POST /api/portal/bookings/[id]) already
    // fires this same team-member SMS; this is the operator-initiated side
    // of that same gap.
    if (status === 'cancelled' && booking.team_member_id) {
      const bookingDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      try {
        await notify({
          tenantId,
          type: 'booking_cancelled',
          title: 'Job Cancelled',
          message: `Your ${bookingDate} job has been cancelled.`,
          channel: 'sms',
          recipientType: 'team_member',
          recipientId: booking.team_member_id,
          bookingId: id,
        })
      } catch (notifyErr) {
        console.error('Cancellation notify error (non-blocking):', notifyErr)
      }
    }

    // `booking_completed` has been a declared NotificationType since this
    // codebase's beginning, with a real color-badge entry on the admin's own
    // /dashboard/notifications feed — but this is the only route that ever
    // transitions a booking to 'completed', and it never called notify() for
    // it. Same "declared type, real UI, never fired" shape as items
    // (63)/(66)/(67)'s quote-lifecycle gaps in the sales-hub archetype.
    if (status === 'completed') {
      const bookingDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      try {
        await notify({
          tenantId,
          type: 'booking_completed',
          title: 'Job Completed',
          message: `The ${bookingDate} job has been marked completed.`,
          channel: 'email',
          recipientType: 'admin',
          bookingId: id,
        })
      } catch (notifyErr) {
        console.error('Completion notify error (non-blocking):', notifyErr)
      }
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
