/**
 * Publish a route to its assigned team member via SMS with deep links.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { sendSMS } from '@/lib/sms'
import { googleMapsDirectionsUrl, formatDistanceMiles, formatDuration, type RouteStop } from '@/lib/route-optimizer'
import { decryptSecret } from '@/lib/secret-crypto'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: route } = await supabaseAdmin
      .from('routes')
      .select('*, team_members!routes_team_member_id_fkey(id, name, phone)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tm = route.team_members as { id: string; name: string | null; phone: string | null } | null
    if (!tm || !tm.phone) {
      return NextResponse.json({ error: 'Route has no team member with phone number' }, { status: 400 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, telnyx_api_key, telnyx_phone')
      .eq('id', tenantId)
      .single()

    const apiKey = tenant?.telnyx_api_key ? decryptSecret(tenant.telnyx_api_key) : null
    const from = tenant?.telnyx_phone || ''
    if (!apiKey || !from) {
      return NextResponse.json({ error: 'Telnyx not configured for tenant' }, { status: 400 })
    }

    const stops = Array.isArray(route.stops) ? (route.stops as RouteStop[]) : []
    const mapsUrl =
      route.start_latitude && route.start_longitude && stops.length > 0
        ? googleMapsDirectionsUrl(
            { lat: Number(route.start_latitude), lng: Number(route.start_longitude) },
            stops.map(s => ({ lat: s.lat, lng: s.lng })),
            route.end_latitude && route.end_longitude
              ? { lat: Number(route.end_latitude), lng: Number(route.end_longitude) }
              : null,
          )
        : null

    const stopSummary = stops
      .map((s, i) => `${i + 1}. ${s.client_name || 'Stop'} — ${s.address}`)
      .join('\n')

    const distance = route.total_distance_meters ? formatDistanceMiles(route.total_distance_meters) : '—'
    const duration = route.total_duration_seconds ? formatDuration(route.total_duration_seconds) : '—'

    const firstName = (tm.name || 'there').split(' ')[0]
    const body = `Hi ${firstName}, your route for ${new Date(route.route_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} is ready.\n\n${stops.length} stops · ${distance} · ~${duration}\n\n${stopSummary}${mapsUrl ? `\n\nFull route: ${mapsUrl}` : ''}`

    await sendSMS({ to: tm.phone, body, telnyxApiKey: apiKey, telnyxPhone: from })

    const { data: updated } = await supabaseAdmin
      .from('routes')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()

    return NextResponse.json({ ok: true, route: updated, maps_url: mapsUrl })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/routes/[id]/publish', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
