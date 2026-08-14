// Pure, read-only projection of recurring revenue/jobs for the rest of the
// current year. NEVER creates, updates, or deletes a `bookings` row -- output
// is math only, safe to recompute on every dashboard load. This exists
// because the real generators (cron/generate-recurring, the admin/client
// recurring-schedule routes) only ever materialize a short horizon of real
// booking rows at a time by design (see docs/RECURRING-REBUILD-DESIGN.md +
// the Catherine Mollerus runaway-bookings incident that capped every
// generator's horizon) -- so "how many bookings exist right now" understates
// the rest of the year, and can also have genuine mid-series holes (see
// recurring-reconcile.ts's documented "17-month service gap" finding).
//
// Anchors each schedule on its own established phase (its earliest real
// booking this year, matching recurring-reconcile.ts's approach) rather than
// "today" or "last real booking" -- anchoring on today/last-date would
// offset a biweekly/monthly-weekday schedule's projected dates by up to a
// full interval from its real cadence, and anchoring on "last real date"
// alone would treat a schedule with a stray far-future booking as "fully
// covered" even if it has a real gap earlier in the year still to come.
// Every expected occurrence from that phase through year-end is walked;
// dates that already have a matching real (non-cancelled) booking are
// skipped (already counted in the dashboard's real totals) so nothing is
// ever double-counted, and only remaining GAPS at-or-after today are
// projected -- a past gap is a service-delivery fact already reflected in
// Actual, not a forward forecast.
import { nextOccurrenceDates, type RecurringType } from './recurring'
import { applyDiscount } from './discount'

export interface ForecastSchedule {
  id: string
  recurring_type: RecurringType
  day_of_week: number | null
  days_of_week: number[] | null
  duration_hours: number | null
  hourly_rate: number | null
  discount_percent: number | null
  custom_interval_days: number | null
  /** 'YYYY-MM-DD' -- this schedule's earliest real, non-cancelled booking
   * date this year. Used to anchor the expected-date cadence so it aligns
   * with the schedule's real established pattern. */
  phase_anchor_ymd: string
}

export interface ForecastMonthBucket {
  jobs: number
  revenue_cents: number
}

// Upper bound on raw occurrences requested per schedule -- daily cadence
// from the phase anchor through Dec 31 needs at most ~365 dates; this leaves
// headroom for every recurringType without materializing anything, so a
// generous constant costs nothing.
const MAX_OCCURRENCES_PER_SCHEDULE = 400

export function computeRecurringForecast({
  schedules,
  realDatesByScheduleId,
  skippedDates,
  todayYMD,
  yearEndYMD,
}: {
  schedules: ForecastSchedule[]
  /** Set of `${scheduleId}:${YYYY-MM-DD}` for every real, non-cancelled
   * booking date this schedule already has -- an expected date matching one
   * of these is real, not a gap, and must NOT be projected. */
  realDatesByScheduleId: Set<string>
  /** Set of `${scheduleId}:${YYYY-MM-DD}` skip-exception dates -- an
   * explicitly cancelled occurrence, also never projected. */
  skippedDates: Set<string>
  todayYMD: string
  yearEndYMD: string
}): { total: ForecastMonthBucket; byMonth: ForecastMonthBucket[] } {
  const byMonth: ForecastMonthBucket[] = Array.from({ length: 12 }, () => ({ jobs: 0, revenue_cents: 0 }))
  const total: ForecastMonthBucket = { jobs: 0, revenue_cents: 0 }

  for (const s of schedules) {
    const anchor = new Date(`${s.phase_anchor_ymd}T12:00:00Z`)

    const hours = Number(s.duration_hours) || 3
    const rate = Number(s.hourly_rate) || 0
    const priceCents = rate > 0 ? applyDiscount(Math.round(rate * hours * 100), s.discount_percent) : 0

    // Every expected occurrence AFTER the phase anchor (the anchor itself is
    // real by construction, already counted, and correctly excluded by
    // nextOccurrenceDates' own drop-the-echo behavior).
    const dates = nextOccurrenceDates({
      recurringType: s.recurring_type,
      lastOccurrence: anchor,
      dayOfWeek: s.day_of_week ?? undefined,
      daysOfWeek: s.days_of_week ?? undefined,
      count: MAX_OCCURRENCES_PER_SCHEDULE,
      customIntervalDays: s.custom_interval_days ?? undefined,
    })

    for (const d of dates) {
      const dateStr = d.toISOString().slice(0, 10)
      if (dateStr > yearEndYMD) break
      if (dateStr < todayYMD) continue // past gap -- already reflected in Actual, not a forward forecast
      if (realDatesByScheduleId.has(`${s.id}:${dateStr}`)) continue // already real, don't double-count
      if (skippedDates.has(`${s.id}:${dateStr}`)) continue // explicitly cancelled occurrence
      const monthIdx = Number(dateStr.slice(5, 7)) - 1
      byMonth[monthIdx].jobs += 1
      byMonth[monthIdx].revenue_cents += priceCents
      total.jobs += 1
      total.revenue_cents += priceCents
    }
  }

  return { total, byMonth }
}
