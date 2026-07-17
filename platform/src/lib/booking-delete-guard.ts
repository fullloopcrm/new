/**
 * Guard against hard-deleting a booking that carries real job/revenue
 * history. DELETE /api/bookings/[id] is the only door that hard-deletes a
 * bookings row, and it never checked this — unlike the general-purpose PUT
 * on this same route, which already blocks flipping a completed/paid
 * booking back to 'cancelled' because "that has no downstream reconciliation
 * (payroll team_pay, referral commission clawback) anywhere in this
 * codebase." Hard-delete bypassed that same policy entirely: a completed or
 * paid booking could be deleted outright, silently destroying its
 * `ratings` row (ON DELETE CASCADE, migration 050) and any
 * `referral_commissions` row (ON DELETE CASCADE, migration 019) — a real
 * commission owed or already paid to a referrer.
 *
 * `payments.booking_id` and `team_member_payouts.booking_id` have no
 * ON DELETE action (defaults to RESTRICT) — a booking with a real payment
 * or payout on file would already 500 with a raw Postgres FK-violation
 * instead of a clean error, so that's caught here too.
 *
 * bookings.status already supports the exact soft-remove state this needs
 * ('cancelled', the same state the PUT route's own guard steers toward) so
 * this guard steers callers there instead of guessing a new mechanism.
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface DeleteGuardResult {
  deletable: boolean
  reason?: string
}

export async function checkBookingDeletable(
  tenantId: string,
  bookingId: string,
): Promise<DeleteGuardResult> {
  const [ratings, commissions, payments, payouts] = await Promise.all([
    supabaseAdmin.from('ratings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('referral_commissions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('team_member_payouts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
  ])

  if ((ratings.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This booking has a customer/team rating on file and cannot be deleted — cancel it instead to preserve the feedback record.',
    }
  }
  if ((commissions.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This booking has a referral commission on file and cannot be deleted — cancel it instead to preserve the commission record.',
    }
  }
  if ((payments.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This booking has a payment on file and cannot be deleted — cancel it instead to preserve the payment record.',
    }
  }
  if ((payouts.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This booking has a team payout on file and cannot be deleted — cancel it instead to preserve the payout record.',
    }
  }
  return { deletable: true }
}
