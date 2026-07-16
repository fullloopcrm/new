import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

// Admin-side undo of an accidental check-in or check-out (looked up by booking id).
// Ported from nycmaid bookings/[id]/reset, tenant-scoped for FullLoop
// (cleaners -> team_members, tenant_id enforced on read + write).
//   stage: 'check-in'  -> revert to scheduled, clear check_in_time + location + 30-min alert
//   stage: 'check-out' -> revert to in_progress, clear check_out_time + location + actual_hours
//
// SAFETY: undo-checkout is BLOCKED once payment_status === 'paid' — money has
// already moved and texts have gone out; the office handles those manually.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const stage = body.stage === 'check-out' ? 'check-out' : 'check-in'

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const client = booking.clients as unknown as { name?: string } | null
  const member = booking.team_members as unknown as { name?: string } | null

  if (stage === 'check-out') {
    if (!booking.check_out_time) {
      return NextResponse.json({ error: 'Not checked out' }, { status: 400 })
    }
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Payment already collected — undo manually; money/texts already went out.' }, { status: 400 })
    }
    // Check-then-act, not atomic: the payment_status/check_out_time guards above
    // read a stale snapshot -- a concurrent payment (record-payment, Stripe
    // webhook) or another reset request can land in the gap. Re-assert both in
    // THIS update's own WHERE so a payment that just landed can't be silently
    // undone by this reset.
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'in_progress', check_out_time: null, check_out_location: null, actual_hours: null })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('check_out_time', booking.check_out_time)
      // payment_status can be NULL (never billed) -- plain .neq('payment_status',
      // 'paid') would exclude those rows too, since NULL <> 'paid' is NULL, not
      // true, in SQL. Explicitly allow NULL alongside anything not 'paid'.
      .or('payment_status.is.null,payment_status.neq.paid')
      .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) {
      return NextResponse.json(
        { error: 'This booking changed concurrently (e.g. payment landed) — refresh and retry' },
        { status: 409 },
      )
    }
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
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
  // Same TOCTOU class as the check-out branch above: `booking.check_in_time`/
  // `check_out_time` are a stale snapshot -- a concurrent check-out can land
  // between the read and this write. Re-assert both in THIS update's own
  // WHERE so a check-out that just happened can't be silently undone.
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'scheduled', check_in_time: null, check_in_location: null, fifteen_min_alert_time: null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('check_in_time', booking.check_in_time)
    .is('check_out_time', null)
    .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json(
      { error: 'This booking changed concurrently (e.g. checked out) — refresh and retry' },
      { status: 409 },
    )
  }
  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'check_in_reset',
    title: 'Check-In Undone',
    message: `Admin undid check-in for ${client?.name || 'client'} (${member?.name || 'unassigned'})`,
    booking_id: id,
  })
  return NextResponse.json(data)
}
