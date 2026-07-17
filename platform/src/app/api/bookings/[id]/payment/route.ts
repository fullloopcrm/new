import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const { payment_status, payment_method, tip_amount, team_paid, team_pay, actual_hours } = await request.json()

    const update: Record<string, unknown> = {}
    if (payment_status) update.payment_status = payment_status
    if (payment_method) update.payment_method = payment_method
    if (tip_amount !== undefined) update.tip_amount = tip_amount
    if (actual_hours !== undefined) update.actual_hours = actual_hours
    if (team_pay !== undefined) {
      update.team_pay = team_pay
      // Mirror onto team_member_pay -- the amount field every finance/payroll
      // report actually sums (payroll-prep, payroll, pnl, cleaner-income,
      // tax-export, summary all read team_member_pay; none read team_pay).
      // team_paid already mirrors onto team_member_paid below; the amount
      // itself never did, so a job whose pay was only ever recorded through
      // this page showed $0/null everywhere payroll actually looks.
      update.team_member_pay = team_pay
    }
    if (team_paid !== undefined) {
      update.team_paid = team_paid
      // Mirror onto team_member_paid/team_member_paid_at — the fields
      // GET /api/finance/payroll actually filters "already settled
      // out-of-band" bookings on (its own comment: "otherwise... a normal
      // payroll run below double-pays the team member"). This route's
      // team_paid/team_pay pair (migration 009) predates that field and was
      // never wired to it, so clicking this page's "Mark Team Paid" button —
      // which tells the admin the job is "Fully closed out" — left the
      // booking fully eligible to be claimed and paid again by a real
      // payroll run or /api/admin/bookings/[id]/cleaner-payout, which is
      // exactly the double-pay this second flag was supposed to prevent.
      // Only mirrors forward (false -> true). Unsetting team_paid never
      // clears team_member_paid back down — that flag may reflect a real,
      // separately-recorded payout (cleaner-payout's team_member_payouts
      // row), which this generic toggle has no business undoing.
      if (team_paid) {
        update.team_paid_at = new Date().toISOString()
        update.team_member_paid = true
        update.team_member_paid_at = update.team_paid_at as string
      }
    }
    if (payment_status === 'paid') {
      update.payment_date = new Date().toISOString()
      update.status = 'paid'
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(update)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (payment_status === 'paid') {
      await audit({ tenantId, action: 'payment.marked_paid', entityType: 'payment', entityId: id, details: { payment_method: payment_method || null, tip_amount: tip_amount ?? null } })
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
