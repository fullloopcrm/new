// Reconciliation: proves the REAL generated bookings actually match what
// each recurring schedule says should exist. Read-only -- never mutates
// anything, so a false positive here can't touch live data. Ported from the
// nycmaid standalone build's recurring-reconcile.ts (2026-07-20 "recurring
// booking rebuild"), which caught a real 17-month service gap on an active
// client during testing. Adapted to this codebase's multi-tenant model
// (tenantDb scoping) and percent-only discount (applyDiscount) instead of
// nycmaid's discount_type/discount_value pair.
//
// This directly answers "is each schedule's actual booking count true" --
// it checks each expected date actually has a booking, each existing
// booking is actually expected, and where a booking exists for an expected
// date, its time/price match the schedule's CURRENT configuration.
import { tenantDb } from './tenant-db'
import { nextOccurrenceDates, nowNaiveET, type RecurringType } from './recurring'
import { applyDiscount } from './discount'

export interface ReconcileIssue {
  schedule_id: string
  client_name: string
  type: 'missing_booking' | 'unexpected_booking' | 'price_drift' | 'time_drift'
  date: string
  detail: string
  booking_id?: string
}

export interface ReconcileReport {
  schedules_checked: number
  window_days: number
  issues: ReconcileIssue[]
  by_type: Record<ReconcileIssue['type'], number>
}

function toMin(timeStr: string): number {
  const [, t] = timeStr.split('T')
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}

/**
 * Check a tenant's active schedules' actual bookings against what each
 * schedule's current config says should exist, over the next `windowDays`.
 * Short window by design -- this is an operational drift check (did the
 * cron do what it should have this week/month), not a full-horizon audit.
 */
export async function reconcileRecurringSchedules(tenantId: string, windowDays = 60): Promise<ReconcileReport> {
  const db = tenantDb(tenantId)
  const todayStr = nowNaiveET().slice(0, 10)
  const windowEnd = new Date(`${todayStr}T12:00:00Z`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + windowDays)
  const windowEndStr = windowEnd.toISOString().slice(0, 10)

  const { data: schedules } = await db
    .from('recurring_schedules')
    .select('id, client_id, recurring_type, day_of_week, preferred_time, duration_hours, hourly_rate, discount_percent, team_member_id, status, created_at, next_generate_after, clients(name)')
    .eq('status', 'active')

  const issues: ReconcileIssue[] = []
  const byType: Record<ReconcileIssue['type'], number> = {
    missing_booking: 0, unexpected_booking: 0, price_drift: 0, time_drift: 0,
  }

  for (const schedule of schedules || []) {
    const clientName = (schedule.clients as { name?: string } | null)?.name || 'Unknown'

    // Anchor to this schedule's actual earliest booking -- biweekly/
    // triweekly/monthly patterns have a real established phase, and
    // generating "expected" dates from today instead of that phase produces
    // dates offset by a full interval from every real booking.
    const { data: firstBooking } = await db
      .from('bookings')
      .select('start_time')
      .eq('schedule_id', schedule.id)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle()
    const anchorDateStr = String(firstBooking?.start_time || schedule.created_at).slice(0, 10)
    const anchorDate = new Date(`${anchorDateStr}T12:00:00Z`)
    anchorDate.setUTCDate(anchorDate.getUTCDate() - 1) // nextOccurrenceDates excludes its own anchor

    const weeksNeeded = Math.max(4, Math.ceil((windowEnd.getTime() - anchorDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 2)
    const generated = nextOccurrenceDates({
      recurringType: schedule.recurring_type as RecurringType,
      lastOccurrence: anchorDate,
      dayOfWeek: schedule.day_of_week ?? undefined,
      count: weeksNeeded,
    }).map((d) => d.toISOString().slice(0, 10))
    const expectedDates = [anchorDateStr, ...generated].filter((d) => d >= todayStr && d <= windowEndStr)
    const expectedSet = new Set(expectedDates)

    const { data: actualBookings } = await db
      .from('bookings')
      .select('id, start_time, end_time, price')
      .eq('schedule_id', schedule.id)
      .in('status', ['scheduled', 'pending'])
      .gte('start_time', `${todayStr}T00:00:00`)
      .lte('start_time', `${windowEndStr}T23:59:59`)

    const actualByDate = new Map<string, NonNullable<typeof actualBookings>[number]>()
    for (const b of actualBookings || []) actualByDate.set(String(b.start_time).slice(0, 10), b)

    for (const date of expectedDates) {
      const booking = actualByDate.get(date)
      if (!booking) {
        // Only a real gap if the schedule has already committed to having
        // generated through this date (next_generate_after). Dates beyond
        // that are the cron's job on a future run, not drift -- expecting
        // them now would flag every freshly-created schedule as broken.
        if (!schedule.next_generate_after || date <= schedule.next_generate_after) {
          issues.push({ schedule_id: schedule.id, client_name: clientName, type: 'missing_booking', date, detail: `Schedule expects a booking on ${date} but none exists` })
          byType.missing_booking++
        }
        continue
      }

      if (schedule.preferred_time) {
        const m = String(schedule.preferred_time).match(/(\d{1,2})\D+(\d{2})/)
        if (m) {
          const expectedMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
          const actualMin = toMin(booking.start_time as string)
          if (Math.abs(expectedMin - actualMin) > 1) {
            issues.push({ schedule_id: schedule.id, client_name: clientName, type: 'time_drift', date, booking_id: booking.id, detail: `Expected ${schedule.preferred_time}, booking is at ${String(Math.floor(actualMin / 60)).padStart(2, '0')}:${String(actualMin % 60).padStart(2, '0')}` })
            byType.time_drift++
          }
        }
      }

      if (schedule.hourly_rate) {
        const hours = (toMin(booking.end_time as string) - toMin(booking.start_time as string)) / 60
        if (hours > 0) {
          const expectedPrice = applyDiscount(Math.round(schedule.hourly_rate * hours * 100), schedule.discount_percent)
          if (Math.abs((booking.price || 0) - expectedPrice) > 1000) {
            issues.push({ schedule_id: schedule.id, client_name: clientName, type: 'price_drift', date, booking_id: booking.id, detail: `Booking is $${((booking.price || 0) / 100).toFixed(0)}, schedule implies $${(expectedPrice / 100).toFixed(0)}` })
            byType.price_drift++
          }
        }
      }
    }

    // Unexpected: a real booking exists on a date the schedule's current
    // pattern wouldn't generate (stale from a prior pattern, or a
    // duplicate-schedule collision).
    for (const [date, booking] of actualByDate) {
      if (!expectedSet.has(date)) {
        issues.push({ schedule_id: schedule.id, client_name: clientName, type: 'unexpected_booking', date, booking_id: booking.id, detail: `Booking exists on ${date} but the current pattern (${schedule.recurring_type}) wouldn't generate it` })
        byType.unexpected_booking++
      }
    }
  }

  return { schedules_checked: schedules?.length || 0, window_days: windowDays, issues, by_type: byType }
}
