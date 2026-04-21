/**
 * Routes — list + create.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const teamMemberId = url.searchParams.get('team_member_id')
    const status = url.searchParams.get('status')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let q = supabaseAdmin
      .from('routes')
      .select('*, team_members(id, name, phone, home_latitude, home_longitude)')
      .eq('tenant_id', tenantId)
      .order('route_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)

    if (date) q = q.eq('route_date', date)
    if (teamMemberId) q = q.eq('team_member_id', teamMemberId)
    if (status) q = q.eq('status', status)
    if (from) q = q.gte('route_date', from)
    if (to) q = q.lte('route_date', to)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ routes: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/routes', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()

    if (!body.route_date) {
      return NextResponse.json({ error: 'route_date required' }, { status: 400 })
    }

    // Default start/end from team_member home or tenant HQ
    let startLat: number | null = body.start_latitude ?? null
    let startLng: number | null = body.start_longitude ?? null
    let startAddress: string | null = body.start_address ?? null

    if (body.team_member_id && (!startLat || !startLng)) {
      const { data: tm } = await supabaseAdmin
        .from('team_members')
        .select('home_latitude, home_longitude, address')
        .eq('tenant_id', tenantId)
        .eq('id', body.team_member_id)
        .single()
      if (tm) {
        startLat = tm.home_latitude
        startLng = tm.home_longitude
        startAddress = startAddress || tm.address
      }
    }

    if (!startLat || !startLng) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('hq_latitude, hq_longitude, address')
        .eq('id', tenantId)
        .single()
      if (tenant?.hq_latitude && tenant?.hq_longitude) {
        startLat = tenant.hq_latitude
        startLng = tenant.hq_longitude
        startAddress = startAddress || tenant.address
      }
    }

    const { data, error } = await supabaseAdmin
      .from('routes')
      .insert({
        tenant_id: tenantId,
        team_member_id: body.team_member_id || null,
        route_date: body.route_date,
        status: 'draft',
        start_address: startAddress,
        start_latitude: startLat,
        start_longitude: startLng,
        end_address: body.end_address || startAddress,
        end_latitude: body.end_latitude ?? startLat,
        end_longitude: body.end_longitude ?? startLng,
        scheduled_start_time: body.scheduled_start_time || null,
        stops: body.stops || [],
        total_stops: (body.stops || []).length,
      })
      .select('*')
      .single()
    if (error) throw error

    // Back-link bookings
    if (body.stops && Array.isArray(body.stops)) {
      const bookingIds = body.stops.map((s: { booking_id?: string }) => s.booking_id).filter(Boolean)
      if (bookingIds.length) {
        await supabaseAdmin
          .from('bookings')
          .update({ route_id: data.id })
          .eq('tenant_id', tenantId)
          .in('id', bookingIds)
      }
    }

    return NextResponse.json({ route: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/routes', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
