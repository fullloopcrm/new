/**
 * Single shared idempotency key for cleaner (team-member) payouts, keyed on
 * booking_id. Every Stripe Connect payout site must consult this before moving
 * money so one booking pays the cleaner exactly once:
 *   - lib/payment-processor.ts        (Zelle/Venmo/cash + cleaner-checkout path)
 *   - app/api/team-portal/checkout    (calls processPayment)
 *   - app/api/webhooks/stripe         (Stripe-paid booking auto-payout)
 *
 * Two triggers are covered: (a) the same path invoked twice (repeat checkout,
 * webhook retry), (b) two different paths for the same booking (Stripe webhook
 * pays, then the cleaner also reports a method at checkout). Both resolve to the
 * same booking_id, so a payout row for that booking — or bookings.team_member_paid
 * already true — means "done, do not pay again".
 *
 * NOTE: this is a check-before-transfer guard. It fully closes the sequential /
 * retry exploit (and the regression tests below). A truly simultaneous race
 * (two transfers in flight before either inserts its payout row) is caught at
 * the RECORD level by the UNIQUE(tenant_id, booking_id) backstop in
 * migrations/2026_07_11_team_member_payouts_unique.sql; closing the fund-movement
 * race entirely would require claim-before-transfer, flagged for follow-up.
 */
import { supabaseAdmin } from '../supabase'

export async function cleanerAlreadyPaid(tenantId: string, bookingId: string): Promise<boolean> {
  const { data: payout } = await supabaseAdmin
    .from('team_member_payouts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
    .limit(1)
    .maybeSingle()
  if (payout) return true

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('team_member_paid')
    .eq('tenant_id', tenantId)
    .eq('id', bookingId)
    .maybeSingle()
  return booking?.team_member_paid === true
}

export interface PayoutClaim {
  claimed: boolean
  payoutId?: string
}

/**
 * Atomically claim the single payout slot for a booking BEFORE any money moves.
 * Inserts a `pending` team_member_payouts row; the UNIQUE(tenant_id, booking_id)
 * index makes a second concurrent insert conflict → claimed:false, and the caller
 * must NOT transfer. This is what closes the true-concurrency window that a
 * check-before-transfer guard alone cannot: the DB index, not a prior read, is
 * the gate. Finalize the row with finalizeCleanerPayout() after the transfer
 * lands, or releaseCleanerPayout() if it fails.
 */
export async function claimCleanerPayout(opts: {
  tenantId: string
  bookingId: string
  teamMemberId: string
  amountCents: number
  tipCents?: number
}): Promise<PayoutClaim> {
  const { data, error } = await supabaseAdmin
    .from('team_member_payouts')
    .insert({
      tenant_id: opts.tenantId,
      booking_id: opts.bookingId,
      team_member_id: opts.teamMemberId,
      amount_cents: opts.amountCents,
      tip_cents: opts.tipCents ?? 0,
      status: 'pending',
    })
    .select('id')
    .single()
  // A unique-violation (another path already claimed this booking) surfaces as an
  // error here → treat as "not claimed", do not pay.
  if (error || !data) return { claimed: false }
  return { claimed: true, payoutId: data.id as string }
}

/** Finalize a claimed payout row once the Stripe transfer has succeeded. */
export async function finalizeCleanerPayout(opts: {
  tenantId: string
  payoutId: string
  amountCents: number
  tipCents: number
  stripeTransferId: string
  stripePayoutId?: string | null
  instant?: boolean
}): Promise<void> {
  await supabaseAdmin
    .from('team_member_payouts')
    .update({
      amount_cents: opts.amountCents,
      tip_cents: opts.tipCents,
      stripe_transfer_id: opts.stripeTransferId,
      stripe_payout_id: opts.stripePayoutId ?? null,
      instant: opts.instant ?? false,
      status: 'transferred',
      paid_at: new Date().toISOString(),
    })
    .eq('tenant_id', opts.tenantId)
    .eq('id', opts.payoutId)
}

/**
 * Release a claim whose transfer failed, so a legitimate retry can re-claim.
 * Only deletes rows still in 'pending' — never a finalized ('transferred') payout.
 */
export async function releaseCleanerPayout(tenantId: string, payoutId: string): Promise<void> {
  await supabaseAdmin
    .from('team_member_payouts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', payoutId)
    .eq('status', 'pending')
}
