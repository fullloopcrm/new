/**
 * Publish a route to its assigned team member via SMS with deep links.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getTerminatedTeamMemberIds } from '@/lib/hr'
import { sendSMS } from '@/lib/sms'
import { googleMapsDirectionsUrl, formatDistanceMiles, formatDuration, type RouteStop } from '@/lib/route-optimizer'
import { decryptSecret } from '@/lib/secret-crypto'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: route } = await supabaseAdmin
      .from('routes')
      .select('*, team_members!routes_team_member_id_fkey(id, name, phone, sms_consent)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tm = route.team_members as { id: string; name: string | null; phone: string | null; sms_consent: boolean | null } | null
    if (!tm || !tm.phone) {
      return NextResponse.json({ error: 'Route has no team member with phone number' }, { status: 400 })
    }
    // sms_consent — same invariant every other team-member/client SMS fan-out
    // enforces (team_members.sms_consent is a real, crew-editable column
    // since the team-portal/preferences fix); this send fired unconditionally
    // regardless of it before this fix.
    if (tm.sms_consent === false) {
      return NextResponse.json({ error: 'This team member has opted out of SMS.' }, { status: 400 })
    }

    // POST/PATCH now block assigning a terminated team member to a route, but a
    // route assigned while the driver was still active can sit in 'draft' for
    // days before publish -- and publish is the action that actually texts a
    // full day's client names/addresses to that phone number. Re-check at
    // send time, not just at assignment time, same reasoning as the
    // team-portal token check (a termination doesn't retroactively unassign).
    const terminatedIds = await getTerminatedTeamMemberIds(tenantId, [tm.id])
    if (terminatedIds.length > 0) {
      return NextResponse.json({ error: 'This team member is no longer active and cannot be sent a route.' }, { status: 400 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, telnyx_api_key, telnyx_phone, sms_number')
      .eq('id', tenantId)
      .single()

    const smsCreds = resolveTenantSmsCredentials(tenant)
    const apiKey = smsCreds.apiKey ? decryptSecret(smsCreds.apiKey) : null
    const from = smsCreds.phone || ''
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
