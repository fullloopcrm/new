/**
 * Batch travel-time builder across a date or date range.
 * Ported from nycmaid `/api/admin/travel-times` (plural).
 * Returns CleanerRoute[] for a single date, or keyed-by-date for a range.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { calculateDistance, estimateTransitMinutes, geocodeAddress } from '@/lib/geo'

type RawClient = { id: string; name: string; address: string; latitude: number | null; longitude: number | null }
type RawTeamMember = { id: string; name: string; has_car: boolean | null }
type Booking = {
  id: string
  start_time: string
  end_time: string
  team_member_id: string | null
  clients: unknown
  team_members: unknown
}

async function buildRoutes(tenantId: string, bookings: Booking[]) {
  const byMember: Record<string, Booking[]> = {}
  for (const b of bookings) {
    if (!b.team_member_id) continue
    if (!byMember[b.team_member_id]) byMember[b.team_member_id] = []
    byMember[b.team_member_id].push(b)
  }

  const results = []
  for (const [memberId, jobs] of Object.entries(byMember)) {
    if (jobs.length < 2) continue
    const member = jobs[0].team_members as RawTeamMember | null
    if (!member) continue

    const route: Array<Record<string, unknown>> = []
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      const client = job.clients as RawClient | null
      if (!client) continue

      let lat = client.latitude ? Number(client.latitude) : null
      let lng = client.longitude ? Number(client.longitude) : null
      if ((!lat || !lng) && client.address) {
        const coords = await geocodeAddress(client.address)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
          await supabaseAdmin
            .from('clients')
            .update({ latitude: lat, longitude: lng })
            .eq('id', client.id)
            .eq('tenant_id', tenantId)
        }
      }

      const [, timePart] = job.start_time.split('T')
      const [h, m] = (timePart || '00:00').split(':').map(Number)
      const ampm = h >= 12 ? 'p' : 'a'
      const hr = h % 12 || 12
      const timeStr = m > 0 ? `${hr}:${String(m).padStart(2, '0')}${ampm}` : `${hr}${ampm}`

      route.push({ booking_id: job.id, client_name: client.name.split(' ')[0], address: client.address, time: timeStr, lat, lng })

      if (i < jobs.length - 1) {
        const nextClient = jobs[i + 1].clients as RawClient | null
        let nLat = nextClient?.latitude ? Number(nextClient.latitude) : null
        let nLng = nextClient?.longitude ? Number(nextClient.longitude) : null
        if ((!nLat || !nLng) && nextClient?.address) {
          const coords = await geocodeAddress(nextClient.address)
          if (coords) {
            nLat = coords.lat
            nLng = coords.lng
            await supabaseAdmin
              .from('clients')
              .update({ latitude: nLat, longitude: nLng })
              .eq('id', nextClient.id)
              .eq('tenant_id', tenantId)
          }
        }
        if (lat && lng && nLat && nLng) {
          const distMiles = calculateDistance(lat, lng, nLat, nLng)
          route.push({
            travel: true,
            minutes: estimateTransitMinutes(distMiles),
            miles: Math.round(distMiles * 10) / 10,
            from_booking_id: job.id,
            to_booking_id: jobs[i + 1].id,
          })
        } else {
          route.push({ travel: true, minutes: null, miles: null, from_booking_id: job.id, to_booking_id: jobs[i + 1].id })
        }
      }
    }
    results.push({ team_member_id: memberId, team_member_name: member.name, has_car: !!member.has_car, route })
  }
  return results
}

export async function GET(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!date && (!from || !to)) {
    return NextResponse.json({ error: 'date or from+to required' }, { status: 400 })
  }

  const tenantId = tenant.tenantId
  const sel = 'id, start_time, end_time, team_member_id, clients(id, name, address, latitude, longitude), team_members(id, name, has_car)'

  if (date) {
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select(sel)
      .eq('tenant_id', tenantId)
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`)
      .in('status', ['scheduled', 'pending', 'confirmed', 'in_progress', 'completed'])
      .order('start_time', { ascending: true })

    if (!bookings || bookings.length === 0) return NextResponse.json([])
    return NextResponse.json(await buildRoutes(tenantId, bookings as unknown as Booking[]))
  }

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select(sel)
    .eq('tenant_id', tenantId)
    .gte('start_time', `${from}T00:00:00`)
    .lte('start_time', `${to}T23:59:59`)
    .in('status', ['scheduled', 'pending', 'confirmed', 'in_progress', 'completed'])
    .order('start_time', { ascending: true })

  if (!bookings || bookings.length === 0) return NextResponse.json({})

  const byDate: Record<string, Booking[]> = {}
  for (const b of bookings as unknown as Booking[]) {
    const dateKey = b.start_time.split('T')[0]
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(b)
  }

  const result: Record<string, Awaited<ReturnType<typeof buildRoutes>>> = {}
  for (const [dateKey, dayBookings] of Object.entries(byDate)) {
    const routes = await buildRoutes(tenantId, dayBookings)
    if (routes.length > 0) result[dateKey] = routes
  }

  return NextResponse.json(result)
}
