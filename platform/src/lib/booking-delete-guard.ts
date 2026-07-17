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
 *
 * None of the four related-table checks below catch a completed job that
 * hasn't been paid out through ANY path yet: a booking can carry a real
 * check_in_time/check_out_time/actual_hours/team_member_pay — a crew member
 * actually did the work and is owed real money — with zero rows in
 * `payments`, `team_member_payouts`, `ratings`, or `referral_commissions`,
 * because pay hasn't been processed yet. And bulk payroll (`POST /api/
 * finance/payroll`) pays out by flipping the booking's own `status` to
 * 'paid' and inserting a lump-sum `payroll_payments` row with no
 * `booking_id` column at all — that path is invisible to every check above
 * even AFTER the crew has been paid. Either way, hard-deleting the booking
 * destroys the only record that the job happened and pay is owed/was paid
 * for it — worse than "not notified," it erases the evidence a dispute
 * would need. Block on the booking's own row: 'completed' or 'paid' status,
 * or a real check-in timestamp, means real job history exists.
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
  const [ratings, commissions, payments, payouts, bookingRow] = await Promise.all([
    supabaseAdmin.from('ratings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('referral_commissions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('team_member_payouts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', bookingId),
    supabaseAdmin.from('bookings').select('status, check_in_time, team_member_pay').eq('tenant_id', tenantId).eq('id', bookingId).maybeSingle(),
  ])

  const booking = bookingRow.data as { status?: string; check_in_time?: string | null; team_member_pay?: number | null } | null
  if (booking && (
    booking.status === 'completed' ||
    booking.status === 'paid' ||
    !!booking.check_in_time ||
    (booking.team_member_pay || 0) > 0
  )) {
    return {
      deletable: false,
      reason: 'This booking has real job history (checked in, completed, or paid) and cannot be deleted — cancel it instead to preserve the record.',
    }
  }

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
