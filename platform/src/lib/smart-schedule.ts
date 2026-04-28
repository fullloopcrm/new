/**
 * Smart-schedule scoring — industry-neutral team-member matching for any
 * home-services business (cleaning, HVAC, landscaping, pest, etc).
 * Multi-tenant: all queries scoped by tenant_id.
 * Required team_members columns (added in migration 049):
 *   home_latitude, home_longitude, home_by_time, service_zones.
 * Already present: address, schedule, unavailable_dates, working_days,
 *   max_jobs_per_day, has_car, status.
 *
 * Industry-specific rules (e.g. cleaning's "labor-only vs supplies-included")
 * are NOT baked in here. They belong in tenant-config / per-industry hooks.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { geocodeAddress, calculateDistance, estimateTransitMinutes } from '@/lib/geo'
import { guessZoneFromAddress, zoneRequiresCar } from '@/lib/service-zones'

export interface TeamMemberScore {
  id: string
  name: string
  score: number // higher = better fit
  available: boolean
  conflict?: string
  distance_miles?: number
  travel_from_prev_min?: number
  travel_to_next_min?: number
  travel_to_home_min?: number
  prev_job_label?: string // "9:00 AM Sarah J"
  next_job_label?: string // "4:00 PM Mike R"
  home_by: string
  can_make_home?: boolean
  zone_match: boolean
  has_car: boolean
  day_jobs: { time: string; client: string; address: string }[]
  reason: string
}

type ClientFK = { name?: string | null; address?: string | null; latitude?: number | string | null; longitude?: number | string | null } | null

/**
 * Score every team member for a candidate booking slot. Factors:
 * 1. Zone match (+50) / mismatch (-30)
 * 2. Zone requires car but member doesn't have one (-80)
 * 3. Proximity from member's home (max +30 for <1mi)
 * 4. Clustering with the member's other jobs that day (+5/+10/+20)
 * 5. Travel-from-previous job penalty (max +20 for <10min commute)
 * 6. Won't make it home by `home_by_time` after this slot (-50)
 * Returns sorted list, available first by score, then unavailable with reasons.
 */
export async function scoreTeamForBooking(opts: {
  tenantId: string
  date: string
  startTime: string // HH:MM
  durationHours: number
  clientAddress: string
  clientId?: string
  excludeBookingId?: string
}): Promise<TeamMemberScore[]> {
  const { tenantId, date, startTime, durationHours, clientAddress, clientId, excludeBookingId } = opts

  // Geocode the job address — prefer cached client coords.
  let jobCoords: { lat: number; lng: number } | null = null
  if (clientId) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('latitude, longitude')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()
    if (client?.latitude && client?.longitude) {
      jobCoords = { lat: Number(client.latitude), lng: Number(client.longitude) }
    }
  }
  if (!jobCoords) {
    jobCoords = await geocodeAddress(clientAddress)
    if (jobCoords && clientId) {
      // Cache on the client row for next time.
      supabaseAdmin
        .from('clients')
        .update({ latitude: jobCoords.lat, longitude: jobCoords.lng })
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .then(() => {})
    }
  }

  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })

  // Active team members for this tenant. Schema uses `status`, not `active` boolean.
  const { data: allMembers } = await supabaseAdmin
    .from('team_members')
    .select('id, name, address, home_latitude, home_longitude, home_by_time, working_days, schedule, unavailable_dates, max_jobs_per_day, service_zones, has_car, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'inactive')

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
    // Day-of-week availability
    const worksToday = (() => {
      if ((member.unavailable_dates as string[] | null)?.includes(date)) return false
      const wd = member.working_days as string[] | null
      if (wd && wd.length > 0) return wd.includes(dayOfWeek)
      const sched = member.schedule as Record<string, unknown> | null
      if (sched && Object.keys(sched).length > 0) return sched[dayOfWeek] != null
      return true
    })()

    if (!worksToday) {
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: 'Not scheduled to work',
        home_by: (member.home_by_time as string) || '18:00',
        zone_match: false, has_car: Boolean(member.has_car),
        day_jobs: [], reason: 'off',
      })
      continue
    }

    // Time-conflict + max-jobs-per-day
    const memberBookings = (dayBookings || []).filter((b) => b.team_member_id === member.id)
    let hasConflict = false
    let conflictReason = ''

    for (const b of memberBookings) {
      const bStartMin = toMin(b.start_time as string)
      const bEndMin = toMin(b.end_time as string)
      if (slotStartMin < bEndMin + BUFFER && slotEndMin + BUFFER > bStartMin) {
        hasConflict = true
        const c = b.clients as ClientFK
        conflictReason = `Conflict: ${formatTime(bStartMin)} (${c?.name || 'Client'})`
        break
      }
    }
    if (!hasConflict && member.max_jobs_per_day && memberBookings.length >= Number(member.max_jobs_per_day)) {
      hasConflict = true
      conflictReason = `Max ${member.max_jobs_per_day} jobs/day`
    }

    const dayJobs = memberBookings.map((b) => {
      const c = b.clients as ClientFK
      return {
        time: formatTime(toMin(b.start_time as string)),
        client: c?.name || 'Client',
        address: c?.address || '',
      }
    })

    if (hasConflict) {
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: conflictReason,
        home_by: (member.home_by_time as string) || '18:00',
        zone_match: false, has_car: Boolean(member.has_car),
        day_jobs: dayJobs, reason: 'conflict',
      })
      continue
    }

    // ── SCORING ──
    let score = 100

    // 0. Zone match (strongest signal)
    const jobZone = guessZoneFromAddress(clientAddress)
    const memberZones = (member.service_zones as string[] | null) || []
    const zoneMatch = jobZone ? memberZones.includes(jobZone) : false
    const hasCar = Boolean(member.has_car)
    if (zoneMatch) score += 50
    if (!zoneMatch && memberZones.length > 0) score -= 30
    if (jobZone && zoneRequiresCar(jobZone) && !hasCar) score -= 80

    // 1. Distance to member's home (proximity baseline)
    let distMiles: number | undefined
    if (jobCoords) {
      let homeCoords: { lat: number; lng: number } | null =
        member.home_latitude && member.home_longitude
          ? { lat: Number(member.home_latitude), lng: Number(member.home_longitude) }
          : null
      if (!homeCoords && member.address) {
        homeCoords = await geocodeAddress(member.address as string)
        if (homeCoords) {
          supabaseAdmin
            .from('team_members')
            .update({ home_latitude: homeCoords.lat, home_longitude: homeCoords.lng })
            .eq('id', member.id)
            .then(() => {})
        }
      }
      if (homeCoords) {
        distMiles = calculateDistance(jobCoords.lat, jobCoords.lng, homeCoords.lat, homeCoords.lng)
        score += Math.max(0, 30 - distMiles * 3)
      }
    }

    // 2. Clustering bonus with other jobs that day
    let clusterBonus = 0
    if (jobCoords && memberBookings.length > 0) {
      for (const b of memberBookings) {
        const c = b.clients as ClientFK
        let bCoords: { lat: number; lng: number } | null = null
        if (c?.latitude && c?.longitude) bCoords = { lat: Number(c.latitude), lng: Number(c.longitude) }
        else if (c?.address) bCoords = await geocodeAddress(c.address)
        if (bCoords) {
          const d = calculateDistance(jobCoords.lat, jobCoords.lng, bCoords.lat, bCoords.lng)
          if (d < 1) clusterBonus += 20
          else if (d < 3) clusterBonus += 10
          else if (d < 5) clusterBonus += 5
        }
      }
    }
    score += clusterBonus

    // 3. Travel-from-previous + travel-to-next labels
    let travelFromPrev: number | undefined
    let travelToNext: number | undefined
    let prevJobLabel: string | undefined
    let nextJobLabel: string | undefined
    if (jobCoords && memberBookings.length > 0) {
      const prevJob = memberBookings
        .filter((b) => toMin(b.end_time as string) <= slotStartMin)
        .sort((a, b) => toMin(b.end_time as string) - toMin(a.end_time as string))[0]
      if (prevJob) {
        const c = prevJob.clients as ClientFK
        prevJobLabel = `${formatTime(toMin(prevJob.start_time as string))} ${c?.name || 'Client'}`
        let prevCoords: { lat: number; lng: number } | null = null
        if (c?.latitude && c?.longitude) prevCoords = { lat: Number(c.latitude), lng: Number(c.longitude) }
        else if (c?.address) prevCoords = await geocodeAddress(c.address)
        if (prevCoords) {
          const d = calculateDistance(prevCoords.lat, prevCoords.lng, jobCoords.lat, jobCoords.lng)
          travelFromPrev = estimateTransitMinutes(d)
          score += Math.max(0, 20 - travelFromPrev * 0.5)
        }
      }

      const nextJob = memberBookings
        .filter((b) => toMin(b.start_time as string) >= slotEndMin)
        .sort((a, b) => toMin(a.start_time as string) - toMin(b.start_time as string))[0]
      if (nextJob) {
        const c = nextJob.clients as ClientFK
        nextJobLabel = `${formatTime(toMin(nextJob.start_time as string))} ${c?.name || 'Client'}`
        let nextCoords: { lat: number; lng: number } | null = null
        if (c?.latitude && c?.longitude) nextCoords = { lat: Number(c.latitude), lng: Number(c.longitude) }
        else if (c?.address) nextCoords = await geocodeAddress(c.address)
        if (nextCoords) {
          const d = calculateDistance(jobCoords.lat, jobCoords.lng, nextCoords.lat, nextCoords.lng)
          travelToNext = estimateTransitMinutes(d)
        }
      }
    }

    // 4. Home-by-time check using the actual last job of the day
    const homeBy = (member.home_by_time as string) || '18:00'
    const [hbH, hbM] = homeBy.split(':').map(Number)
    const homeByMin = hbH * 60 + hbM
    let travelToHome: number | undefined
    let canMakeHome = true
    if (jobCoords) {
      let homeCoords: { lat: number; lng: number } | null =
        member.home_latitude && member.home_longitude
          ? { lat: Number(member.home_latitude), lng: Number(member.home_longitude) }
          : null
      if (!homeCoords && member.address) {
        homeCoords = await geocodeAddress(member.address as string)
      }
      if (homeCoords) {
        const allJobEnds = [...memberBookings.map((b) => toMin(b.end_time as string)), slotEndMin]
        const lastEndMin = Math.max(...allJobEnds)
        // Find the coordinates of whichever job ends last (might not be this one)
        let lastJobCoords = jobCoords
        if (lastEndMin !== slotEndMin) {
          const lastJob = memberBookings.find((b) => toMin(b.end_time as string) === lastEndMin)
          if (lastJob) {
            const c = lastJob.clients as ClientFK
            if (c?.latitude && c?.longitude) lastJobCoords = { lat: Number(c.latitude), lng: Number(c.longitude) }
            else if (c?.address) lastJobCoords = (await geocodeAddress(c.address)) || jobCoords
          }
        }
        const homeDist = calculateDistance(lastJobCoords.lat, lastJobCoords.lng, homeCoords.lat, homeCoords.lng)
        travelToHome = estimateTransitMinutes(homeDist)
        canMakeHome = lastEndMin + travelToHome <= homeByMin
        if (!canMakeHome) score -= 50
      }
    }

    let reason = ''
    if (zoneMatch && clusterBonus >= 20) reason = 'Zone match + near other jobs'
    else if (zoneMatch) reason = 'Zone match'
    else if (clusterBonus >= 20) reason = 'Near other jobs'
    else if (distMiles && distMiles < 2) reason = 'Close to home'
    else if (canMakeHome) reason = 'Available'
    if (!canMakeHome) reason = `Won't make home by ${homeBy}`
    if (jobZone && zoneRequiresCar(jobZone) && !hasCar) reason = 'No car — area requires driving'

    scores.push({
      id: member.id,
      name: member.name,
      score,
      available: true,
      distance_miles: distMiles ? Math.round(distMiles * 10) / 10 : undefined,
      travel_from_prev_min: travelFromPrev,
      travel_to_next_min: travelToNext,
      travel_to_home_min: travelToHome,
      prev_job_label: prevJobLabel,
      next_job_label: nextJobLabel,
      home_by: homeBy,
      can_make_home: canMakeHome,
      zone_match: zoneMatch,
      has_car: hasCar,
      day_jobs: dayJobs,
      reason,
    })
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
