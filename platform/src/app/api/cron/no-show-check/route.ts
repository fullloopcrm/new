/**
 * No-show detection — runs every 15 min.
 * Finds bookings where:
 *   - start_time + 45 min is in the past
 *   - status is still 'scheduled' | 'confirmed' | 'pending'
 *   - check_in_time is null (team never checked in)
 * Flips them to status='no_show' and fires an admin notify per tenant.
 *
 * 45-minute grace window gives the team time to arrive + check in for
 * real-world traffic/weather delays.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { nowNaiveET, parseNaiveET } from '@/lib/recurring'

export const maxDuration = 300

const GRACE_MINUTES = 45

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  // start_time is naive-ET (see recurring.ts's nowNaiveET() header) -- the old
  // cutoff/floor were built from true-UTC new Date().toISOString(), the same
  // ET/UTC gap bug class fixed elsewhere this session. Since UTC runs ahead of
  // ET, that made both bounds read as a later clock time than the real ET
  // instant, so a booking within the true 45-minute grace window (cleaner
  // could still be en route) got flipped to no_show up to ~4-5h early.
  const cutoff = nowNaiveET(-GRACE_MINUTES * 60 * 1000)
  const laggingFloor = nowNaiveET(-24 * 60 * 60 * 1000)

  // Find candidates across all tenants in one query (tenant_id returned so
  // we can notify per tenant).
  const { data: candidates } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, client_id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .in('status', ['scheduled', 'confirmed', 'pending'])
    .is('check_in_time', null)
    .lt('start_time', cutoff)
    .gt('start_time', laggingFloor) // skip old stragglers
    .limit(500)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, flipped: 0 })
  }

  let flipped = 0
  const errors: string[] = []

  for (const b of candidates) {
    try {
      // Re-assert the SAME conditions that made this row a candidate, inside
      // this update's own WHERE, instead of trusting the `candidates` SELECT
      // snapshot. Without this, a team member checking in for real (which
      // sets check_in_time + status='in_progress') in the gap between the
      // SELECT above and this row's turn in the loop -- easily seconds on a
      // 500-row batch, since check-in requests aren't blocked on this cron --
      // gets silently overwritten back to 'no_show' by this unconditional
      // update, corrupting a legitimately in-progress/completed booking's
      // status (feeds finance/cash-flow, the calendar, and client-facing
      // state). `.select().maybeSingle()` reports whether the claim actually
      // landed so a lost race skips the notify too.
      const { data: claimed } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', b.id)
        .eq('tenant_id', b.tenant_id)
        .in('status', ['scheduled', 'confirmed', 'pending'])
        .is('check_in_time', null)
        .select('id')
        .maybeSingle()

      if (!claimed) continue // checked in (or already flipped) since the SELECT above

      const client = b.clients as unknown as { name: string } | null
      const member = b.team_members as unknown as { name: string } | null

      await notify({
        tenantId: b.tenant_id,
        type: 'late_check_in',
        title: 'No-show detected',
        message: `${client?.name || 'Client'} booking at ${parseNaiveET(b.start_time).toLocaleString()} auto-flipped to no_show (team member ${member?.name || 'unassigned'} did not check in within ${GRACE_MINUTES} min).`,
        bookingId: b.id,
      }).catch(() => {})

      flipped++
    } catch (err) {
      errors.push(`booking ${b.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    success: true,
    flipped,
    errors: errors.slice(0, 20),
  })
}
