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
    // Atomic re-check: the payment_status==='paid' guard above read a plain
    // SELECT snapshot. A concurrent payment (webhook, admin mark-paid) landing
    // in the gap between that read and this write would otherwise still let
    // the undo through, silently reverting an already-paid booking back to
    // in_progress with no matching refund/payroll reconciliation — exactly
    // the harm this route's own safety comment says is blocked. Mirrors the
    // atomic-claim guard already applied elsewhere on this booking-mutation
    // surface this session.
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'in_progress', check_out_time: null, check_out_location: null, actual_hours: null })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .neq('payment_status', 'paid')
      .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) {
      return NextResponse.json({ error: 'Undo failed — payment was collected concurrently; undo manually.' }, { status: 409 })
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
  // Atomic re-check: the check_out_time guard above read a plain SELECT
  // snapshot. A concurrent check-out landing in the gap between that read and
  // this write would otherwise still let the undo through, clearing
  // check_in_time/status back to 'scheduled' while check_out_time (and its
  // actual_hours/payment data) from the concurrent write stays in place --
  // an inconsistent booking that looks unstarted but is already checked out.
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'scheduled', check_in_time: null, check_in_location: null, fifteen_min_alert_time: null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .is('check_out_time', null)
    .select('*, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: 'Undo failed — booking was checked out concurrently; undo check-out first.' }, { status: 409 })
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
