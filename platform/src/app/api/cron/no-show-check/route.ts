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
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { safeEqual } from '@/lib/secret-compare'
import { toNaiveET } from '@/lib/dates'

export const maxDuration = 300

const GRACE_MINUTES = 45

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // bookings.start_time is stored naive-ET (no tz, literally what was typed
  // in). A raw `.toISOString()` cutoff is a real UTC instant with a 'Z'
  // suffix -- Postgres drops the tz marker for a `timestamp without time
  // zone` column and compares the literal digits, so an unconverted cutoff
  // was being read as if its UTC clock digits were ET clock digits, off by
  // the whole EST/EDT offset (4-5h) on every single run, not just a daily
  // boundary window. Net effect: bookings up to ~4-5h in the future (that
  // hadn't even started yet) were eligible to be flipped to `no_show`.
  const cutoff = toNaiveET(new Date(Date.now() - GRACE_MINUTES * 60 * 1000))
  const lowerBound = toNaiveET(new Date(Date.now() - 24 * 60 * 60 * 1000))

  // Find candidates across all tenants in one query (tenant_id returned so
  // we can notify per tenant).
  const { data: candidates } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, client_id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .in('status', ['scheduled', 'confirmed', 'pending'])
    .is('check_in_time', null)
    .lt('start_time', cutoff)
    .gt('start_time', lowerBound) // skip old stragglers
    .limit(500)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, flipped: 0 })
  }

  let flipped = 0
  const errors: string[] = []

  for (const b of candidates) {
    try {
      // Claim BEFORE notifying: the initial SELECT filters on status IN
      // (scheduled/confirmed/pending), but this cron runs every 15 min and a
      // slow run (or a manual re-trigger) overlapping the next tick could
      // still see the same booking as eligible on two invocations — both
      // would flip status (idempotent) but both would also fire the admin
      // notify(), double-alerting. Repeat the status-IN condition on the
      // UPDATE itself so only the run whose UPDATE actually matches a row
      // (i.e. status hadn't already been flipped by the other run) proceeds.
      const { data: claimed } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', b.id)
        .eq('tenant_id', b.tenant_id)
        .in('status', ['scheduled', 'confirmed', 'pending'])
        .select('id')
      if (!claimed || claimed.length === 0) continue // claimed by a concurrent run

      const client = b.clients as unknown as { name: string } | null
      const member = b.team_members as unknown as { name: string } | null

      await notify({
        tenantId: b.tenant_id,
        type: 'late_check_in',
        title: 'No-show detected',
        message: `${client?.name || 'Client'} booking at ${new Date(b.start_time).toLocaleString()} auto-flipped to no_show (team member ${member?.name || 'unassigned'} did not check in within ${GRACE_MINUTES} min).`,
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
