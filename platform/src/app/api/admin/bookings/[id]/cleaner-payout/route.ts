import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

// POST /api/admin/bookings/:id/cleaner-payout
// Manual team-member payout (Zelle / Venmo / CashApp / cash / other) for a
// single team member on a single booking. Inserts team_member_payouts row
// and, if the team member is the booking lead, flips bookings.team_member_paid.
//
// Reached from the shared /dashboard bookings closeout widget (every tenant's
// own admin), not just the platform admin panel — must accept a tenant_admin
// session, not requireAdmin()'s super_admin-only token. See schedule-issues
// fix (commit 05176c2f) for the same bug class.
//
// body: { cleaner_id: string, amount_cents: number, method: 'zelle'|'venmo'|'cashapp'|'cash'|'other' }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant

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
    .eq('tenant_id', tenantId)
    .single()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('id', teamMemberId)
    .eq('tenant_id', tenantId)
    .single()
  if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

  const { data: payoutRow, error: payErr } = await supabaseAdmin
    .from('team_member_payouts')
    .insert({
      tenant_id: tenantId,
      booking_id: id,
      team_member_id: teamMemberId,
      amount_cents: amountCents,
      status: method,
    })
    .select()
    .single()
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  if (booking.team_member_id === teamMemberId) {
    await supabaseAdmin
      .from('bookings')
      .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
  }

  return NextResponse.json({ ok: true, payout: payoutRow })
}
