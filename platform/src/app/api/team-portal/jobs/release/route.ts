import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'
import { sendPushToTenantAdmins } from '@/lib/push'

type ReleasedBooking = {
  id: string
  start_time: string | null
  is_emergency: boolean | null
  clients: { name?: string | null } | null
}

// A member hands their OWN job back to the open pool (e.g. sick that morning).
// Distinct from reassign — no permission over others, only over your own job.
export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.release_own')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const db = tenantDb(auth.tid)

  // Atomic: only succeeds if this booking is currently assigned to THIS member.
  const { data, error } = await db
    .from('bookings')
    .update({ team_member_id: null, status: 'scheduled' })
    .eq('id', booking_id)
    .eq('team_member_id', auth.id)
    .select('*, clients(name)')
    .maybeSingle<ReleasedBooking>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not your job to release' }, { status: 403 })

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'released', by: auth.id },
  })

  // Unlike reassign (which notifies both the outgoing and incoming tech),
  // a release had no admin-facing signal at all — a job silently fell back
  // into the unassigned pool with nobody but the releasing tech aware it
  // happened. Mirrors running-late's existing tech-triggered admin-push
  // convention; escalates wording for a same-day emergency the same way
  // schedule-monitor's unassigned check already does.
  // Same UTC-implicit rendering bug item (70)/(115)/(117) already fixed
  // elsewhere — this admin push (added after that sweep) rendered with no
  // timeZone option, showing the server's default zone instead of the
  // tenant's own. Directly archetype-relevant: a same-day emergency release
  // mid-shift is exactly the case where the wrong hour/date is most costly.
  // tenants has no tenant_id column (it IS the tenant row) — tenantDb's
  // wrapper would auto-append a nonexistent-column filter, so this one
  // query must go through supabaseAdmin directly, same rule tenant-db.ts's
  // own header comment documents.
  const [{ data: member }, { data: tenantRow }] = await Promise.all([
    db.from('team_members').select('name').eq('id', auth.id).maybeSingle<{ name: string | null }>(),
    supabaseAdmin.from('tenants').select('timezone').eq('id', auth.tid).maybeSingle<{ timezone: string | null }>(),
  ])
  const clientName = data.clients?.name || 'a client'
  const when = data.start_time
    ? new Date(data.start_time).toLocaleString('en-US', {
        timeZone: tenantRow?.timezone || 'America/New_York',
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : ''
  sendPushToTenantAdmins(
    auth.tid,
    data.is_emergency ? '🚨 Emergency Job Released' : 'Job Released',
    `${member?.name || 'A team member'} released ${clientName}'s job${when ? ` (${when})` : ''} back to the open pool.`,
    '/dashboard/bookings',
  ).catch(() => {})

  return NextResponse.json({ booking: data })
}
