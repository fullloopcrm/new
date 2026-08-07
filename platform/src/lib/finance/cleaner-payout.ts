/**
 * Single shared idempotency key for cleaner (team-member) payouts, keyed on
 * (booking_id, team_member_id) — one booking can owe MULTIPLE people
 * (booking_team_members: a lead + extras on a multi-cleaner job), so the key
 * must include which person, not just which booking. Every Stripe Connect
 * payout site must consult this before moving money so one (booking, team
 * member) pair pays out exactly once:
 *   - lib/payment-processor.ts        (Zelle/Venmo/cash + cleaner-checkout path)
 *   - app/api/team-portal/checkout    (calls processPayment)
 *   - app/api/webhooks/stripe         (Stripe-paid booking auto-payout)
 *
 * Two triggers are covered: (a) the same path invoked twice (repeat checkout,
 * webhook retry), (b) two different paths for the same booking (Stripe webhook
 * pays, then the cleaner also reports a method at checkout). Both resolve to
 * the same (booking_id, team_member_id), so a payout row for that pair — or,
 * for the LEAD specifically, bookings.team_member_paid already true (a
 * single-payee-per-booking flag that predates multi-cleaner support and only
 * ever described the lead) — means "done, do not pay again".
 *
 * Widened from booking_id-only 2026-08-07 after a multi-cleaner job's extra
 * crew member (Karina) was silently never paid: the old key made the lead's
 * payout row read as "this booking is settled" for everyone on the job.
 *
 * NOTE: this is a check-before-transfer guard. It fully closes the sequential /
 * retry exploit (and the regression tests below). A truly simultaneous race
 * (two transfers in flight before either inserts its payout row) is caught at
 * the RECORD level by the UNIQUE(tenant_id, booking_id, team_member_id)
 * backstop in supabase/migrations/20260807164759_widen_team_member_payouts_unique_index.sql;
 * closing the fund-movement race entirely would require claim-before-transfer,
 * flagged for follow-up.
 */
import { supabaseAdmin } from '../supabase'

export async function cleanerAlreadyPaid(tenantId: string, bookingId: string, teamMemberId: string): Promise<boolean> {
  const { data: payout } = await supabaseAdmin
    .from('team_member_payouts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
    .eq('team_member_id', teamMemberId)
    .limit(1)
    .maybeSingle()
  if (payout) return true

  // Legacy single-payee flag — only ever meant "the lead has been paid", so
  // only trust it when we're asking about the lead. For an extra crew
  // member it would false-positive the moment the lead's own payout landed.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('team_member_id, team_member_paid')
    .eq('tenant_id', tenantId)
    .eq('id', bookingId)
    .maybeSingle()
  return booking?.team_member_id === teamMemberId && booking?.team_member_paid === true
}

/** Sum of every tip recorded against a booking (payments.tip_cents can span
 *  multiple rows — e.g. a cash tip logged separately from a Stripe payment).
 *  Looked up fresh at payout time so a tip that lands via the Stripe webhook
 *  before OR after checkout is still included — never hardcoded to 0. */
export async function tipCentsForBooking(tenantId: string, bookingId: string): Promise<number> {
  const { data: rows } = await supabaseAdmin
    .from('payments')
    .select('tip_cents')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
  return (rows || []).reduce((sum, r) => sum + ((r.tip_cents as number | null) || 0), 0)
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
