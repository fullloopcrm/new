import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

// POST /api/admin/bookings/:id/cleaner-payout
// Backs the shared /dashboard bookings closeout widget (every tenant's own
// admin) -- gated on requirePermission, not requireAdmin.
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

  const db = tenantDb(booking.tenant_id)

  // team_member_id is a cross-table FK — confirm it belongs to this tenant
  // before inserting the payout row, or a caller could attribute a payout to
  // another tenant's team member and corrupt that tenant's payout records.
  const { data: teamMember } = await db.from('team_members').select('id').eq('id', teamMemberId).maybeSingle()
  if (!teamMember) return NextResponse.json({ error: 'Invalid cleaner_id' }, { status: 400 })

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
      .eq('tenant_id', tenantId)
  }

  return NextResponse.json({ ok: true, payout: payoutRow })
}
