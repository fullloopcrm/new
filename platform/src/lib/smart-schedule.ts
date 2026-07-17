/**
 * Smart-schedule scoring — industry-neutral team-member matching for any
 * home-services business (cleaning, HVAC, landscaping, pest, etc).
 * Multi-tenant: all queries scoped by tenant_id.
 *
 * Multi-tech aware: a team_member is "on" a booking if they're the lead
 * (bookings.team_member_id) OR listed in booking_team_members (extras). Both
 * count as conflicts for scheduling.
 *
 * Required team_members columns (added in migration 049):
 *   home_latitude, home_longitude, home_by_time, service_zones.
 * Required clients columns (added in migration 050):
 *   preferred_team_member_id.
 *
 * Industry-specific rules (e.g. cleaning's "labor-only vs supplies-included")
 * are NOT baked in here. They belong in tenant-config / per-industry hooks.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { geocodeAddress, calculateDistance, estimateTransitMinutes } from '@/lib/geo'
import { guessZoneFromAddress, zoneRequiresCar } from '@/lib/service-zones'
import { worksScheduledDay, slotWithinHours, hoursWindowForDate } from '@/lib/day-availability'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

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
  is_preferred: boolean // client's preferred team member — strongest signal
  day_jobs: { time: string; client: string; address: string }[]
  reason: string
}

type ClientFK = { name?: string | null; address?: string | null; latitude?: number | string | null; longitude?: number | string | null } | null

/**
 * Score every team member for a candidate booking slot. Factors:
 * 1. Preferred team member (+200) — strongest signal, ahead of zone match
 * 2. Zone match (+50) / mismatch (-30)
 * 3. Zone requires car but member doesn't have one (-80)
 * 4. Proximity from member's home (max +30 for <1mi)
 * 5. Clustering with the member's other jobs that day (+5/+10/+20)
 * 6. Travel-from-previous job penalty (max +20 for <10min commute)
 * 7. Won't make it home by `home_by_time` after this slot (-50)
 *
 * Multi-tech: a member is conflicted on a booking when they're the lead
 * (bookings.team_member_id) OR an extra (booking_team_members row).
 *
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
  hourlyRate?: number // cleaning labor-only rule: <=60 = labor-only job
  jobCoords?: { lat: number; lng: number } // pre-resolved job coords — skips geocoding (suggestBookingSlots geocodes once, not per candidate time)
}): Promise<TeamMemberScore[]> {
  const { tenantId, date, startTime, durationHours, clientAddress, clientId, excludeBookingId, hourlyRate } = opts
  // If booking is labor-only ($59), labor_only members are fine. If supplies ($69+), they can't do it.
  const bookingIsLaborOnly = hourlyRate != null && hourlyRate <= 60

  // Geocode the job address — prefer caller-provided coords, then cached client
  // coords. Also pull preferred team-member id for the +200 score bonus.
  let jobCoords: { lat: number; lng: number } | null = opts.jobCoords || null
  let preferredMemberId: string | null = null
  if (clientId) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('latitude, longitude, preferred_team_member_id')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()
    if (!jobCoords && client?.latitude && client?.longitude) {
      jobCoords = { lat: Number(client.latitude), lng: Number(client.longitude) }
    }
    preferredMemberId = (client?.preferred_team_member_id as string | null) || null
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
    .select('id, name, address, home_latitude, home_longitude, home_by_time, working_days, schedule, unavailable_dates, max_jobs_per_day, service_zones, has_car, labor_only, status')
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

  // Multi-tech: pull booking_team_members rows for any of today's bookings so
  // a team_member who's listed as an extra on someone else's booking is also
  // counted as conflicted. Fall back to empty when the table isn't populated.
  const dayBookingIds = (dayBookings || []).map((b) => b.id as string)
  const teamMap = new Map<string, string[]>() // booking_id -> [team_member_ids]
  if (dayBookingIds.length > 0) {
    const { data: teamRows } = await supabaseAdmin
      .from('booking_team_members')
      .select('booking_id, team_member_id')
      .eq('tenant_id', tenantId)
      .in('booking_id', dayBookingIds)
    for (const r of teamRows || []) {
      const list = teamMap.get(r.booking_id as string) || []
      list.push(r.team_member_id as string)
      teamMap.set(r.booking_id as string, list)
    }
  }

  const [sh, sm] = startTime.split(':').map(Number)
  const slotStartMin = sh * 60 + sm
  const slotEndMin = slotStartMin + durationHours * 60
  const BUFFER = 60

  // HR termination is tracked separately from team_members.status/active (see
  // getTerminatedTeamMemberIds) — a fired member's row is neither deleted nor
  // flipped to status='inactive', so without this check every caller of this
  // function (admin/client smart-schedule suggestions, client/book's auto-
  // suggest, and the generate-recurring cron's smart-assign path) could score
  // and pick a terminated employee for a NEW future booking. Fixed once here so
  // every caller inherits it instead of re-implementing the check per route.
  const terminatedIds = new Set(
    await getTerminatedTeamMemberIds(tenantId, (allMembers || []).map((m) => m.id as string))
  )

  const scores: TeamMemberScore[] = []

  for (const member of allMembers || []) {
    const isPreferred = member.id === preferredMemberId

    if (terminatedIds.has(member.id)) {
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: 'No longer employed',
        home_by: (member.home_by_time as string) || 'No limit',
        zone_match: false, has_car: Boolean(member.has_car),
        is_preferred: isPreferred,
        day_jobs: [], reason: 'terminated',
      })
      continue
    }

    // Day-of-week availability — canonical resolver (handles numeric + name formats;
    // no/all-off days = NOT available). See day-availability.worksScheduledDay.
    const worksToday = (() => {
      if ((member.unavailable_dates as string[] | null)?.includes(date)) return false
      return worksScheduledDay(member.working_days as string[] | null, member.schedule as Record<string, unknown> | null, date)
    })()

    if (!worksToday) {
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: 'Not scheduled to work',
        home_by: (member.home_by_time as string) || 'No limit',
        zone_match: false, has_car: Boolean(member.has_car),
        is_preferred: isPreferred,
        day_jobs: [], reason: 'off',
      })
      continue
    }

    // Honor working HOURS, not just the day. A member who works 8–5 must not be
    // suggested for a slot starting before or ending after those hours. Mirrors
    // booking-creation enforcement so suggestions and booking agree.
    if (!slotWithinHours(member.schedule as Record<string, unknown> | null, date, slotStartMin, slotEndMin)) {
      const w = hoursWindowForDate(member.schedule as Record<string, unknown> | null, date)
      const hoursLabel = w ? `Works ${formatTime(w.start)}–${formatTime(w.end)}` : 'Outside working hours'
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: hoursLabel,
        home_by: (member.home_by_time as string) || 'No limit',
        zone_match: false, has_car: Boolean(member.has_car),
        is_preferred: isPreferred,
        day_jobs: [], reason: 'outside_hours',
      })
      continue
    }

    // Time-conflict + max-jobs-per-day. A member is "on" a booking if they're
    // the lead OR listed in booking_team_members for that booking.
    const memberBookings = (dayBookings || []).filter((b) => {
      if (b.team_member_id === member.id) return true
      const extras = teamMap.get(b.id as string) || []
      return extras.includes(member.id)
    })

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
        home_by: (member.home_by_time as string) || 'No limit',
        zone_match: false, has_car: Boolean(member.has_car),
        is_preferred: isPreferred,
        day_jobs: dayJobs, reason: 'conflict',
      })
      continue
    }

    // Hard zone rule: a member only services their own zones. Job in a known zone
    // they don't cover → NOT eligible (hard block, not a scoring penalty). Members
    // with no zones configured aren't gated.
    const hardJobZone = guessZoneFromAddress(clientAddress)
    const memberZonesHard = (member.service_zones as string[] | null) || []
    if (hardJobZone && memberZonesHard.length > 0 && !memberZonesHard.includes(hardJobZone)) {
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: `Outside service zone (${hardJobZone.replace(/_/g, ' ')})`,
        home_by: (member.home_by_time as string) || 'No limit',
        zone_match: false, has_car: Boolean(member.has_car),
        is_preferred: isPreferred, day_jobs: dayJobs, reason: 'out_of_zone',
      })
      continue
    }
    // Hard car rule: car-required zones (Staten Island, Long Island, Westchester,
    // NJ-other) aren't reachable without a vehicle → NOT eligible.
    if (hardJobZone && zoneRequiresCar(hardJobZone) && !Boolean(member.has_car)) {
      scores.push({
        id: member.id, name: member.name, score: -1, available: false,
        conflict: `Needs a car (${hardJobZone.replace(/_/g, ' ')})`,
        home_by: (member.home_by_time as string) || 'No limit',
        zone_match: false, has_car: false,
        is_preferred: isPreferred, day_jobs: dayJobs, reason: 'needs_car',
      })
      continue
    }

    // ── SCORING ──
    let score = 100

    // 0a. Preferred team member — strongest possible signal. The client picked
    // this tech before; barring conflict/zone/car blockers, they win.
    if (isPreferred) score += 200

    // 0b. Zone match (next strongest). Out-of-zone + car-required are already
    // hard-blocked above, so here it's purely a positive/negative score signal.
    const jobZone = hardJobZone
    const memberZones = (member.service_zones as string[] | null) || []
    const zoneMatch = jobZone ? memberZones.includes(jobZone) : false
    const hasCar = Boolean(member.has_car)
    if (zoneMatch) score += 50
    if (!zoneMatch && memberZones.length > 0) score -= 30

    // Supplies vs labor-only: a supply job ($69/hr+) can't go to a labor-only
    // member. (nycmaid cleaning rule.)
    const isLaborOnly = Boolean((member as { labor_only?: boolean | null }).labor_only)
    if (!bookingIsLaborOnly && isLaborOnly) score -= 100

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

    // 4. Can they get home on time? Only enforced when a home-by is actually set.
    // Null/empty = "No limit" (no pickup constraint) → no penalty, no flag.
    const hasHomeBy = !!member.home_by_time
    const homeBy = (member.home_by_time as string) || ''
    const [hbH, hbM] = ((member.home_by_time as string) || '18:00').split(':').map(Number)
    const homeByMin = hbH * 60 + hbM
    let travelToHome: number | undefined
    let canMakeHome = true
    if (jobCoords && hasHomeBy) {
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
    if (isPreferred) reason = "Client's preferred tech"
    else if (zoneMatch && clusterBonus >= 20) reason = 'Zone match + near other jobs'
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
      home_by: hasHomeBy ? homeBy : 'No limit',
      can_make_home: canMakeHome,
      zone_match: zoneMatch,
      has_car: hasCar,
      is_preferred: isPreferred,
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

/**
 * Pick the best N available team members as a team. Returns the lead first
 * (highest-scoring available member), then extras in score order.
 * Falls back gracefully if fewer than N members are available.
 */
export function pickBestTeam(scores: TeamMemberScore[], teamSize: number): {
  lead: TeamMemberScore | null
  extras: TeamMemberScore[]
  short: number  // how many slots couldn't be filled (0 if fully staffed)
} {
  const available = scores.filter((s) => s.available).sort((a, b) => b.score - a.score)
  const want = Math.max(1, Math.floor(teamSize))
  const team = available.slice(0, want)
  return {
    lead: team[0] || null,
    extras: team.slice(1),
    short: Math.max(0, want - team.length),
  }
}

// ── Alternate-time suggestions ──────────────────────────────────────────────
// Ported from NYC Maid (src/lib/smart-schedule.ts suggestBookingSlots, 2026-06-25),
// adapted to FullLoop's tenant-scoped team_members model. The client_properties
// branch is intentionally dropped — that table isn't ported to FL yet.

export interface SlotSuggestion {
  time24: string            // "12:30" — feed straight back into a booking
  label: string             // "12:30 PM" — display
  cleanerId: string
  cleanerName: string
  score: number             // the top member's score for this slot
  reason: string            // human reason, clustering-aware
  travelFromPrevMin?: number
  teamShort?: number        // unfilled team slots (teamSize > 1 only); 0 = fully staffed
}

const SUGGEST_BUSINESS_START_MIN = 8 * 60   // 8:00 AM — earliest start
const SUGGEST_LAST_START_MIN = 16 * 60      // 4:00 PM — latest start
const SUGGEST_BUSINESS_END_MIN = 19 * 60    // service must finish by 7:00 PM
const SUGGEST_STEP_MIN = 30                 // 30-min granularity → allows 12:30
const PREFERRED_POCKET_MIN = [8 * 60, 12 * 60, 16 * 60] // 8am / 12pm / 4pm

/**
 * Suggest the best alternate start times for a job, ranked smart-cluster first.
 *
 * Reuses the proven scoreTeamForBooking per candidate time (run in parallel) —
 * so the matching rules never drift from the single-time path. The job address
 * is geocoded ONCE here and passed through, so we don't hit the geocoder per slot.
 *
 * @returns up to `limit` suggestions, each pairing a workable time with the best
 *          team member for it. Empty array = nothing works that day.
 */
export async function suggestBookingSlots(opts: {
  tenantId: string
  date: string
  durationHours: number
  clientAddress: string
  clientId?: string
  hourlyRate?: number
  teamSize?: number
  requestedTime?: string   // "HH:MM" — excluded from results (we want ALTERNATIVES to it)
  excludeBookingId?: string
  limit?: number           // default 3
  stepMin?: number         // candidate-time granularity; default 30. Public form passes 60 (hourly picker).
}): Promise<SlotSuggestion[]> {
  const { tenantId, date, durationHours, clientAddress, clientId, hourlyRate, requestedTime, excludeBookingId } = opts
  const teamSize = Math.max(1, Math.floor(opts.teamSize || 1))
  const limit = Math.max(1, opts.limit || 3)
  const stepMin = opts.stepMin && opts.stepMin > 0 ? opts.stepMin : SUGGEST_STEP_MIN
  const durationMin = Math.round(durationHours * 60)

  // Geocode the job once; every candidate-time scoring reuses these coords.
  let jobCoords: { lat: number; lng: number } | undefined
  if (clientId && !clientAddress) {
    const { data: client } = await supabaseAdmin
      .from('clients').select('latitude, longitude').eq('id', clientId).eq('tenant_id', tenantId).single()
    if (client?.latitude && client?.longitude) jobCoords = { lat: Number(client.latitude), lng: Number(client.longitude) }
  }
  if (!jobCoords && clientAddress) {
    const geo = await geocodeAddress(clientAddress)
    if (geo) jobCoords = geo
  }

  // Build candidate start times: every step from 8:00 to the last start that
  // still finishes by 7pm (capped at 4pm). Skip the requested time itself.
  const reqMin = requestedTime ? hhmmToMin(requestedTime) : null
  const lastStart = Math.min(SUGGEST_LAST_START_MIN, SUGGEST_BUSINESS_END_MIN - durationMin)
  const candidates: number[] = []
  for (let m = SUGGEST_BUSINESS_START_MIN; m <= lastStart; m += stepMin) {
    if (reqMin != null && m === reqMin) continue
    candidates.push(m)
  }

  // Score every candidate time in parallel. Each call reuses the proven scorer.
  const scored = await Promise.all(candidates.map(async (startMin) => {
    const scores = await scoreTeamForBooking({
      tenantId,
      date,
      startTime: minToHHMM(startMin),
      durationHours,
      clientAddress,
      clientId,
      hourlyRate,
      excludeBookingId,
      jobCoords,
    })
    const team = pickBestTeam(scores, teamSize)
    return { startMin, top: team.lead, teamShort: team.short }
  }))

  // Keep only times that actually have an available top member.
  const usable = scored.filter((s): s is { startMin: number; top: TeamMemberScore; teamShort: number } => !!s.top)

  // Rank "smart-cluster first": the member's slot score already encodes clustering
  // + zone + preferred + proximity. Add a preferred-pocket nudge and a mild
  // closeness-to-requested-time nudge so ties break sensibly.
  const ranked = usable.map(({ startMin, top, teamShort }) => {
    let rank = top.score
    if (PREFERRED_POCKET_MIN.includes(startMin)) rank += 15
    if (reqMin != null) rank += Math.max(0, 12 - Math.abs(startMin - reqMin) / 30 * 2)
    return { startMin, top, teamShort, rank }
  }).sort((a, b) => b.rank - a.rank)

  return ranked.slice(0, limit).map(({ startMin, top, teamShort }) => ({
    time24: minToHHMM(startMin),
    label: formatTime(startMin),
    cleanerId: top.id,
    cleanerName: top.name,
    score: Math.round(top.score),
    reason: buildSuggestionReason(top),
    travelFromPrevMin: top.travel_from_prev_min,
    teamShort: teamSize > 1 ? teamShort : undefined,
  }))
}

// Craft the "why this slot" line, leaning into the clustering win when there is
// one ("Victor's nearby, 8 min from his noon job") since that's the whole point.
function buildSuggestionReason(c: TeamMemberScore): string {
  const first = c.name.split(' ')[0]
  if (c.travel_from_prev_min != null && c.prev_job_label) {
    return `${first} is nearby — ${c.travel_from_prev_min} min from their ${c.prev_job_label} job`
  }
  if (c.is_preferred) return `${first} is the client's preferred team member`
  if (c.zone_match) return `${first} works this area`
  if (c.distance_miles != null && c.distance_miles < 2) return `${first} is close by`
  return `${first} is available`
}

function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
