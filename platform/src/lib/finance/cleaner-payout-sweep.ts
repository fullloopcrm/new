/**
 * Cadence for the cleaner-payout-sweep cron: find bookings with a recent
 * payout row (candidates for a second, later installment — a tip or
 * overpayment that clears after an earlier payout already claimed that
 * booking+cleaner's slot), compute what's really still owed per cleaner via
 * computeCleanerOutstanding, and either pay it automatically
 * (sweepCleanerOutstanding, cleaner-payout-sweep-executor.ts) or — the
 * guardrail the whole cron exists for — surface it to a human when
 * automation genuinely can't reach it. Nothing is ever silently dropped:
 * every outstanding cent either gets paid or gets an admin_tasks row.
 */
import { supabaseAdmin } from '../supabase'
import { computeCleanerOutstanding, type CleanerOutstanding } from './cleaner-outstanding'
import { sweepCleanerOutstanding } from './cleaner-payout-sweep-executor'

// How far back to look for candidate bookings, anchored on the booking's
// FIRST payout row (team_member_payouts.created_at) — the moment a base-pay
// auto-payout landed and a later, separate payout became structurally
// possible. Wide enough to catch a tip that clears hours or a couple of
// days after checkout; a booking whose first payout is older than this is
// treated as settled history — the admin dashboard's Close-Out panel is the
// backstop for anything genuinely stale, not this cron.
const CANDIDATE_LOOKBACK_DAYS = 14

export async function runCleanerPayoutSweepForTenant(tenantId: string): Promise<{ paid: number; flagged: number; errors: string[] }> {
  let paid = 0
  let flagged = 0
  const errors: string[] = []

  const cutoff = new Date(Date.now() - CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentPayouts } = await supabaseAdmin
    .from('team_member_payouts')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .not('booking_id', 'is', null)
    .gte('created_at', cutoff)
  const candidateBookingIds = [...new Set((recentPayouts || []).map(p => p.booking_id as string))]
  if (candidateBookingIds.length === 0) return { paid, flagged, errors }

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, clients(name)')
    .eq('tenant_id', tenantId)
    .in('id', candidateBookingIds)

  for (const booking of bookings || []) {
    const bookingId = booking.id as string
    const clientName = (booking.clients as unknown as { name?: string } | null)?.name || null
    try {
      const outstandings = await computeCleanerOutstanding(tenantId, bookingId)
      for (const cleaner of outstandings) {
        if (cleaner.outstandingCents <= 0) continue

        if (!cleaner.globalPayoutsRecipientId && !cleaner.stripeAccountId) {
          if (await flagStrandedPayout(tenantId, bookingId, cleaner)) flagged++
          continue
        }

        const result = await sweepCleanerOutstanding({ tenantId, bookingId, cleaner, clientName })
        if (result === 'paid') paid++
        else if (result === 'failed') {
          if (await flagStrandedPayout(tenantId, bookingId, cleaner)) flagged++
        }
        // 'not_claimed' means another concurrent path (or a prior tick that
        // raced this one) already claimed this exact amount — not an error.
      }
    } catch (e) {
      errors.push(`booking ${bookingId}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return { paid, flagged, errors }
}

/**
 * Read-then-write dedupe (same reasoning as payment-reminder.ts's escalation
 * task: lower-stakes than a real money movement, so a full atomic-claim
 * column isn't warranted) — skip if an open payout_stranded task already
 * exists for this booking. Scoped to related_id only, not per-cleaner: on a
 * multi-cleaner job a second stranded cleaner on the SAME booking won't get
 * their own task until the first is resolved — acceptable, rare edge case
 * rather than more dedupe infrastructure for it.
 */
async function flagStrandedPayout(tenantId: string, bookingId: string, cleaner: CleanerOutstanding): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('admin_tasks')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'payout_stranded')
    .eq('related_id', bookingId)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle()
  if (existing) return false

  const { error } = await supabaseAdmin.from('admin_tasks').insert({
    tenant_id: tenantId,
    type: 'payout_stranded',
    priority: 'high',
    title: `${cleaner.name} owed $${(cleaner.outstandingCents / 100).toFixed(2)} — no payout method on file`,
    description: `Booking ${bookingId}: $${(cleaner.outstandingCents / 100).toFixed(2)} still owed to ${cleaner.name}, but they have no Global Payouts or Stripe Connect account on file, so it can't be paid out automatically. Pay manually or add their payout account.`,
    related_type: 'booking',
    related_id: bookingId,
  })
  return !error
}
