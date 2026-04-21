/**
 * Optimize stop order for a route using nearest-neighbor + 2-opt.
 * Updates route.stops, total_distance_meters, total_duration_seconds, status=optimized.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { optimizeRoute, type RouteStop, type RoutePoint } from '@/lib/route-optimizer'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: route } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!route.start_latitude || !route.start_longitude) {
      return NextResponse.json({ error: 'Route has no start coordinates — set team member home or tenant HQ first' }, { status: 400 })
    }

    const stops = Array.isArray(route.stops) ? (route.stops as RouteStop[]) : []
    if (stops.length === 0) {
      return NextResponse.json({ error: 'No stops to optimize' }, { status: 400 })
    }

    const start: RoutePoint = { lat: Number(route.start_latitude), lng: Number(route.start_longitude) }
    const end: RoutePoint | null =
      route.end_latitude && route.end_longitude
        ? { lat: Number(route.end_latitude), lng: Number(route.end_longitude) }
        : null

    const result = optimizeRoute({ start, end, stops })

    const { data: updated, error } = await supabaseAdmin
      .from('routes')
      .update({
        stops: result.orderedStops,
        total_distance_meters: result.totalDistanceMeters,
        total_duration_seconds: result.totalDurationSeconds,
        total_stops: result.orderedStops.length,
        status: route.status === 'draft' ? 'optimized' : route.status,
        optimized_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({
      route: updated,
      stats: {
        stops: result.orderedStops.length,
        distance_meters: result.totalDistanceMeters,
        duration_seconds: result.totalDurationSeconds,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/routes/[id]/optimize', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
