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

    // Get completed unpaid bookings for each. Exclude bookings already
    // settled out-of-band (team_member_paid, e.g. a manual Zelle/cash payout
    // recorded via /api/admin/bookings/[id]/cleaner-payout) — otherwise their
    // hours/pay still show as pending here and a normal payroll run below
    // double-pays the team member for work already compensated.
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id, check_in_time, check_out_time, pay_rate')
      .eq('tenant_id', tenantId)
      .in('status', ['completed'])
      .or('team_member_paid.is.null,team_member_paid.eq.false')

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
