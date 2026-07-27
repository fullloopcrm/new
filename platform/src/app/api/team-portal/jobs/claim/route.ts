import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'
import { getTenantTimezone, getTenantNaiveDayBoundaries } from '@/lib/tenant-time'
import { isTeamMemberTerminated } from '@/lib/hr'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // A terminated member's portal session may still be valid (nothing revokes
  // it on termination today) — block claiming new jobs at this last gate even
  // if the roster/session cleanup hasn't caught up yet.
  if (await isTeamMemberTerminated(auth.tid, auth.id)) {
    return NextResponse.json({ error: 'Account is no longer active' }, { status: 403 })
  }

  // claim_job_atomic compares these against bookings.start_time, a naive
  // tenant-local column — pass the tenant's own naive day-boundary digits
  // (with a Z suffix so Postgres's UTC-session cast echoes them back
  // unchanged) instead of the server's (UTC) day boundary.
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', auth.tid).maybeSingle()
  const { todayStartNaive, tomorrowStartNaive } = getTenantNaiveDayBoundaries(getTenantTimezone(tenantRow))

  // Atomic claim: the daily-cap count check and the claiming UPDATE run inside
  // one DB function that locks the member row first (migrations/2026_07_13_
  // job_claim_atomic.sql), so a concurrent claim can no longer read a stale
  // count and slip past the cap. The booking UPDATE itself still filters on
  // `team_member_id IS NULL`, so claiming one booking stays first-writer-wins.
  const { data, error } = await supabaseAdmin.rpc('claim_job_atomic', {
    p_tenant_id: auth.tid,
    p_member_id: auth.id,
    p_booking_id: booking_id,
    p_day_start: `${todayStartNaive}.000Z`,
    p_day_end: `${tomorrowStartNaive}.000Z`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.claimed) {
    if (data?.reason === 'cap_reached') {
      return NextResponse.json({ error: `Daily job limit reached (${data.cap})` }, { status: 409 })
    }
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  // Admin-facing "job accepted" notification -- same shape/table the Telnyx
  // SMS-confirm webhook already uses for the sibling 'team_confirmed' event
  // (src/app/api/webhooks/telnyx/route.ts), just triggered from the portal
  // claim path instead of an SMS reply.
  const [{ data: member }, { data: bookingRow }] = await Promise.all([
    supabaseAdmin.from('team_members').select('name').eq('id', auth.id).eq('tenant_id', auth.tid).single(),
    supabaseAdmin.from('bookings').select('clients(name)').eq('id', booking_id).eq('tenant_id', auth.tid).single(),
  ])
  const memberName = member?.name || 'A team member'
  const clientName = (bookingRow?.clients as unknown as { name: string } | null)?.name || 'a client'
  await supabaseAdmin.from('notifications').insert({
    tenant_id: auth.tid,
    type: 'team_confirmed',
    title: `Job Claimed: ${memberName}`,
    message: `${memberName} claimed the job for ${clientName} via the team portal.`,
    channel: 'in_app',
    booking_id,
    metadata: { team_member_id: auth.id, confirmed_via: 'portal_claim' },
    status: 'sent',
  })

  return NextResponse.json({ booking: data.booking })
}
