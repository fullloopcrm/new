import { supabaseAdmin } from '@/lib/supabase'
import { geocodeAddress, calculateDistance, estimateTransitMinutes } from '@/lib/geo'
import { guessZoneFromAddress, zoneRequiresCar } from '@/lib/service-zones'

interface TeamMemberScore {
  id: string
  name: string
  score: number
  available: boolean
  conflict?: string
  distance_miles?: number
  travel_from_prev_min?: number
  travel_to_home_min?: number
  home_by: string
  can_make_home?: boolean
  zone_match: boolean
  has_car: boolean
  day_jobs: { time: string; client: string; address: string }[]
  reason: string
}

export async function scoreTeamForBooking(opts: {
  tenantId: string
  date: string
  startTime: string
  durationHours: number
  clientAddress: string
  clientId?: string
  excludeBookingId?: string
}): Promise<TeamMemberScore[]> {
  const { tenantId, date, startTime, durationHours, clientAddress, clientId, excludeBookingId } = opts

  // Geocode job address
  let jobCoords: { lat: number; lng: number } | null = null
  if (clientId) {
    const { data: client } = await supabaseAdmin.from('clients').select('latitude, longitude').eq('id', clientId).single()
    if (client?.latitude && client?.longitude) jobCoords = { lat: Number(client.latitude), lng: Number(client.longitude) }
  }
  if (!jobCoords) jobCoords = await geocodeAddress(clientAddress)

  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })

  const { data: allMembers } = await supabaseAdmin
    .from('team_members')
    .select('id, name, address, home_latitude, home_longitude, home_by_time, working_days, schedule, unavailable_dates, max_jobs_per_day, service_zones, has_car')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  let bookingsQuery = supabaseAdmin
    .from('bookings')
    .select('id, team_member_id, start_time, end_time, clients(name, address, latitude, longitude)')
    .eq('tenant_id', tenantId)
    .gte('start_time', date + 'T00:00:00')
    .lte('start_time', date + 'T23:59:59')
    .neq('status', 'cancelled')

  if (excludeBookingId) bookingsQuery = bookingsQuery.neq('id', excludeBookingId)
  const { data: dayBookings } = await bookingsQuery

  const [sh, sm] = startTime.split(':').map(Number)
  const slotStartMin = sh * 60 + sm
  const slotEndMin = slotStartMin + durationHours * 60
  const BUFFER = 60

  const scores: TeamMemberScore[] = []

  for (const member of allMembers || []) {
    const worksToday = (() => {
      if (member.unavailable_dates?.includes(date)) return false
      if (member.working_days?.length > 0) return member.working_days.includes(dayOfWeek)
      return true
    })()

    if (!worksToday) {
      scores.push({ id: member.id, name: member.name, score: -1, available: false, conflict: 'Not scheduled', home_by: member.home_by_time || '18:00', zone_match: false, has_car: member.has_car || false, day_jobs: [], reason: 'off' })
      continue
    }

    const memberBookings = (dayBookings || []).filter(b => b.team_member_id === member.id)
    let hasConflict = false
    let conflictReason = ''

    for (const b of memberBookings) {
      const bStartMin = toMin(b.start_time)
      const bEndMin = toMin(b.end_time)
      if (slotStartMin < bEndMin + BUFFER && slotEndMin + BUFFER > bStartMin) {
        hasConflict = true
        conflictReason = `Conflict: ${formatTime(bStartMin)} (${(b.clients as any)?.name || 'Client'})`
        break
      }
    }

    if (!hasConflict && member.max_jobs_per_day && memberBookings.length >= member.max_jobs_per_day) {
      hasConflict = true
      conflictReason = `Max ${member.max_jobs_per_day} jobs/day`
    }

    const dayJobs = memberBookings.map(b => ({ time: formatTime(toMin(b.start_time)), client: (b.clients as any)?.name || 'Client', address: (b.clients as any)?.address || '' }))

    if (hasConflict) {
      scores.push({ id: member.id, name: member.name, score: -1, available: false, conflict: conflictReason, home_by: member.home_by_time || '18:00', zone_match: false, has_car: member.has_car || false, day_jobs: dayJobs, reason: 'conflict' })
      continue
    }

    let score = 100
    const jobZone = guessZoneFromAddress(clientAddress)
    const memberZones: string[] = member.service_zones || []
    const zoneMatch = jobZone ? memberZones.includes(jobZone) : false
    const hasCar = member.has_car || false

    if (zoneMatch) score += 50
    if (!zoneMatch && memberZones.length > 0) score -= 30
    if (jobZone && zoneRequiresCar(jobZone) && !hasCar) score -= 80

    let distMiles: number | undefined
    if (jobCoords && member.home_latitude && member.home_longitude) {
      distMiles = calculateDistance(jobCoords.lat, jobCoords.lng, Number(member.home_latitude), Number(member.home_longitude))
      score += Math.max(0, 30 - distMiles * 3)
    }

    let clusterBonus = 0
    if (jobCoords && memberBookings.length > 0) {
      for (const b of memberBookings) {
        const c = b.clients as any
        let bCoords: { lat: number; lng: number } | null = null
        if (c?.latitude && c?.longitude) bCoords = { lat: Number(c.latitude), lng: Number(c.longitude) }
        else if (c?.address) bCoords = await geocodeAddress(c.address)
        if (bCoords) {
          const d = calculateDistance(jobCoords.lat, jobCoords.lng, bCoords.lat, bCoords.lng)
          if (d < 1) clusterBonus += 20; else if (d < 3) clusterBonus += 10; else if (d < 5) clusterBonus += 5
        }
      }
    }
    score += clusterBonus

    let travelFromPrev: number | undefined
    let travelToHome: number | undefined
    let canMakeHome = true
    const homeBy = member.home_by_time || '18:00'
    const [hbH, hbM] = homeBy.split(':').map(Number)
    const homeByMin = hbH * 60 + hbM

    if (jobCoords && member.home_latitude && member.home_longitude) {
      const allJobEnds = [...memberBookings.map(b => toMin(b.end_time)), slotEndMin]
      const lastEndMin = Math.max(...allJobEnds)
      const homeDist = calculateDistance(jobCoords.lat, jobCoords.lng, Number(member.home_latitude), Number(member.home_longitude))
      travelToHome = estimateTransitMinutes(homeDist)
      canMakeHome = (lastEndMin + travelToHome) <= homeByMin
      if (!canMakeHome) score -= 50
    }

    let reason = ''
    if (zoneMatch && clusterBonus >= 20) reason = 'Zone match + near other jobs'
    else if (zoneMatch) reason = 'Zone match'
    else if (clusterBonus >= 20) reason = 'Near other jobs'
    else if (distMiles && distMiles < 2) reason = 'Close to home'
    else reason = 'Available'
    if (!canMakeHome) reason = `Won't make home by ${homeBy}`
    if (jobZone && zoneRequiresCar(jobZone) && !hasCar) reason = 'No car — area requires driving'

    scores.push({ id: member.id, name: member.name, score, available: true, distance_miles: distMiles ? Math.round(distMiles * 10) / 10 : undefined, travel_from_prev_min: travelFromPrev, travel_to_home_min: travelToHome, home_by: homeBy, can_make_home: canMakeHome, zone_match: zoneMatch, has_car: hasCar, day_jobs: dayJobs, reason })
  }

  scores.sort((a, b) => {
    if (a.available && !b.available) return -1
    if (!a.available && b.available) return 1
    return b.score - a.score
  })

  return scores
}

function toMin(timeStr: string): number {
  const [, t] = timeStr.split('T')
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return m > 0 ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
}
