/**
 * Per-cleaner "what's actually still owed on this booking" — the same math
 * the /dashboard Close-Out panel's closeout-summary route computes for its
 * cleaner_payouts field, extracted so a second consumer (the
 * cleaner-payout-sweep cron) can never drift from it. Moved verbatim, not
 * reimplemented: same billing-hours helpers, same tip-split rule, same
 * team_member_pay-wins-for-solo-lead shortcut.
 *
 * Deliberately narrower than the full closeout-summary response — this only
 * answers "who's still owed money and how much," not the itemized client
 * bill (discounts, gross, cc fees) closeout-summary also returns for the UI.
 */
import { supabaseAdmin } from '../supabase'
import { tenantDb } from '../tenant-db'
import { tenantClient } from '../tenant-supabase'
import { cleanerPaidHours, applyTeamMinimum } from '../billing-hours'
import { effectiveCleanerRate } from '../cleaner-pay'
import { isNycMaid } from '../nycmaid/tenant'

export interface CleanerOutstanding {
  cleanerId: string
  name: string
  phone: string | null
  isLead: boolean
  stripeAccountId: string | null
  globalPayoutsRecipientId: string | null
  totalDueCents: number
  totalPaidCents: number
  outstandingCents: number
}

export async function computeCleanerOutstanding(tenantId: string, bookingId: string): Promise<CleanerOutstanding[]> {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, hourly_rate, pay_rate, team_size, actual_hours, check_in_time, check_out_time, team_member_pay, client_id, team_member_id, clients(address), team_members!bookings_team_member_id_fkey(id, name, phone, pay_rate, stripe_account_id, global_payouts_recipient_id)')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()
  if (!booking) return []

  const db = tenantDb(tenantId)

  const { data: teamRows } = await db
    .from('booking_team_members')
    .select('team_member_id, is_lead, team_members(id, name, phone, pay_rate, stripe_account_id, global_payouts_recipient_id)')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
    .order('position', { ascending: true })

  type Member = { team_member_id: string; name: string; phone: string | null; is_lead: boolean; pay_rate: number | null; stripe_account_id: string | null; global_payouts_recipient_id: string | null }
  const teamMembers: Member[] = []
  if (teamRows && teamRows.length > 0) {
    for (const r of teamRows) {
      const c = r.team_members as unknown as { id: string; name: string; phone: string | null; pay_rate: number | null; stripe_account_id: string | null; global_payouts_recipient_id: string | null } | null
      if (c?.id) teamMembers.push({ team_member_id: c.id, name: c.name, phone: c.phone ?? null, is_lead: r.is_lead, pay_rate: c.pay_rate ?? null, stripe_account_id: c.stripe_account_id ?? null, global_payouts_recipient_id: c.global_payouts_recipient_id ?? null })
    }
  } else if (booking.team_member_id) {
    const c = booking.team_members as unknown as { id: string; name: string; phone: string | null; pay_rate: number | null; stripe_account_id: string | null; global_payouts_recipient_id: string | null } | null
    if (c?.id) teamMembers.push({ team_member_id: c.id, name: c.name, phone: c.phone, is_lead: true, pay_rate: c.pay_rate ?? null, stripe_account_id: c.stripe_account_id ?? null, global_payouts_recipient_id: c.global_payouts_recipient_id ?? null })
  }
  if (teamMembers.length === 0) return []

  const { data: payments } = await (await tenantClient(tenantId))
    .from('payments')
    .select('tip_cents')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)

  const { data: payouts } = await db
    .from('team_member_payouts')
    .select('team_member_id, amount_cents')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)

  const ci = booking.check_in_time
    ? new Date(((booking.check_in_time as string).endsWith('Z') || (booking.check_in_time as string).includes('+')) ? (booking.check_in_time as string) : booking.check_in_time + 'Z')
    : null
  const co = booking.check_out_time
    ? new Date(((booking.check_out_time as string).endsWith('Z') || (booking.check_out_time as string).includes('+')) ? (booking.check_out_time as string) : booking.check_out_time + 'Z')
    : null
  const rawMinutes = ci ? Math.max(0, ((co || new Date()).getTime() - ci.getTime()) / 60000) : 0
  const teamSize = Math.max(1, booking.team_size || 1)
  const cleanerComputedHours = ci ? applyTeamMinimum(Math.max(0.5, cleanerPaidHours(rawMinutes)), teamSize) : (booking.actual_hours || 0)
  const cleanerBilledHours = (ci && co) ? cleanerComputedHours : (booking.actual_hours ?? cleanerComputedHours)

  const tipCents = (payments || []).reduce((s, p) => s + ((p.tip_cents as number | null) || 0), 0)
  const clientAddress = (booking.clients as unknown as { address?: string | null } | null)?.address ?? null
  const defaultRate = (booking.hourly_rate || 79) <= 60 ? 25 : 30
  const applyFloor = isNycMaid(tenantId)
  const tipShareCents = teamSize > 0 ? Math.floor(tipCents / teamSize) : 0
  const tipShareRemainder = tipCents - tipShareCents * teamSize

  return teamMembers.map(member => {
    const rawRate = member.pay_rate ?? (booking.pay_rate as number | null) ?? defaultRate
    const effectiveRate = applyFloor ? effectiveCleanerRate(rawRate, clientAddress) : rawRate
    const base =
      (member.is_lead && teamSize === 1 && booking.team_member_pay)
        ? (booking.team_member_pay as number)
        : Math.round(cleanerBilledHours * effectiveRate * 100)
    const tip = tipShareCents + (member.is_lead ? tipShareRemainder : 0)
    const totalDue = base + tip
    const totalPaid = (payouts || []).filter(p => p.team_member_id === member.team_member_id).reduce((s, p) => s + ((p.amount_cents as number | null) || 0), 0)
    return {
      cleanerId: member.team_member_id,
      name: member.name,
      phone: member.phone,
      isLead: member.is_lead,
      stripeAccountId: member.stripe_account_id,
      globalPayoutsRecipientId: member.global_payouts_recipient_id,
      totalDueCents: totalDue,
      totalPaidCents: totalPaid,
      outstandingCents: Math.max(0, totalDue - totalPaid),
    }
  })
}
