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

    // team_member_id is client-supplied — verify it belongs to this tenant before
    // attaching a payroll payment/ledger entry to it (cross-tenant FK injection).
    if (team_member_id) {
      const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('id', team_member_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post the wage payment to the ledger (account by HR employment type).
    if (data?.id) {
      postPayrollToLedger({ tenantId, payrollPaymentId: data.id })
        .catch(err => console.error('[payroll] ledger post failed:', err))
    }

    // notify.ts's own NotificationType union has declared 'payroll_paid' for
    // exactly this event since notify.ts's beginning (and it's listed in the
    // admin docs' own "Notification Types" reference) — no call site here
    // ever used it, so a payroll run left zero trace in the admin's in-app
    // notifications feed. Same declared-but-never-fired class as items
    // (63)/(66)/(67)/(68).
    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId,
        type: 'payroll_paid',
        title: 'Payroll paid',
        message: `$${(Number(amount) || 0).toFixed(2)} paid${method ? ` via ${method}` : ''}`,
        channel: 'email',
        recipientType: 'admin',
        metadata: { payroll_payment_id: data?.id, team_member_id },
      })
    } catch (e) {
      console.warn('notify payroll_paid failed', e)
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
