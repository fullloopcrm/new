import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { sweepTenantDuplicateBookings } from '@/lib/duplicate-bookings'

export const maxDuration = 300

// Tenant-aware port from nycmaid (Daniel Mazur incident, 2026-07-14): two
// active recurring_schedules for the same client both generating a booking
// on the SAME calendar date. That's the real duplicate signal — NOT "same
// day_of_week + preferred_time," which also matches legitimate biweekly
// service modeled as two offset weekly schedules.
//
// Upgraded 2026-08-14 (Jeff: "there should never be a duplicate booking"):
// used to only send an admin notification and leave the duplicate sitting
// there for a human to notice and fix. Now auto-cancels the true-duplicate
// case (same service, colliding schedules) via duplicate-bookings.ts,
// keeping the booking from the more established schedule — same "established
// wins" rule client-dedupe.ts uses for canonical client pick. A collision
// across two different services still just notifies; that's plausibly
// intentional, not a duplicate.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'active')
    .limit(1000)

  let totalAutoCancelled = 0
  let totalFlagged = 0
  let totalNotified = 0

  for (const tenant of tenants || []) {
    try {
      const result = await sweepTenantDuplicateBookings(tenant.id)
      totalAutoCancelled += result.autoCancelled
      totalFlagged += result.flaggedForReview
      totalNotified += result.notified
    } catch (err) {
      await trackError(err, { source: 'cron/duplicate-schedule-audit', severity: 'high', tenantId: tenant.id })
    }
  }

  return NextResponse.json({ success: true, autoCancelled: totalAutoCancelled, flagged: totalFlagged, notified: totalNotified })
}
