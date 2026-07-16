import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { postPayrollToLedger } from '@/lib/finance/post-labor'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant

    // Get all team members
    const { data: team } = await supabaseAdmin
      .from('team_members')
      .select('id, name, pay_rate, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Get completed unpaid bookings for each
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id, check_in_time, check_out_time, pay_rate')
      .eq('tenant_id', tenantId)
      .in('status', ['completed'])

    const payroll = (team || []).map((member) => {
      const memberBookings = (bookings || []).filter((b) => b.team_member_id === member.id)
      let pendingHours = 0
      let pendingPay = 0
      memberBookings.forEach((b) => {
        if (b.check_in_time && b.check_out_time) {
          const hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
          pendingHours += hours
          pendingPay += hours * (b.pay_rate || member.pay_rate || 0)
        }
      })
      return {
        ...member,
        pending_hours: Math.round(pendingHours * 100) / 100,
        pending_pay: Math.round(pendingPay * 100) / 100,
        jobs: memberBookings.length,
      }
    })

    return NextResponse.json({ payroll })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('finance.payroll')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { team_member_id, amount, method, period_start, period_end } = await request.json()
    const amountCents = Math.round(amount * 100)

    // Duplicate-submission guard -- this route had NONE before: a
    // double-tapped "Record Payment" button or a client retry after a
    // dropped response each inserted their own payroll_payments row. Worse
    // than the team_member_payouts case this mirrors (2026_07_16
    // cleaner-payout fix): postPayrollToLedger() below is idempotent PER
    // ROW (by this row's own id as the journal source_id), so a duplicate
    // row doesn't just inflate a report -- it posts a SECOND balanced
    // journal entry, double-booking real labor expense on the P&L. Same
    // two-layer shape as cleaner-payout/record-payment:
    //   1. App-level check-then-insert (this SELECT) -- closes the common
    //      case, itself racy under true concurrency.
    //   2. DB-backed backstop: a deterministic, time-bucketed
    //      idempotency_key against the partial unique index in
    //      2026_07_16_payroll_payments_dedup.sql. Catch 23505 below as an
    //      idempotent no-op. Migration + this fix must land together -- the
    //      catch is inert until the index actually exists.
    const DEDUP_WINDOW_MS = 20_000
    const dedupWindowStart = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    const { data: recentDuplicate } = await supabaseAdmin
      .from('payroll_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', team_member_id)
      .eq('amount', amountCents)
      .eq('method', method)
      .gte('created_at', dedupWindowStart)
      .limit(1)
      .maybeSingle()
    if (recentDuplicate) {
      return NextResponse.json({ payment: recentDuplicate, deduped: true }, { status: 201 })
    }

    const idempotencyKey = `manual-payroll-${tenantId}-${team_member_id}-${amountCents}-${method}-${period_start}-${period_end}-${Math.floor(Date.now() / DEDUP_WINDOW_MS)}`

    const { data, error } = await supabaseAdmin
      .from('payroll_payments')
      .insert({
        tenant_id: tenantId,
        team_member_id,
        amount: amountCents,
        method,
        period_start,
        period_end,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single()

    // Layer-2 backstop: a truly concurrent resubmission slipped past the
    // layer-1 SELECT above and hit the DB-level unique index instead.
    if (error?.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('payroll_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      return NextResponse.json({ payment: existing, deduped: true }, { status: 201 })
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post the wage payment to the ledger (account by HR employment type).
    if (data?.id) {
      postPayrollToLedger({ tenantId, payrollPaymentId: data.id })
        .catch(err => console.error('[payroll] ledger post failed:', err))
    }

    // Mark related bookings as paid
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'paid' })
      .eq('tenant_id', tenantId)
      .eq('team_member_id', team_member_id)
      .eq('status', 'completed')

    return NextResponse.json({ payment: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
