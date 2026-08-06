import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantTimezone, getTenantNaiveDayBoundaries, addCalendarDays, formatCalendarNaive } from '@/lib/tenant-time'
import { applyPropertyToBookingClient } from '@/lib/client-properties'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// Coarsen a free-text address to a rough area for the open pool — enough to
// decide if a job is worth claiming, not enough to identify/contact the client.
// Prefers a 5-digit ZIP, else the locality segment after the street line.
function maskArea(address: string | null | undefined): string {
  if (!address) return 'Area hidden'
  const zip = address.match(/\b\d{5}\b/)
  if (zip) return zip[0]
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts[1] : 'Area hidden'
}

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const available = request.nextUrl.searchParams.get('available')
  const upcoming = request.nextUrl.searchParams.get('upcoming')

  // start_time is naive tenant-local — every cutoff below is built as a
  // naive string in that tenant's own timezone, not the server's (UTC).
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', auth.tid).maybeSingle()
  const timezone = getTenantTimezone(tenantRow)
  const { today: todayCal, todayStartNaive: today, tomorrowStartNaive: tomorrow } = getTenantNaiveDayBoundaries(timezone)

  // A booking's crew can include team members beyond the single `team_member_id`
  // lead column on `bookings` — booking_team_members holds the full crew (lead +
  // extras) when the multi-cleaner assignment UI was used to build the team.
  // Older/simple single-assign bookings never get a booking_team_members row at
  // all, so a non-lead crew member is only findable via that table while a lead
  // (or a single-assignee booking) is only findable via `bookings.team_member_id`
  // — match on either signal or extra crew members never see their own jobs.
  const memberBookingFilter = async (): Promise<string> => {
    const { data: crewRows } = await tenantDb(auth.tid)
      .from('booking_team_members') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
      .select('booking_id')
      .eq('team_member_id', auth.id)
    const crewBookingIds = (crewRows || []).map((r) => r.booking_id as string)
    return crewBookingIds.length > 0
      ? `team_member_id.eq.${auth.id},id.in.(${crewBookingIds.join(',')})`
      : `team_member_id.eq.${auth.id}`
  }

  if (available === 'true') {
    // Seeing the open (unassigned) pool is a field-staff tier permission — a
    // tenant can restrict this to leads/managers via the portal permission matrix.
    const { error: permError } = await requirePortalPermission(request, 'jobs.view_unassigned')
    if (permError) return permError

    // Unassigned jobs — MASKED. Client name/phone/full address are withheld until
    // a job is claimed (prevents the pool from leaking the whole client list to
    // every field worker). Only coarse area + service/time/pay is exposed.
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    // Waitlist-origin bookings sit at status='pending' (they're auto-created
    // the moment a client waitlists, not yet admin-approved like other
    // pending bookings) but should still be claimable — that's the whole
    // point of the auto-broadcast that texts cleaners about them. Every
    // other 'pending' booking (client_portal requests awaiting approval)
    // stays excluded from the claim pool.
    const { data, error } = (await tenantDb(auth.tid)
      .from('bookings')
      .select('id, start_time, end_time, service_type, price, status, source, clients(address)')
      .is('team_member_id', null)
      .or('status.in.(scheduled,confirmed),and(status.eq.pending,source.eq.waitlist)')
      .gte('start_time', today)
      .order('start_time')) as {
      data: { id: string; start_time: string; end_time: string; service_type: string; price: number; status: string; source: string; clients: { address: string | null } | { address: string | null }[] | null }[] | null
      error: { message: string } | null
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const masked = (data || []).map((b) => {
      const client = Array.isArray(b.clients) ? b.clients[0] : b.clients
      return {
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        service_type: b.service_type,
        price: b.price,
        status: b.status,
        is_waitlist: b.source === 'waitlist',
        area: maskArea(client?.address),
      }
    })
    return NextResponse.json({ jobs: masked })
  }

  if (upcoming === 'true') {
    // Return next 14 days of jobs (excluding today)
    const futureEnd = formatCalendarNaive(addCalendarDays(todayCal, 14))

    const { data, error } = await tenantDb(auth.tid)
      .from('bookings')
      .select('*, clients(name, phone, address, special_instructions), client_properties(address, latitude, longitude)')
      .or(await memberBookingFilter())
      .gte('start_time', tomorrow)
      .lt('start_time', futureEnd)
      .not('status', 'eq', 'cancelled')
      .order('start_time')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    ;(data || []).forEach((b) => applyPropertyToBookingClient(b as never))
    return NextResponse.json({ jobs: data })
  }

  // Default: return today's jobs for the authenticated team member
  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .select('*, clients(name, phone, address, special_instructions), client_properties(address, latitude, longitude)')
    .or(await memberBookingFilter())
    .gte('start_time', today)
    .lt('start_time', tomorrow)
    .not('status', 'eq', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  ;(data || []).forEach((b) => applyPropertyToBookingClient(b as never))
  return NextResponse.json({ jobs: data })
})
