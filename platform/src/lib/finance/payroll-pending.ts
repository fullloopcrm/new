/**
 * Pending (unpaid) payroll hours/pay for one team member — completed,
 * NOT-YET-marked-paid bookings' check_in/check_out hours × pay rate, same
 * math GET /api/finance/payroll uses for the roster-wide view. Extracted so
 * POST can check "does this payment actually cover what's owed" against the
 * exact same number the admin saw on screen before marking bookings paid.
 *
 * Excludes team_member_paid=true. That flag has no amount or reliable
 * timestamp behind it (the bulk closeout action sets it with neither), but
 * it's the only payment signal that exists anywhere in this data — ignoring
 * it previously showed cleaners as owed money that operationally was
 * already paid (checked against nycmaid production: 609 of 610 completed
 * bookings were already flagged paid; showing them all as pending would
 * have meant paying real money twice).
 */
import { supabaseAdmin } from '@/lib/supabase'

export async function getPendingPayCentsForMember(tenantId: string, teamMemberId: string, memberPayRate: number | null): Promise<number> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('check_in_time, check_out_time, pay_rate')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .eq('status', 'completed')
    .not('team_member_paid', 'is', true)

  let pendingDollars = 0
  for (const b of bookings || []) {
    if (b.check_in_time && b.check_out_time) {
      const hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      pendingDollars += hours * (b.pay_rate || memberPayRate || 0)
    }
  }
  return Math.round(pendingDollars * 100)
}

/**
 * Roster-wide total pending payroll — same source /api/finance/payroll (the
 * Payroll tab) uses, so Finance's "cleaner owed" figure can't disagree with
 * what the Payroll tab shows. See getPendingPayCentsForMember's docstring
 * for why team_member_paid=true is excluded.
 */
export async function getTotalPendingPayrollCents(tenantId: string): Promise<number> {
  const [{ data: team }, { data: bookings }] = await Promise.all([
    supabaseAdmin.from('team_members').select('id, pay_rate').eq('tenant_id', tenantId).eq('status', 'active'),
    supabaseAdmin
      .from('bookings')
      .select('team_member_id, check_in_time, check_out_time, pay_rate')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('team_member_paid', 'is', true),
  ])

  const rateByMember = new Map((team || []).map((m) => [m.id as string, m.pay_rate as number | null]))
  let totalDollars = 0
  for (const b of bookings || []) {
    if (!b.check_in_time || !b.check_out_time) continue
    const hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
    const rate = b.pay_rate || rateByMember.get(b.team_member_id as string) || 0
    totalDollars += hours * rate
  }
  return Math.round(totalDollars * 100)
}

/**
 * Labor cost incurred in [startISO, endISO) — same hours × rate source as
 * getTotalPendingPayrollCents, split into total vs. already-paid. Replaces
 * Finance Overview's weekLabor/monthLabor/yearLabor, which summed the same
 * mostly-unset bookings.team_member_pay column that undercounted
 * pendingCleanerPayments by ~770x on a real tenant (see that fix). Scoped by
 * bookings.start_time, matching how the caller already windows the query.
 */
export async function getLaborCostCentsForPeriod(tenantId: string, startISO: string, endISO: string): Promise<{ totalCents: number; paidCents: number }> {
  const [{ data: team }, { data: bookings }] = await Promise.all([
    supabaseAdmin.from('team_members').select('id, pay_rate').eq('tenant_id', tenantId),
    supabaseAdmin
      .from('bookings')
      .select('team_member_id, check_in_time, check_out_time, pay_rate, team_member_paid')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_time', startISO)
      .lte('start_time', endISO),
  ])

  const rateByMember = new Map((team || []).map((m) => [m.id as string, m.pay_rate as number | null]))
  let totalDollars = 0
  let paidDollars = 0
  for (const b of bookings || []) {
    if (!b.check_in_time || !b.check_out_time) continue
    const hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
    const rate = b.pay_rate || rateByMember.get(b.team_member_id as string) || 0
    const dollars = hours * rate
    totalDollars += dollars
    if (b.team_member_paid) paidDollars += dollars
  }
  return { totalCents: Math.round(totalDollars * 100), paidCents: Math.round(paidDollars * 100) }
}
