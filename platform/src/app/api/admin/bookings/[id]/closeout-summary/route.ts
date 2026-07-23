import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { applyDiscount, describeDiscount } from '@/lib/discount'
import { clientBilledHours, cleanerPaidHours, applyTeamMinimum } from '@/lib/billing-hours'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { isNycMaid } from '@/lib/nycmaid/tenant'

// GET /api/admin/bookings/:id/closeout-summary
// Backs the shared /dashboard bookings closeout widget (every tenant's own
// admin, not a platform-super-admin-only surface) -- gated on
// requirePermission, not requireAdmin.
// One-shot aggregation of every fact needed to close out a job:
// time breakdown, bill math (with discounts itemized), every payment row,
// over/under-payment + tip detection, per-team-member share + paid status,
// and the audit trail of SMS sent for the booking. All money values in cents.
//
// Reached from the shared /dashboard bookings closeout widget (every tenant's
// own admin), not just the platform admin panel — must accept a tenant_admin
// session, not requireAdmin()'s super_admin-only token. See schedule-issues
// fix (commit 05176c2f) for the same bug class.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError
  const { tenantId } = tenant

  const { id } = await params

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, status, start_time, end_time, service_type, hourly_rate, pay_rate, team_size, actual_hours, check_in_time, check_out_time, fifteen_min_alert_time, price, team_member_pay, payment_status, payment_method, payment_received_at, team_member_paid, team_member_paid_at, notes, client_id, team_member_id, discount_percent, one_time_credit_cents, one_time_credit_reason, clients(name, email, phone, address), team_members!bookings_team_member_id_fkey(id, name, phone)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: error?.message || 'booking not found' }, { status: 404 })
  }

  // Every child table below is scoped to the booking's OWN tenant via
  // tenantDb(booking.tenant_id) — defense-in-depth so a payments/payouts/
  // sms_logs row can never be attributed to the wrong tenant even though
  // booking_id alone (a UUID) already uniquely identifies the right rows.
  const db = tenantDb(booking.tenant_id)

  // Team (booking_team_members) — pay_rate here is a per-booking override for
  // this specific member; team_members.pay_rate is their standing rate (the
  // field the admin team-profile page actually edits — hourly_rate is not
  // maintained anywhere and must not be used for pay math).
  const { data: teamRows } = await db
    .from('booking_team_members')
    .select('team_member_id, is_lead, position, pay_rate, team_members(id, name, phone, pay_rate)')
    .eq('booking_id', id)
    .eq('tenant_id', tenantId)
    .order('position', { ascending: true })

  const teamMembers: Array<{ team_member_id: string; name: string; phone: string | null; is_lead: boolean; pay_rate: number | null }> = []
  if (teamRows && teamRows.length > 0) {
    for (const r of teamRows) {
      const c = r.team_members as unknown as { id: string; name: string; phone: string | null; pay_rate: number | null } | null
      if (c?.id) teamMembers.push({ team_member_id: c.id, name: c.name, phone: c.phone ?? null, is_lead: r.is_lead, pay_rate: (r.pay_rate as number | null) ?? c.pay_rate ?? null })
    }
  } else if (booking.team_member_id) {
    const c = booking.team_members as unknown as { id: string; name: string; phone: string | null } | null
    if (c?.id) teamMembers.push({ team_member_id: c.id, name: c.name, phone: c.phone, is_lead: true, pay_rate: null })
  }

  const { data: payments } = await db
    .from('payments')
    .select('id, amount_cents, tip_cents, method, stripe_session_id, stripe_payment_intent_id, reference_id, created_at')
    .eq('booking_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  const { data: payouts } = await db
    .from('team_member_payouts')
    .select('id, team_member_id, amount_cents, stripe_transfer_id, stripe_payout_id, instant, created_at, status')
    .eq('booking_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  const { data: smsLog } = await db
    .from('sms_logs')
    .select('id, sms_type, recipient, status, created_at')
    .eq('booking_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  // Time breakdown
  const ci = booking.check_in_time
    ? new Date(((booking.check_in_time as string).endsWith('Z') || (booking.check_in_time as string).includes('+')) ? (booking.check_in_time as string) : booking.check_in_time + 'Z')
    : null
  const co = booking.check_out_time
    ? new Date(((booking.check_out_time as string).endsWith('Z') || (booking.check_out_time as string).includes('+')) ? (booking.check_out_time as string) : booking.check_out_time + 'Z')
    : null
  const rawMinutes = ci ? Math.max(0, ((co || new Date()).getTime() - ci.getTime()) / 60000) : 0
  const halfBlocks = Math.floor(rawMinutes / 30)
  const remainder = rawMinutes - halfBlocks * 30
  const billedBlocks = remainder > 10 ? halfBlocks + 1 : halfBlocks
  const teamSize = Math.max(1, booking.team_size || 1)
  // Client billing rounds up past 10 min; cleaner pay only past 15 min — the
  // same canonical helpers checkout/webhook/30min-alert use, so this summary
  // never drifts from what the client was actually charged or the cleaner
  // actually paid (billing-hours.ts's whole reason for existing).
  const computedHours = ci ? applyTeamMinimum(Math.max(0.5, clientBilledHours(rawMinutes)), teamSize) : (booking.actual_hours || 0)
  const cleanerComputedHours = ci ? applyTeamMinimum(Math.max(0.5, cleanerPaidHours(rawMinutes)), teamSize) : (booking.actual_hours || 0)
  const cap = null as number | null
  const billedHours = (ci && co) ? computedHours : (booking.actual_hours ?? computedHours)
  const cleanerBilledHours = (ci && co) ? cleanerComputedHours : (booking.actual_hours ?? cleanerComputedHours)

  // Bill math
  const hourlyRate = booking.hourly_rate || 79
  const grossCents = Math.round(billedHours * hourlyRate * teamSize * 100)

  // Itemize discounts. Two independent mechanisms feed this list:
  // (1) the admin-set discount stored on discount_percent -- the same column
  //     applyDiscount() uses at payment-processor/Stripe-webhook/checkout time,
  //     so this line always matches what the client is actually charged --
  //     plus the one-time credit, a flat comp that stacks on top.
  // (2) auto-promo text like "[Promo: $X foo discount applied]" written into
  //     notes by SMS/self-booking flows. Self-booking auto-discount is $10
  //     (was mislabeled $20 here -- see /api/team-portal/15min-alert's real
  //     SELF_BOOKING_DISCOUNT constant, the actual amount collected at billing).
  const discounts: Array<{ label: string; cents: number }> = []
  const discountedGrossCents = applyDiscount(grossCents, booking.discount_percent as number | null)
  const customDiscountCents = grossCents - discountedGrossCents
  if (customDiscountCents > 0) {
    discounts.push({ label: describeDiscount(booking.discount_percent as number | null) || 'Discount', cents: customDiscountCents })
  }
  const creditCents = (booking.one_time_credit_cents as number | null) || 0
  if (creditCents > 0) {
    discounts.push({ label: (booking.one_time_credit_reason as string | null) || 'One-time credit', cents: creditCents })
  }
  const noteText = (booking.notes as string) || ''
  const isSelfBooked = /self-booking discount/i.test(noteText)
  if (isSelfBooked) discounts.push({ label: 'Self-booking discount', cents: 1000 })
  const promoRe = /\[Promo:\s*\$(\d+)\s+([^\]]+?)\s+(?:discount\s+)?applied\]/gi
  let m: RegExpExecArray | null
  while ((m = promoRe.exec(noteText)) !== null) {
    const dollars = parseInt(m[1], 10)
    const label = m[2].replace(/\s+/g, ' ').trim()
    discounts.push({ label, cents: dollars * 100 })
  }
  const totalDiscountCents = discounts.reduce((s, d) => s + d.cents, 0)
  const finalCents = Math.max(0, grossCents - totalDiscountCents)
  const ccCents = Math.round(finalCents * 1.04)

  // Payments
  const paidCents = (payments || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  const overpaymentCents = paidCents - finalCents
  const isOverpaid = overpaymentCents > 0
  const isUnderpaid = overpaymentCents < 0
  const tipCents = isOverpaid ? overpaymentCents : 0

  // Per-member payout shares — each team member is paid on THEIR OWN rate,
  // not the lead's. A single stored booking.team_member_pay (from the
  // single-cleaner checkout path) only ever reflects the primary member's
  // rate, so it's used as a fallback for that one member, never copied onto
  // teammates who were never priced against it.
  const clientAddress = (booking.clients as unknown as { address?: string | null } | null)?.address ?? null
  const defaultRate = hourlyRate <= 60 ? 25 : 30
  const applyFloor = isNycMaid(tenantId)
  const tipShareCents = teamSize > 0 ? Math.floor(tipCents / teamSize) : 0
  const tipShareRemainder = tipCents - tipShareCents * teamSize

  const cleanerSummaries = teamMembers.map(member => {
    const rawRate = member.pay_rate ?? (booking.pay_rate as number | null) ?? defaultRate
    const effectiveRate = applyFloor ? effectiveCleanerRate(rawRate, clientAddress) : rawRate
    const base =
      (member.is_lead && teamSize === 1 && booking.team_member_pay)
        ? (booking.team_member_pay as number)
        : Math.round(cleanerBilledHours * effectiveRate * 100)
    const tip = tipShareCents + (member.is_lead ? tipShareRemainder : 0)
    const totalDue = base + tip
    const paidRows = (payouts || []).filter(p => p.team_member_id === member.team_member_id)
    const totalPaid = paidRows.reduce((s, p) => s + (p.amount_cents || 0), 0)
    return {
      cleaner_id: member.team_member_id,
      name: member.name,
      phone: member.phone,
      is_lead: member.is_lead,
      pay_rate: effectiveRate,
      billed_hours: cleanerBilledHours,
      base_cents: base,
      tip_cents: tip,
      total_due_cents: totalDue,
      total_paid_cents: totalPaid,
      outstanding_cents: Math.max(0, totalDue - totalPaid),
      payouts: paidRows,
    }
  })

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      start_time: booking.start_time,
      end_time: booking.end_time,
      service_type: booking.service_type,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      payment_received_at: booking.payment_received_at,
      cleaner_paid: booking.team_member_paid,
      cleaner_paid_at: booking.team_member_paid_at,
      notes: booking.notes,
      client: booking.clients,
    },
    time: {
      check_in: booking.check_in_time,
      check_out: booking.check_out_time,
      raw_minutes: Math.round(rawMinutes),
      half_blocks: halfBlocks,
      remainder_minutes: Math.round(remainder),
      billed_blocks: billedBlocks,
      billed_hours: billedHours,
      max_hours_cap: cap,
      capped_at_max: false,
    },
    bill: {
      hourly_rate: hourlyRate,
      team_size: teamSize,
      gross_cents: grossCents,
      discounts,
      total_discount_cents: totalDiscountCents,
      final_cents: finalCents,
      cc_cents: ccCents,
    },
    payments: payments || [],
    payment_totals: {
      paid_cents: paidCents,
      expected_cents: finalCents,
      overpayment_cents: overpaymentCents,
      is_overpaid: isOverpaid,
      is_underpaid: isUnderpaid,
      tip_cents: tipCents,
    },
    cleaner_payouts: cleanerSummaries,
    sms_log: smsLog || [],
  })
}
