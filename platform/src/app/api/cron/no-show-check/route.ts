/**
 * No-show detection — runs every 15 min.
 * Finds bookings where:
 *   - start_time + 45 min is in the past
 *   - status is still 'scheduled' | 'confirmed' | 'pending'
 *   - team_member_id is set (a "no-show" requires someone who was supposed
 *     to show up — an unassigned booking is a dispatch failure, not a
 *     no-show, and flipping it to 'no_show' would silently drop it from the
 *     team-portal self-claim pool, which only lists 'scheduled'/'confirmed'
 *     jobs — see /api/team-portal/jobs?available=true)
 *   - check_in_time is null (team never checked in)
 * Flips them to status='no_show' and fires an admin notify per tenant.
 *
 * 45-minute grace window gives the team time to arrive + check in for
 * real-world traffic/weather delays.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 300

const GRACE_MINUTES = 45

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000)

  // Find candidates across all tenants in one query (tenant_id returned so
  // we can notify per tenant).
  const { data: candidates } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, client_id, team_member_id, is_emergency, clients(name), team_members!bookings_team_member_id_fkey(name)')
    .in('status', ['scheduled', 'confirmed', 'pending'])
    .not('team_member_id', 'is', null)
    .is('check_in_time', null)
    .lt('start_time', cutoff.toISOString())
    .gt('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // skip old stragglers
    .limit(500)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, flipped: 0 })
  }

  const tenantIds = [...new Set(candidates.map((b) => b.tenant_id))]
  const { data: tenantRows } = await supabaseAdmin
    .from('tenants')
    .select('id, timezone')
    .in('id', tenantIds)
  const tzByTenant = new Map((tenantRows || []).map((t) => [t.id, t.timezone || 'America/New_York']))

  let flipped = 0
  const errors: string[] = []

  for (const b of candidates) {
    try {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', b.id)
        .eq('tenant_id', b.tenant_id)

      const client = b.clients as unknown as { name: string } | null
      const member = b.team_members as unknown as { name: string } | null
      const isEmergency = !!(b as { is_emergency?: boolean | null }).is_emergency
      const when = new Date(b.start_time).toLocaleString('en-US', {
        timeZone: tzByTenant.get(b.tenant_id) || 'America/New_York',
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })

      await notify({
        tenantId: b.tenant_id,
        type: 'late_check_in',
        title: isEmergency ? '🚨 Urgent no-show detected' : 'No-show detected',
        message: `${isEmergency ? '🚨 EMERGENCY — ' : ''}${client?.name || 'Client'} booking at ${when} auto-flipped to no_show (team member ${member?.name || 'unassigned'} did not check in within ${GRACE_MINUTES} min).`,
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
