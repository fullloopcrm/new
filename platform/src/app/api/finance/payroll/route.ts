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

    if (!team_member_id) {
      return NextResponse.json({ error: 'team_member_id required' }, { status: 400 })
    }

    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', team_member_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

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
        amount: Math.round(amount * 100),
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
