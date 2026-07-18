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
import { safeEqual } from '@/lib/timing-safe-equal'
import { tenantServesSite } from '@/lib/tenant-status'

export const maxDuration = 300

const GRACE_MINUTES = 45

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000)

  // Find candidates across all tenants in one query (tenant_id returned so
  // we can notify per tenant).
  const { data: candidates } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, client_id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .in('status', ['scheduled', 'confirmed', 'pending'])
    .is('check_in_time', null)
    .lt('start_time', cutoff.toISOString())
    .gt('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // skip old stragglers
    .limit(500)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, flipped: 0 })
  }

  // Same class of gap fixed across every other cross-tenant fan-out this
  // session: bookings carries no tenant status of its own, and this loop
  // never checked tenantServesSite() before flipping a booking to no_show
  // and notifying admins — a suspended/cancelled/deleted tenant's stale
  // bookings kept getting auto-flipped and alerted on indefinitely.
  const candidateTenantIds = Array.from(new Set(candidates.map((b) => b.tenant_id as string)))
  const { data: candidateTenants } = await supabaseAdmin
    .from('tenants')
    .select('id, status')
    .in('id', candidateTenantIds)
  const servingTenantIds = new Set(
    (candidateTenants || []).filter((t) => tenantServesSite(t.status)).map((t) => t.id as string),
  )

  let flipped = 0
  const errors: string[] = []

  for (const b of candidates) {
    if (!servingTenantIds.has(b.tenant_id as string)) continue
    try {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', b.id)
        .eq('tenant_id', b.tenant_id)

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
