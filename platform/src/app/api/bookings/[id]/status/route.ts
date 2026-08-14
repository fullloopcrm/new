import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { applyStatusChangeSideEffects } from '@/lib/booking-cancel'

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
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  {
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const { status } = await request.json()

    // Get current booking
    const { data: booking } = (await db
      .from('bookings')
      .select('status, client_id, start_time, service_type, clients(name, phone, email)')
      .eq('id', id)
      .single()) as {
        data: {
          status: string
          client_id: string | null
          start_time: string
          service_type: string | null
          clients: { name?: string | null; phone?: string | null; email?: string | null } | null
        } | null
      }

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

    // Finance correctness, deal-stage sync, client cancellation notify, and
    // the audit log all live in booking-cancel.ts now — shared with the
    // automated duplicate-booking guardrail (duplicate-bookings.ts), which
    // needs the exact same correctness but skips the client-facing notify
    // (the client is still served by the surviving duplicate).
    await applyStatusChangeSideEffects({
      tenantId,
      bookingId: id,
      fromStatus: booking.status,
      toStatus: status,
      booking,
      notifyClient: true,
    })

    return NextResponse.json({ booking: data })
  }
}
