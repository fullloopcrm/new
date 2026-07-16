import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

// POST /api/admin/bookings/:id/cleaner-payout
// Manual team-member payout (Zelle / Venmo / CashApp / cash / other) for a
// single team member on a single booking. Inserts team_member_payouts row
// and, if the team member is the booking lead, flips bookings.team_member_paid.
//
// body: { cleaner_id: string, amount_cents: number, method: 'zelle'|'venmo'|'cashapp'|'cash'|'other' }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await req.json()
  const teamMemberId: string | undefined = body.cleaner_id || body.team_member_id
  const amountCents: number | undefined = body.amount_cents
  const method: string = body.method || 'other'

  if (!teamMemberId || typeof amountCents !== 'number' || amountCents <= 0) {
    return NextResponse.json({ error: 'cleaner_id and positive amount_cents required' }, { status: 400 })
  }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, team_member_id')
    .eq('id', id)
    .single()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // When paying the booking's lead team member, this is the same
  // team_member_paid flag guarded by an atomic claim everywhere else money
  // moves for a booking (payment-processor.ts, webhooks/stripe/route.ts).
  // This endpoint used to insert the payout row and blindly set the flag
  // with no check on its current value — a double-submit, two admins acting
  // concurrently, or a booking already auto-paid via Stripe Connect could
  // all record a second real payout here with no warning. Claim first, same
  // as the other two payout paths; only insert the payout row if we win it.
  if (booking.team_member_id === teamMemberId) {
    const { data: claimRows } = await supabaseAdmin
      .from('bookings')
      .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
      .eq('id', id)
      .or('team_member_paid.is.null,team_member_paid.eq.false')
      .select('id')
    if (!claimRows || claimRows.length === 0) {
      return NextResponse.json({ error: 'This booking is already marked paid out.' }, { status: 409 })
    }
  }

  const { data: payoutRow, error: payErr } = await supabaseAdmin
    .from('team_member_payouts')
    .insert({
      tenant_id: booking.tenant_id,
      booking_id: id,
      team_member_id: teamMemberId,
      amount_cents: amountCents,
      status: method,
    })
    .select()
    .single()
  if (payErr) {
    // Payout row failed to insert after we already claimed team_member_paid
    // above — release the claim so this doesn't look permanently paid-out
    // with nothing recorded.
    if (booking.team_member_id === teamMemberId) {
      await supabaseAdmin
        .from('bookings')
        .update({ team_member_paid: false, team_member_paid_at: null })
        .eq('id', id)
        .then(() => {}, () => {})
    }
    return NextResponse.json({ error: payErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, payout: payoutRow })
}
