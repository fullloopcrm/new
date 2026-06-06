import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { guessZoneFromAddress } from '@/lib/service-zones'
import { worksOnDay } from '@/lib/nycmaid/day-availability'

// HARD-CODED test mode. Flip to false ONLY after the broadcast pipeline is
// verified end-to-end with a single test team member. Mass-SMS guard
// (feedback_no_mass_sms): keep TEST_MODE on until explicitly cleared.
export const TEST_MODE = true
export const TEST_CLEANER_NAME_SUBSTRING = 'jeff tucker'
export const BROADCAST_CAP = 50
export const BUFFER_HOURS = 1.5

type CleanerRow = {
  id: string
  name: string
  phone: string | null
  working_days: string[] | null
  unavailable_dates: string[] | null
  service_zones: string[] | null
  has_car: boolean | null
  max_jobs_per_day: number | null
  hourly_rate: number | null
  preferred_language: string | null
}

type BookingRow = {
  id: string
  team_member_id: string | null
  start_time: string
  end_time: string | null
  status: string
}

export type EligibleCleaner = {
  id: string
  name: string
  phone: string | null
  preferred_language: 'en' | 'es' | null
  reasons_excluded: string[]
  eligible: boolean
  jobs_that_day: number
}

function dayOfWeekShort(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })
}

function bookingOverlapsWindow(b: BookingRow, windowStart: Date, windowEnd: Date): boolean {
  const bStart = new Date(b.start_time)
  const bEnd = b.end_time ? new Date(b.end_time) : new Date(bStart.getTime() + 2 * 3600 * 1000)
  const bufferedStart = new Date(bStart.getTime() - BUFFER_HOURS * 3600 * 1000)
  const bufferedEnd = new Date(bEnd.getTime() + BUFFER_HOURS * 3600 * 1000)
  return bufferedStart < windowEnd && bufferedEnd > windowStart
}

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
  const tenantId = ctx.tenantId

  const body = await request.json().catch(() => ({}))
  const { job_date, start_time, duration_hours, qty_needed, job_address } = body as {
    job_date?: string
    start_time?: string
    duration_hours?: number
    qty_needed?: number
    job_address?: string
  }

  if (!job_date || !start_time || !duration_hours) {
    return NextResponse.json({ error: 'job_date, start_time, duration_hours required' }, { status: 400 })
  }

  const [sh, sm] = start_time.split(':').map(Number)
  const jobStart = new Date(`${job_date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`)
  const jobEnd = new Date(jobStart.getTime() + duration_hours * 3600 * 1000)
  const windowStart = new Date(jobStart.getTime() - BUFFER_HOURS * 3600 * 1000)
  const windowEnd = new Date(jobEnd.getTime() + BUFFER_HOURS * 3600 * 1000)

  const targetZone = job_address ? guessZoneFromAddress(job_address) : null
  const dow = dayOfWeekShort(job_date)

  const { data: cleaners, error: cErr } = await supabaseAdmin
    .from('team_members')
    .select('id, name, phone, working_days, unavailable_dates, service_zones, has_car, max_jobs_per_day, hourly_rate, preferred_language')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, team_member_id, start_time, end_time, status')
    .eq('tenant_id', tenantId)
    .gte('start_time', job_date + 'T00:00:00')
    .lte('start_time', job_date + 'T23:59:59')
    .in('status', ['pending', 'scheduled', 'confirmed', 'in_progress'])

  const bookingsByCleaner = new Map<string, BookingRow[]>()
  for (const b of (bookings || []) as BookingRow[]) {
    if (!b.team_member_id) continue
    const arr = bookingsByCleaner.get(b.team_member_id) || []
    arr.push(b)
    bookingsByCleaner.set(b.team_member_id, arr)
  }

  const evaluated: EligibleCleaner[] = (cleaners as CleanerRow[] || []).map((c) => {
    const reasons: string[] = []

    if (TEST_MODE && !c.name.toLowerCase().includes(TEST_CLEANER_NAME_SUBSTRING)) {
      reasons.push('TEST MODE — only the test cleaner is messaged')
    }
    if (c.unavailable_dates?.includes(job_date)) {
      reasons.push('Marked unavailable that day')
    }
    if (worksOnDay(c.working_days, job_date) === false) {
      reasons.push(`Doesn't work ${dow}`)
    }
    if (!c.phone) {
      reasons.push('No phone on file')
    }
    if (targetZone && c.service_zones && c.service_zones.length > 0 && !c.service_zones.includes(targetZone)) {
      reasons.push(`Doesn't service ${targetZone}`)
    }

    const cleanerBookings = bookingsByCleaner.get(c.id) || []
    const jobsThatDay = cleanerBookings.length

    if (c.max_jobs_per_day && jobsThatDay >= c.max_jobs_per_day) {
      reasons.push(`Max jobs (${c.max_jobs_per_day}) hit`)
    }
    const conflict = cleanerBookings.find((b) => bookingOverlapsWindow(b, windowStart, windowEnd))
    if (conflict) {
      const cStart = new Date(conflict.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
      reasons.push(`Conflict at ${cStart} (±${BUFFER_HOURS}hr)`)
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      preferred_language: (c.preferred_language as 'en' | 'es' | null) || 'en',
      reasons_excluded: reasons,
      eligible: reasons.length === 0,
      jobs_that_day: jobsThatDay,
    }
  })

  return NextResponse.json({
    test_mode: TEST_MODE,
    job_date,
    job_zone: targetZone,
    window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
    eligible: evaluated.filter((c) => c.eligible),
    excluded: evaluated.filter((c) => !c.eligible),
    qty_needed: qty_needed || 1,
    cap: BROADCAST_CAP,
  })
}
