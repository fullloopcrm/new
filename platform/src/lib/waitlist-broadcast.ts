// Auto-broadcast a newly-created waitlist booking to eligible cleaners.
//
// Reuses the exact eligibility rules from /api/admin/find-cleaner/preview and
// the exact send mechanics from /api/admin/find-cleaner/send (message
// building, cleaner_broadcasts/cleaner_broadcast_recipients bookkeeping) —
// this does NOT reimplement availability logic, it calls the same TEST_MODE /
// BROADCAST_CAP guarded path those routes already use, so the mass-SMS safety
// gate (feedback_no_mass_sms) applies automatically here too: until Jeff
// flips TEST_MODE to false in find-cleaner/preview/route.ts, this only ever
// messages the "jeff tucker" test row, regardless of how many cleaners are
// actually eligible.
import { supabaseAdmin } from './supabase'
import { tenantDb } from './tenant-db'
import { sendSMS } from './sms'
import { guessZoneFromAddress, SERVICE_ZONES } from './service-zones'
import { worksScheduledDay, slotWithinHours } from './day-availability'
import { TEST_MODE, TEST_CLEANER_NAME_SUBSTRING, BROADCAST_CAP, BUFFER_HOURS } from '@/app/api/admin/find-cleaner/preview/route'

type CleanerRow = {
  id: string
  name: string
  phone: string | null
  working_days: string[] | null
  schedule: Record<string, unknown> | null
  unavailable_dates: string[] | null
  service_zones: string[] | null
  max_jobs_per_day: number | null
  hourly_rate: number | null
  preferred_language: string | null
}

// Applicants aren't hired yet — they can't claim a job, so this is a
// secondary, softer nudge ("contact us to activate your portal"), same
// wording/eligibility rule as the manual find-cleaner/broadcast-booking tool.
// Still gated by the same TEST_MODE flag as the team-member send below: an
// automated trigger fanning SMS out to unvetted applicants is exactly the
// kind of change feedback_no_mass_sms exists for.
const EXCLUDED_APPLICANT_STATUSES = ['accepted', 'rejected']
type ApplicantRow = { id: string; name: string | null; phone: string | null; status: string | null }

type BookingRow = {
  id: string
  team_member_id: string | null
  start_time: string
  end_time: string | null
  status: string
}

function bookingOverlapsWindow(b: BookingRow, windowStart: Date, windowEnd: Date): boolean {
  const bStart = new Date(b.start_time)
  const bEnd = b.end_time ? new Date(b.end_time) : new Date(bStart.getTime() + 2 * 3600 * 1000)
  const bufferedStart = new Date(bStart.getTime() - BUFFER_HOURS * 3600 * 1000)
  const bufferedEnd = new Date(bEnd.getTime() + BUFFER_HOURS * 3600 * 1000)
  return bufferedStart < windowEnd && bufferedEnd > windowStart
}

function zoneLabel(zoneId: string | null, lang: 'en' | 'es'): string {
  if (!zoneId) return ''
  const z = SERVICE_ZONES.find((s) => s.id === zoneId)
  if (!z) return zoneId
  return lang === 'es' ? z.labelES : z.label
}

function fmtTimeRange(date: string, start: string, hours: number, lang: 'en' | 'es'): { date: string; time: string } {
  const [sh, sm] = start.split(':').map(Number)
  // startD/endD are built from naive local (ET) components with no timezone
  // marker — an explicit `timeZone: 'America/New_York'` here would
  // double-convert them (same bug fixed throughout lib/time-window.ts).
  // Omitting `timeZone` formats using the same interpretation used to parse,
  // so it round-trips to the original digits while still using Intl for
  // correct locale-aware AM/PM (e.g. Spanish "a. m."/"p. m.").
  const startD = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`)
  const endD = new Date(startD.getTime() + hours * 3600 * 1000)
  const locale = lang === 'es' ? 'es-US' : 'en-US'
  const dateStr = startD.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
  const startStr = startD.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  const endStr = endD.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  return { date: dateStr, time: `${startStr}-${endStr}` }
}

function buildMessage(opts: {
  brand: string
  replyNumber: string
  cleanerName: string
  job_date: string
  start_time: string
  duration_hours: number
  zone: string | null
  hourly_rate: number | null
  lang: 'en' | 'es'
  testMode: boolean
  isWaitlist: boolean
}): string {
  const { brand, replyNumber, cleanerName, job_date, start_time, duration_hours, zone, hourly_rate, lang, testMode, isWaitlist } = opts
  const firstName = cleanerName.split(' ')[0]
  const t = fmtTimeRange(job_date, start_time, duration_hours, lang)
  const zoneTxt = zone ? zoneLabel(zone, lang) : ''
  const rateTxt = hourly_rate ? `$${hourly_rate}/hr` : ''
  const testPrefix = testMode ? '[TEST] ' : ''
  const waitlistTag = isWaitlist ? (lang === 'es' ? 'NUEVO — ' : 'NEW — ') : ''

  if (lang === 'es') {
    return [
      `${testPrefix}${waitlistTag}Hola ${firstName}, ${brand}.`,
      `¿Disponible ${t.date} ${t.time}${zoneTxt ? ` en ${zoneTxt}` : ''}?`,
      rateTxt ? `Pago: ${rateTxt}.` : '',
      `Responde SI al ${replyNumber} si estás disponible, o reclama el trabajo en tu portal.`,
    ].filter(Boolean).join(' ')
  }
  return [
    `${testPrefix}${waitlistTag}Hi ${firstName}, ${brand}.`,
    `Available ${t.date} ${t.time}${zoneTxt ? ` in ${zoneTxt}` : ''}?`,
    rateTxt ? `Pay: ${rateTxt}.` : '',
    `Reply YES to ${replyNumber} if available, or claim it in your portal.`,
  ].filter(Boolean).join(' ')
}

export interface BroadcastWaitlistBookingResult {
  attempted: boolean
  reason?: string
  eligible_count?: number
  sent?: number
  failed?: number
  applicants_sent?: number
  test_mode?: boolean
}

/**
 * Find eligible (not already working that slot) active cleaners and text
 * them about a newly-created waitlist booking. Mirrors
 * /api/admin/find-cleaner/{preview,send} exactly (same eligibility rules,
 * same TEST_MODE/BROADCAST_CAP gate) — this is the automated trigger, those
 * routes remain the manual admin-driven path for any other booking.
 */
export async function broadcastWaitlistBooking(opts: {
  tenantId: string
  jobDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  durationHours: number
  jobAddress: string | null
  hourlyRate: number | null
  serviceType: string | null
}): Promise<BroadcastWaitlistBookingResult> {
  const { tenantId, jobDate, startTime, durationHours, jobAddress, hourlyRate, serviceType } = opts

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) {
    return { attempted: false, reason: 'Tenant has no Telnyx SMS number configured' }
  }
  const brand = tenant.name || 'Our team'
  const replyNumber = tenant.telnyx_phone

  const [sh, sm] = startTime.split(':').map(Number)
  const jobStart = new Date(`${jobDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`)
  const jobEnd = new Date(jobStart.getTime() + durationHours * 3600 * 1000)
  const windowStart = new Date(jobStart.getTime() - BUFFER_HOURS * 3600 * 1000)
  const windowEnd = new Date(jobEnd.getTime() + BUFFER_HOURS * 3600 * 1000)
  const slotStartMin = sh * 60 + sm
  const slotEndMin = slotStartMin + durationHours * 60

  const targetZone = jobAddress ? guessZoneFromAddress(jobAddress) : null

  const { data: cleaners } = await tenantDb(tenantId)
    .from('team_members')
    .select('id, name, phone, working_days, schedule, unavailable_dates, service_zones, max_jobs_per_day, hourly_rate, preferred_language')
    .eq('status', 'active')

  const { data: dayBookings } = await tenantDb(tenantId)
    .from('bookings')
    .select('id, team_member_id, start_time, end_time, status')
    .gte('start_time', jobDate + 'T00:00:00')
    .lte('start_time', jobDate + 'T23:59:59')
    .in('status', ['pending', 'scheduled', 'confirmed', 'in_progress'])

  const bookingsByCleaner = new Map<string, BookingRow[]>()
  for (const b of (dayBookings || []) as BookingRow[]) {
    if (!b.team_member_id) continue
    const arr = bookingsByCleaner.get(b.team_member_id) || []
    arr.push(b)
    bookingsByCleaner.set(b.team_member_id, arr)
  }

  // Same exclusion rules as find-cleaner/preview — a cleaner already working
  // (scheduled/confirmed/in_progress) that slot, or off, or out of zone,
  // never gets texted.
  const eligible = ((cleaners as CleanerRow[]) || []).filter((c) => {
    if (!c.phone) return false
    if (c.unavailable_dates?.includes(jobDate)) return false
    if (
      ((c.working_days?.length || 0) > 0 || (c.schedule && Object.keys(c.schedule).length > 0)) &&
      !worksScheduledDay(c.working_days, c.schedule, jobDate)
    ) return false
    if (!slotWithinHours(c.schedule, jobDate, slotStartMin, slotEndMin)) return false
    if (targetZone && c.service_zones && c.service_zones.length > 0 && !c.service_zones.includes(targetZone)) return false

    const cleanerBookings = bookingsByCleaner.get(c.id) || []
    if (c.max_jobs_per_day && cleanerBookings.length >= c.max_jobs_per_day) return false
    if (cleanerBookings.find((b) => bookingOverlapsWindow(b, windowStart, windowEnd))) return false

    return true
  })

  const capped = eligible.slice(0, BROADCAST_CAP)

  // Mass-SMS guard (feedback_no_mass_sms): identical filter to
  // find-cleaner/send — hard-locked to the test cleaner until Jeff clears it.
  const recipients = capped.filter((c) => !TEST_MODE || c.name.toLowerCase().includes(TEST_CLEANER_NAME_SUBSTRING))

  // Secondary, softer nudge to unvetted applicants — they can't claim (not
  // onboarded), so no claim link, just "come activate your portal." Computed
  // independently of active-cleaner eligibility above: applicants should
  // still hear about the opening even when zero active cleaners are free —
  // arguably especially then. Same TEST_MODE gate as the active-cleaner send.
  const { data: applicants } = await tenantDb(tenantId)
    .from('cleaner_applications')
    .select('id, name, phone, status')
  const eligibleApplicants = ((applicants as ApplicantRow[]) || []).filter(
    (a) => !!a.phone && !(a.status && EXCLUDED_APPLICANT_STATUSES.includes(a.status)),
  )
  const applicantRecipients = eligibleApplicants
    .slice(0, BROADCAST_CAP)
    .filter((a) => !TEST_MODE || (a.name || '').toLowerCase().includes(TEST_CLEANER_NAME_SUBSTRING))

  if (recipients.length === 0 && applicantRecipients.length === 0) {
    return {
      attempted: true,
      eligible_count: eligible.length,
      sent: 0,
      failed: 0,
      applicants_sent: 0,
      test_mode: TEST_MODE,
    }
  }

  const [sh2, sm2] = startTime.split(':').map(Number)
  const endMinutes = sh2 * 60 + sm2 + Math.round(durationHours * 60)
  const end_time = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

  const sampleMsg = recipients[0] ? buildMessage({
    brand, replyNumber, cleanerName: recipients[0].name,
    job_date: jobDate, start_time: startTime, duration_hours: durationHours, zone: targetZone,
    hourly_rate: hourlyRate ?? recipients[0].hourly_rate,
    lang: (recipients[0].preferred_language as 'en' | 'es') || 'en',
    testMode: TEST_MODE, isWaitlist: true,
  }) : `[No eligible active-cleaner recipients — ${eligible.length} eligible, all filtered by TEST_MODE]`

  const { data: broadcast } = await tenantDb(tenantId)
    .from('cleaner_broadcasts')
    .insert({
      job_date: jobDate, start_time: startTime, end_time,
      qty_needed: 1,
      job_address: jobAddress,
      job_zone: targetZone,
      hourly_rate: hourlyRate,
      service_type: serviceType,
      message: sampleMsg,
      notes: 'Auto-broadcast — waitlist booking',
      status: 'open',
      test_mode: TEST_MODE,
    })
    .select()
    .single()

  if (!broadcast) {
    return { attempted: true, eligible_count: eligible.length, reason: 'Failed to record broadcast', test_mode: TEST_MODE }
  }

  const results = await Promise.all(
    recipients.map(async (c) => {
      const lang = (c.preferred_language as 'en' | 'es') || 'en'
      const message = buildMessage({
        brand, replyNumber, cleanerName: c.name,
        job_date: jobDate, start_time: startTime, duration_hours: durationHours, zone: targetZone,
        hourly_rate: hourlyRate ?? c.hourly_rate,
        lang, testMode: TEST_MODE, isWaitlist: true,
      })
      // sendSMS() throws on failure and resolves with Telnyx's raw response
      // (no `.success` field) on success — it never returns an
      // { success, error } shape. Checking `.success` was always falsy, so
      // every successful send was being logged as "failed".
      let ok = true
      let deliveryStatus = 'sent'
      try {
        await sendSMS({
          to: c.phone!, body: message,
          telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone,
        })
      } catch (err) {
        ok = false
        deliveryStatus = err instanceof Error ? err.message : 'failed'
      }
      await tenantDb(tenantId).from('cleaner_broadcast_recipients').insert({
        broadcast_id: broadcast.id,
        cleaner_id: c.id,
        phone: c.phone,
        status: ok ? 'pending' : 'failed',
        delivery_status: deliveryStatus,
      })
      return ok
    })
  )

  const applicantMessage = [
    "There's an available cleaning — contact us to activate your portal to claim it.",
    'You must have your own supplies and equipment. Reply STOP to stop receiving messages.',
    '',
    'Hay una limpieza disponible — contáctenos para activar su portal y reclamarla.',
    'Debe tener sus propios suministros y equipo. Responda STOP para dejar de recibir mensajes.',
  ].join('\n')

  const applicantResults = await Promise.all(
    applicantRecipients.map(async (a) => {
      let ok = true
      let deliveryStatus = 'sent'
      try {
        await sendSMS({
          to: a.phone!, body: (TEST_MODE ? '[TEST] ' : '') + applicantMessage,
          telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone,
        })
      } catch (err) {
        ok = false
        deliveryStatus = err instanceof Error ? err.message : 'failed'
      }
      await tenantDb(tenantId).from('cleaner_broadcast_recipients').insert({
        broadcast_id: broadcast.id,
        cleaner_id: a.id, // no FK on this column — applicant id, not a team_members id
        phone: a.phone,
        status: ok ? 'pending' : 'failed',
        delivery_status: deliveryStatus,
      })
      return ok
    })
  )

  return {
    attempted: true,
    eligible_count: eligible.length,
    sent: results.filter(Boolean).length,
    failed: results.filter((r) => !r).length,
    applicants_sent: applicantResults.filter(Boolean).length,
    test_mode: TEST_MODE,
  }
}
