import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { calculateDistance, estimateTransitMinutes, geocodeClient } from '@/lib/nycmaid/geo'

export async function GET(request: Request) {
  // Auth: field-staff bearer token. This returns client names + full home
  // addresses + geo, so it must be gated. A member can only see their OWN
  // route — the team_member_id is taken from the verified token, not the query,
  // and every lookup is scoped to the token's tenant.
  const { auth, error } = await requirePortalPermission(request, 'jobs.view_own')
  if (error) return error

  const { searchParams } = new URL(request.url)
  const teamMemberId = auth.id
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date required' }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, has_car')
    .eq('id', teamMemberId)
    .eq('tenant_id', auth.tid)
    .single()

  if (!member) return NextResponse.json([])

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, client_id, clients(id, name, address, latitude, longitude)')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', teamMemberId)
    .gte('start_time', `${date}T00:00:00`)
    .lte('start_time', `${date}T23:59:59`)
    .not('status', 'in', '("cancelled")')
    .order('start_time', { ascending: true })

  if (!bookings || bookings.length < 2) return NextResponse.json([])

  const result: Array<Record<string, unknown>> = []

  for (let i = 0; i < bookings.length; i++) {
    const job = bookings[i]
    const client = job.clients as unknown as { id: string; name: string; address: string; latitude: number | null; longitude: number | null } | null
    if (!client) continue

    let lat = client.latitude ? Number(client.latitude) : null
    let lng = client.longitude ? Number(client.longitude) : null
    if (!lat || !lng) {
      const coords = await geocodeClient(client.id, client.address)
      if (coords) { lat = coords.lat; lng = coords.lng }
    }

    const [, timePart] = job.start_time.split('T')
    const [h, m] = (timePart || '00:00').split(':').map(Number)
    const ampm = h >= 12 ? 'p' : 'a'
    const hr = h % 12 || 12
    const timeStr = m > 0 ? `${hr}:${String(m).padStart(2, '0')}${ampm}` : `${hr}${ampm}`

    result.push({
      booking_id: job.id,
      client_name: client.name.split(' ')[0],
      address: client.address,
      time: timeStr,
      lat,
      lng,
    })

    if (i < bookings.length - 1) {
      const nextJob = bookings[i + 1]
      const nextClient = nextJob.clients as unknown as { latitude: number | null; longitude: number | null; address: string; id: string } | null
      let nLat = nextClient?.latitude ? Number(nextClient.latitude) : null
      let nLng = nextClient?.longitude ? Number(nextClient.longitude) : null
      if ((!nLat || !nLng) && nextClient) {
        const coords = await geocodeClient(nextClient.id, nextClient.address)
        if (coords) { nLat = coords.lat; nLng = coords.lng }
      }

      if (lat && lng && nLat && nLng) {
        const distMiles = calculateDistance(lat, lng, nLat, nLng)
        const travelMin = estimateTransitMinutes(distMiles, !!member.has_car)
        result.push({
          travel: true,
          minutes: travelMin,
          miles: Math.round(distMiles * 10) / 10,
          mode: member.has_car ? '🚗' : '🚇',
        })
      } else {
        result.push({ travel: true, minutes: null, miles: null, mode: member.has_car ? '🚗' : '🚇' })
      }
    }
  }

  return NextResponse.json(result)
}
