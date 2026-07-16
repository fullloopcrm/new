import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'

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

    // Get current booking
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

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

    // Check-then-act, not atomic: `allowed` above was validated against the
    // status read at the top of this request, but a concurrent status change
    // (PUT /api/bookings/[id], the portal's PUT /api/portal/bookings/[id], a
    // payment webhook) can land between that read and this write. Without
    // re-asserting the pre-read status in THIS update's own WHERE, this write
    // would silently apply a transition that was only ever valid from the
    // STALE status, not the booking's actual current status — and the audit
    // log below would record a false `from` value.
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', booking.status)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'This booking changed status concurrently — refresh and retry' },
        { status: 409 },
      )
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
        await supabaseAdmin
          .from('deals')
          .update({ stage: dealStage })
          .eq('tenant_id', tenantId)
          .eq('booking_id', id)
          .eq('mode', 'booking')
      } catch (dealErr) {
        console.error('Deal sync error (non-blocking):', dealErr)
      }
    }

    await audit({ tenantId, action: 'booking.status_changed', entityType: 'booking', entityId: id, details: { from: booking.status, to: status } })

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
