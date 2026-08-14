// Read-only sanity check for computeRecurringForecast against real nycmaid
// data. Writes nothing -- reads recurring_schedules/bookings/recurring_exceptions
// only. Run with: npx tsx scripts/verify-recurring-forecast.ts
import { createClient } from '@supabase/supabase-js'
import { computeRecurringForecast, type ForecastSchedule } from '../src/lib/recurring-forecast'
import type { RecurringType } from '../src/lib/recurring'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const todayYMD = '2026-08-14'
  const yearEndYMD = '2026-12-31'

  const { data: schedules, error: schedErr } = await sb
    .from('recurring_schedules')
    .select('id, recurring_type, day_of_week, days_of_week, duration_hours, hourly_rate, discount_percent, created_at')
    .eq('tenant_id', NYCMAID_TENANT_ID)
    .eq('status', 'active')
  if (schedErr) throw schedErr
  console.log(`active schedules: ${schedules?.length}`)

  const scheduleIds = (schedules || []).map((s) => s.id)

  // Pull EVERY real booking ever for these schedules (not just this year) --
  // phase anchoring needs the true earliest occurrence, and a schedule that
  // started in 2025 would otherwise get a wrong anchor from an unbounded
  // lower date filter.
  const { data: bookings, error: bookErr } = await sb
    .from('bookings')
    .select('schedule_id, start_time, status')
    .eq('tenant_id', NYCMAID_TENANT_ID)
    .in('schedule_id', scheduleIds)
    .in('status', ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress'])
    .order('start_time', { ascending: true })
  if (bookErr) throw bookErr

  const earliestByScheduleId = new Map<string, string>()
  const realDatesByScheduleId = new Set<string>()
  for (const b of bookings || []) {
    const sid = String(b.schedule_id)
    const d = String(b.start_time).slice(0, 10)
    realDatesByScheduleId.add(`${sid}:${d}`)
    if (!earliestByScheduleId.has(sid)) earliestByScheduleId.set(sid, d) // first seen = earliest, since ordered asc
  }
  console.log(`schedules with at least one real booking (any time): ${earliestByScheduleId.size}`)

  const { data: exceptions, error: exErr } = await sb
    .from('recurring_exceptions')
    .select('schedule_id, occurrence_date, type')
    .eq('tenant_id', NYCMAID_TENANT_ID)
    .in('schedule_id', scheduleIds)
    .eq('type', 'skip')
  if (exErr) throw exErr
  const skippedDates = new Set((exceptions || []).map((e) => `${e.schedule_id}:${e.occurrence_date}`))
  console.log(`skip exceptions: ${skippedDates.size}`)

  const forecastSchedules: ForecastSchedule[] = (schedules || []).map((s) => ({
    id: s.id,
    recurring_type: s.recurring_type as RecurringType,
    day_of_week: s.day_of_week,
    days_of_week: s.days_of_week,
    duration_hours: s.duration_hours,
    hourly_rate: s.hourly_rate,
    discount_percent: s.discount_percent,
    custom_interval_days: null,
    phase_anchor_ymd: earliestByScheduleId.get(s.id) ?? String(s.created_at).slice(0, 10),
  }))

  for (const s of forecastSchedules) {
    console.log(`schedule ${s.id.slice(0,8)} type=${s.recurring_type} rate=${s.hourly_rate} phaseAnchor=${s.phase_anchor_ymd}`)
  }

  const { total, byMonth } = computeRecurringForecast({
    schedules: forecastSchedules,
    realDatesByScheduleId,
    skippedDates,
    todayYMD,
    yearEndYMD,
  })

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  console.log('\n--- PROJECTED (gaps + tail, beyond real bookings) by month ---')
  byMonth.forEach((m, i) => {
    if (m.jobs > 0) console.log(`${monthNames[i]}: ${m.jobs} jobs, $${(m.revenue_cents / 100).toFixed(0)}`)
  })
  console.log(`\nTOTAL projected: ${total.jobs} jobs, $${(total.revenue_cents / 100).toFixed(0)}`)

  // Real (already-booked) totals for the same remaining window, for comparison.
  let realJobs = 0, realCents = 0
  for (const b of bookings || []) {
    const d = String(b.start_time).slice(0, 10)
    if (d >= todayYMD && d <= yearEndYMD) { realJobs++ }
  }
  console.log(`\nreal (already booked) jobs today->12/31 across these schedules: ${realJobs}`)
  console.log(`combined (real + projected) recurring jobs today->12/31: ${realJobs + total.jobs}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
