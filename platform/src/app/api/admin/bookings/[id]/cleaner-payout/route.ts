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

  // Duplicate-submission guard — this route had NONE before: a double-tapped
  // "Pay" button, a client retry after a dropped response, or two staff
  // recording the same payout independently each inserted their own row,
  // double-counting labor cost in every report that sums this table
  // (finance/payroll-prep, finance/summary, finance/year-end-zip, the
  // closeout-summary widget) even though the team member was paid once.
  // Same two-layer shape as record-payment/route.ts:
  //   1. App-level check-then-insert (this SELECT) — closes the common case,
  //      itself racy under true concurrency.
  //   2. DB-backed backstop: a deterministic, time-bucketed idempotency_key
  //      against the partial unique index in
  //      2026_07_16_team_member_payouts_dedup.sql. Catch 23505 below as an
  //      idempotent no-op. Migration + this fix must land together — the
  //      catch is inert until the index actually exists.
  const DEDUP_WINDOW_MS = 20_000
  const dedupWindowStart = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
  const { data: recentDuplicate } = await db
    .from('team_member_payouts')
    .select('id')
    .eq('booking_id', id)
    .eq('team_member_id', teamMemberId)
    .eq('amount_cents', amountCents)
    .eq('status', method)
    .gte('created_at', dedupWindowStart)
    .limit(1)
    .maybeSingle()
  if (recentDuplicate) {
    return NextResponse.json({ ok: true, payout: recentDuplicate, deduped: true })
  }

  const idempotencyKey = `manual-payout-${id}-${teamMemberId}-${amountCents}-${method}-${Math.floor(Date.now() / DEDUP_WINDOW_MS)}`

  // tenantDb().insert() stamps tenant_id from booking.tenant_id itself — no
  // manual field needed, and it can't drift from the booking it's paying out.
  const { data: payoutRow, error: payErr } = await db
    .from('team_member_payouts')
    .insert({
      booking_id: id,
      team_member_id: teamMemberId,
      amount_cents: amountCents,
      status: method,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single()

  // Layer-2 backstop: a truly concurrent resubmission slipped past the
  // layer-1 SELECT above and hit the DB-level unique index instead.
  if (payErr?.code === '23505') {
    const { data: existing } = await db
      .from('team_member_payouts')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    return NextResponse.json({ ok: true, payout: existing, deduped: true })
  }
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  if (booking.team_member_id === teamMemberId) {
    await db
      .from('bookings')
      .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true, payout: payoutRow })
}
