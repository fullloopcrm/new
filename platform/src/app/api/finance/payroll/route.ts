import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { postPayrollToLedger } from '@/lib/finance/post-labor'
import { getPendingPayCentsForMember } from '@/lib/finance/payroll-pending'

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

    // Get completed unpaid bookings for each. Excludes team_member_paid=true —
    // this was previously unfiltered (every completed booking counted as
    // "pending" regardless of this flag), which on nycmaid's real data meant
    // the Payroll tab showed $47,820 owed when 609 of 610 completed bookings
    // were already flagged paid (checked out via the bulk closeout action,
    // which sets the flag with no amount recorded but is the only payment
    // signal that exists) — re-paying that would have been a real double-pay.
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id, check_in_time, check_out_time, pay_rate')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('team_member_paid', 'is', true)

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

    if (!team_member_id) {
      return NextResponse.json({ error: 'team_member_id required' }, { status: 400 })
    }

    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id, pay_rate')
      .eq('id', team_member_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    // Snapshot what's actually owed BEFORE recording the payment, so the
    // mark-paid step below can check the payment really covers it. Was
    // previously unconditional -- any payment amount, even a typo far under
    // what's owed, flipped every one of this member's completed bookings to
    // 'paid' with no check, silently erasing the real shortfall from every
    // "pending" view (Payroll tab, finance/summary) with zero trace.
    const pendingCentsBeforePayment = await getPendingPayCentsForMember(tenantId, team_member_id, member.pay_rate)
    const amountCents = Math.round(Number(amount) * 100)
    const coversFullAmountOwed = amountCents >= pendingCentsBeforePayment - 1 // -1c float-rounding tolerance

    // Double-submit guard: a duplicate POST (double-click, client retry) for the
    // same member + pay period must not create a second payroll_payments row --
    // each row gets its own id, so postPayrollToLedger's (source='payroll',
    // source_id=row.id) dedup can't catch it downstream; the worker would be
    // paid and booked twice. Only dedup when both period bounds are supplied,
    // matching the partial unique index in migration 062.
    if (period_start && period_end) {
      const { data: dupe } = await supabaseAdmin
        .from('payroll_payments')
        .select()
        .eq('tenant_id', tenantId)
        .eq('team_member_id', team_member_id)
        .eq('period_start', period_start)
        .eq('period_end', period_end)
        .maybeSingle()
      if (dupe) {
        return NextResponse.json({ payment: dupe, duplicate: true }, { status: 200 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('payroll_payments')
      .insert({
        tenant_id: tenantId,
        team_member_id,
        amount: amountCents,
        method,
        period_start,
        period_end,
      })
      .select()
      .single()

    if (error) {
      // Concurrency backstop for the check-then-insert guard above: two
      // simultaneous submits can both pass the SELECT before either INSERT
      // lands. Migration 062's unique index makes the loser's insert raise a
      // unique violation (23505); resolve it to the winner's row instead of
      // erroring, same pattern as postJournalEntry's 23505 handling.
      if ((error as { code?: string }).code === '23505' && period_start && period_end) {
        const { data: existing } = await supabaseAdmin
          .from('payroll_payments')
          .select()
          .eq('tenant_id', tenantId)
          .eq('team_member_id', team_member_id)
          .eq('period_start', period_start)
          .eq('period_end', period_end)
          .maybeSingle()
        if (existing) {
          return NextResponse.json({ payment: existing, duplicate: true }, { status: 200 })
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post the wage payment to the ledger (account by HR employment type).
    if (data?.id) {
      postPayrollToLedger({ tenantId, payrollPaymentId: data.id })
        .catch(err => console.error('[payroll] ledger post failed:', err))
    }

    // Mark related bookings as paid -- ONLY when this payment actually covers
    // what was owed. A partial payment still gets recorded and posted to the
    // ledger above (it's real money, it happened), but bookings stay
    // 'completed' so the real remaining balance keeps showing as pending
    // instead of silently disappearing.
    if (coversFullAmountOwed) {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'paid' })
        .eq('tenant_id', tenantId)
        .eq('team_member_id', team_member_id)
        .eq('status', 'completed')
    }

    return NextResponse.json({ payment: data, bookings_marked_paid: coversFullAmountOwed }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
