// @ts-nocheck
import { supabaseAdmin } from '@/app/site/wash-and-fold-hoboken/_lib/supabase'
import { geocodeAddress, calculateDistance, estimateTransitMinutes, geocodeClient } from '@/app/site/wash-and-fold-hoboken/_lib/geo'
import { guessZoneFromAddress, zoneRequiresCar } from '@/app/site/wash-and-fold-hoboken/_lib/service-zones'

interface CleanerScore {
  id: string
  name: string
  score: number  // higher = better fit
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

// Score a cleaner for a specific booking slot, factoring in:
// 1. Geographic proximity to the job (closer = better)
// 2. Clustering with their other jobs that day (less total travel = better)
// 3. Can they get home on time after this job?
export async function scoreCleanersForBooking(opts: {
  date: string
  startTime: string // HH:MM
  durationHours: number
  clientAddress: string
  clientId?: string
  excludeBookingId?: string
}): Promise<CleanerScore[]> {
  const { date, startTime, durationHours, clientAddress, clientId, excludeBookingId } = opts

  // Geocode the job address
  let jobCoords: { lat: number; lng: number } | null = null
  if (clientId) {
    const { data: client } = await supabaseAdmin.from('clients').select('latitude, longitude').eq('id', clientId).single()
    if (client?.latitude && client?.longitude) {
      jobCoords = { lat: Number(client.latitude), lng: Number(client.longitude) }
    }
  }
  if (!jobCoords) {
    jobCoords = await geocodeAddress(clientAddress)
    // Cache it on the client
    if (jobCoords && clientId) {
      geocodeClient(clientId, clientAddress).catch(() => {})
    }
  }

  // Get day info
  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })

  // Get all active cleaners
  const { data: allCleaners } = await supabaseAdmin
    .from('cleaners')
    .select('id, name, address, home_latitude, home_longitude, home_by_time, working_days, schedule, unavailable_dates, max_jobs_per_day, service_zones, has_car')
    .eq('active', true)

  // Get existing bookings for the day
  let bookingsQuery = supabaseAdmin
    .from('bookings')
    .select('id, cleaner_id, start_time, end_time, clients(name, address, latitude, longitude)')
    .gte('start_time', date + 'T00:00:00')
    .lte('start_time', date + 'T23:59:59')
    .neq('status', 'cancelled')

  if (excludeBookingId) bookingsQuery = bookingsQuery.neq('id', excludeBookingId)
  const { data: dayBookings } = await bookingsQuery

  const [sh, sm] = startTime.split(':').map(Number)
  const slotStartMin = sh * 60 + sm
  const slotEndMin = slotStartMin + durationHours * 60
  const BUFFER = 60

  const scores: CleanerScore[] = []

  for (const cleaner of allCleaners || []) {
    // Check if cleaner works this day
    const worksToday = (() => {
      if (cleaner.unavailable_dates?.includes(date)) return false
      if (cleaner.working_days?.length > 0) return cleaner.working_days.includes(dayOfWeek)
      if (cleaner.schedule && Object.keys(cleaner.schedule).length > 0) return cleaner.schedule[dayOfWeek] != null
      return true
    })()

    if (!worksToday) {
      scores.push({ id: cleaner.id, name: cleaner.name, score: -1, available: false, conflict: 'Not scheduled to work', home_by: cleaner.home_by_time || '18:00', zone_match: false, has_car: cleaner.has_car || false, day_jobs: [], reason: 'off' })
      continue
    }

    // Check time conflicts
    const cleanerBookings = (dayBookings || []).filter(b => b.cleaner_id === cleaner.id)
    let hasConflict = false
    let conflictReason = ''

    for (const b of cleanerBookings) {
      const bStartMin = toMin(b.start_time)
      const bEndMin = toMin(b.end_time)
      if (slotStartMin < bEndMin + BUFFER && slotEndMin + BUFFER > bStartMin) {
        hasConflict = true
        const client = (b.clients as any)
        conflictReason = `Conflict: ${formatTime(bStartMin)} (${client?.name || 'Client'})`
        break
      }
    }

    // Max jobs check
    if (!hasConflict && cleaner.max_jobs_per_day && cleanerBookings.length >= cleaner.max_jobs_per_day) {
      hasConflict = true
      conflictReason = `Max ${cleaner.max_jobs_per_day} jobs/day`
    }

    // Build day jobs list
    const dayJobs = cleanerBookings.map(b => ({
      time: formatTime(toMin(b.start_time)),
      client: (b.clients as any)?.name || 'Client',
      address: (b.clients as any)?.address || '',
    }))

    if (hasConflict) {
      scores.push({ id: cleaner.id, name: cleaner.name, score: -1, available: false, conflict: conflictReason, home_by: cleaner.home_by_time || '18:00', zone_match: false, has_car: cleaner.has_car || false, day_jobs: dayJobs, reason: 'conflict' })
      continue
    }

    // ── SCORING ──
    let score = 100

    // 0. Zone match (strongest signal)
    const jobZone = guessZoneFromAddress(clientAddress)
    const cleanerZones: string[] = cleaner.service_zones || []
    const zoneMatch = jobZone ? cleanerZones.includes(jobZone) : false
    const hasCar = cleaner.has_car || false

    if (zoneMatch) score += 50  // big bonus for zone match
    if (!zoneMatch && cleanerZones.length > 0) score -= 30  // penalty if cleaner has zones but this isn't one

    // Car check: if zone requires car and cleaner doesn't have one, heavy penalty
    if (jobZone && zoneRequiresCar(jobZone) && !hasCar) score -= 80

    // 1. Distance from job to cleaner's home (proximity baseline)
    let distMiles: number | undefined
    if (jobCoords) {
      let homeCoords = cleaner.home_latitude && cleaner.home_longitude
        ? { lat: Number(cleaner.home_latitude), lng: Number(cleaner.home_longitude) }
        : null

      if (!homeCoords && cleaner.address) {
        homeCoords = await geocodeAddress(cleaner.address)
        if (homeCoords) {
          supabaseAdmin.from('cleaners').update({ home_latitude: homeCoords.lat, home_longitude: homeCoords.lng }).eq('id', cleaner.id).then(() => {})
        }
      }

      if (homeCoords) {
        distMiles = calculateDistance(jobCoords.lat, jobCoords.lng, homeCoords.lat, homeCoords.lng)
        // Closer to home = better (max 30 pts for <1mi, 0 pts for >10mi)
        score += Math.max(0, 30 - distMiles * 3)
      }
    }

    // 2. Clustering bonus: how close is this job to their other jobs that day?
    let clusterBonus = 0
    if (jobCoords && cleanerBookings.length > 0) {
      for (const b of cleanerBookings) {
        const client = b.clients as any
        let bCoords: { lat: number; lng: number } | null = null
        if (client?.latitude && client?.longitude) {
          bCoords = { lat: Number(client.latitude), lng: Number(client.longitude) }
        } else if (client?.address) {
          bCoords = await geocodeAddress(client.address)
        }
        if (bCoords) {
          const d = calculateDistance(jobCoords.lat, jobCoords.lng, bCoords.lat, bCoords.lng)
          // <1mi from another job = +20, <3mi = +10, <5mi = +5
          if (d < 1) clusterBonus += 20
          else if (d < 3) clusterBonus += 10
          else if (d < 5) clusterBonus += 5
        }
      }
    }
    score += clusterBonus

    // 3. Travel from previous job
    let travelFromPrev: number | undefined
    if (jobCoords && cleanerBookings.length > 0) {
      // Find the job ending just before this slot
      const prevJob = cleanerBookings
        .filter(b => toMin(b.end_time) <= slotStartMin)
        .sort((a, b) => toMin(b.end_time) - toMin(a.end_time))[0]

      if (prevJob) {
        const prevClient = prevJob.clients as any
        let prevCoords: { lat: number; lng: number } | null = null
        if (prevClient?.latitude && prevClient?.longitude) {
          prevCoords = { lat: Number(prevClient.latitude), lng: Number(prevClient.longitude) }
        } else if (prevClient?.address) {
          prevCoords = await geocodeAddress(prevClient.address)
        }
        if (prevCoords) {
          const d = calculateDistance(prevCoords.lat, prevCoords.lng, jobCoords.lat, jobCoords.lng)
          travelFromPrev = estimateTransitMinutes(d)
          // Less travel = better (max 20 pts for <10min, 0 for >40min)
          score += Math.max(0, 20 - travelFromPrev * 0.5)
        }
      }
    }

    // 4. Can they get home on time?
    const homeBy = cleaner.home_by_time || '18:00'
    const [hbH, hbM] = homeBy.split(':').map(Number)
    const homeByMin = hbH * 60 + hbM
    let travelToHome: number | undefined
    let canMakeHome = true

    // Figure out what the last job of the day would be (including this new one)
    const allJobEnds = [...cleanerBookings.map(b => toMin(b.end_time)), slotEndMin]
    const lastEndMin = Math.max(...allJobEnds)

    if (jobCoords) {
      let homeCoords = cleaner.home_latitude && cleaner.home_longitude
        ? { lat: Number(cleaner.home_latitude), lng: Number(cleaner.home_longitude) }
        : null
      if (!homeCoords && cleaner.address) {
        homeCoords = await geocodeAddress(cleaner.address)
      }
      if (homeCoords) {
        // Find the address of whichever job ends last
        let lastJobCoords = jobCoords // default: this new job is last
        if (lastEndMin !== slotEndMin) {
          // Another job ends later — find its coords
          const lastJob = cleanerBookings.find(b => toMin(b.end_time) === lastEndMin)
          if (lastJob) {
            const lc = lastJob.clients as any
            if (lc?.latitude && lc?.longitude) lastJobCoords = { lat: Number(lc.latitude), lng: Number(lc.longitude) }
            else if (lc?.address) lastJobCoords = (await geocodeAddress(lc.address)) || jobCoords
          }
        }

        const homeDist = calculateDistance(lastJobCoords.lat, lastJobCoords.lng, homeCoords.lat, homeCoords.lng)
        travelToHome = estimateTransitMinutes(homeDist)
        canMakeHome = (lastEndMin + travelToHome) <= homeByMin

        if (!canMakeHome) score -= 50 // heavy penalty
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
      id: cleaner.id,
      name: cleaner.name,
      score,
      available: true,
      distance_miles: distMiles ? Math.round(distMiles * 10) / 10 : undefined,
      travel_from_prev_min: travelFromPrev,
      travel_to_home_min: travelToHome,
      home_by: homeBy,
      can_make_home: canMakeHome,
      zone_match: zoneMatch,
      has_car: hasCar,
      day_jobs: dayJobs,
      reason,
    })
  }

  // Sort: available first (highest score), then unavailable
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
