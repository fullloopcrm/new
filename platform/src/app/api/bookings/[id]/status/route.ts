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

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
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
