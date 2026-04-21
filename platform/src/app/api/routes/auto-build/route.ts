/**
 * Auto-build routes for a given day.
 * Gathers every booking on ?date= that has a team_member_id, groups by
 * team member, and creates (or replaces) a route per team member.
 *
 * Bookings without a team_member_id go into a single "Unassigned" route.
 * Idempotent — re-running replaces same-day routes for touched team members.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import type { RouteStop } from '@/lib/route-optimizer'

interface BookingRow {
  id: string
  client_id: string | null
  team_member_id: string | null
  start_time: string
  end_time: string | null
  address: string | null
  special_instructions: string | null
  actual_hours: number | null
  clients: { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null; lat?: number; lng?: number } | null
  team_members: { id: string; name: string | null; home_latitude: number | null; home_longitude: number | null; address: string | null } | null
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({}))
    const date: string = body.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date (YYYY-MM-DD) required' }, { status: 400 })
    }

    const dayStart = `${date}T00:00:00Z`
    const dayEnd = `${date}T23:59:59Z`

    const { data: bookings, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, client_id, team_member_id, start_time, end_time, address, special_instructions, actual_hours,
        clients(id, name, address, latitude, longitude, lat, lng),
        team_members!bookings_team_member_id_fkey(id, name, home_latitude, home_longitude, address)
      `)
      .eq('tenant_id', tenantId)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .not('status', 'in', '(cancelled,no_show,voided)')
      .order('start_time', { ascending: true })
    if (bErr) throw bErr

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ ok: true, routes_created: 0, bookings: 0 })
    }

    // Group by team_member_id (null bucket = "Unassigned")
    const groups = new Map<string | null, BookingRow[]>()
    for (const b of bookings as unknown as BookingRow[]) {
      const key = b.team_member_id || null
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(b)
    }

    // Fetch tenant HQ for fallback start
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('hq_latitude, hq_longitude, address')
      .eq('id', tenantId)
      .single()

    const createdRouteIds: string[] = []

    for (const [teamMemberId, groupBookings] of groups.entries()) {
      const firstTm = groupBookings[0]?.team_members || null

      // Build stops with lat/lng
      const stops: RouteStop[] = []
      for (const b of groupBookings) {
        const client = b.clients
        const lat = client?.latitude ?? client?.lat ?? null
        const lng = client?.longitude ?? client?.lng ?? null
        if (lat == null || lng == null) continue
        stops.push({
          booking_id: b.id,
          client_id: client?.id || b.client_id || null,
          client_name: client?.name || null,
          address: client?.address || b.address || '',
          lat: Number(lat),
          lng: Number(lng),
          arrival_window_start: b.start_time,
          arrival_window_end: b.end_time,
          duration_minutes: (b.actual_hours || 0) * 60 || 60,
          notes: b.special_instructions || null,
        })
      }

      if (stops.length === 0) continue

      const startLat = firstTm?.home_latitude || tenant?.hq_latitude || null
      const startLng = firstTm?.home_longitude || tenant?.hq_longitude || null
      const startAddress = firstTm?.address || tenant?.address || null

      // Delete any existing route for this team_member + date so this is idempotent
      const delQuery = supabaseAdmin
        .from('routes')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('route_date', date)
      if (teamMemberId === null) {
        await delQuery.is('team_member_id', null)
      } else {
        await delQuery.eq('team_member_id', teamMemberId)
      }

      const { data: newRoute } = await supabaseAdmin
        .from('routes')
        .insert({
          tenant_id: tenantId,
          team_member_id: teamMemberId,
          route_date: date,
          status: 'draft',
          start_address: startAddress,
          start_latitude: startLat,
          start_longitude: startLng,
          end_address: startAddress,
          end_latitude: startLat,
          end_longitude: startLng,
          stops,
          total_stops: stops.length,
        })
        .select('id')
        .single()

      if (newRoute) {
        createdRouteIds.push(newRoute.id)
        await supabaseAdmin
          .from('bookings')
          .update({ route_id: newRoute.id })
          .eq('tenant_id', tenantId)
          .in('id', stops.map(s => s.booking_id))
      }
    }

    return NextResponse.json({
      ok: true,
      routes_created: createdRouteIds.length,
      bookings: bookings.length,
      route_ids: createdRouteIds,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/routes/auto-build', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
