import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
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

  const db = tenantDb(booking.tenant_id)

  // tenantDb().insert() stamps tenant_id from booking.tenant_id itself — no
  // manual field needed, and it can't drift from the booking it's paying out.
  const { data: payoutRow, error: payErr } = await db
    .from('team_member_payouts')
    .insert({
      booking_id: id,
      team_member_id: teamMemberId,
      amount_cents: amountCents,
      status: method,
    })
    .select()
    .single()
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  if (booking.team_member_id === teamMemberId) {
    await db
      .from('bookings')
      .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true, payout: payoutRow })
}
