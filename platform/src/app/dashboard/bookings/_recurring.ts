// Client-side "initial batch" date generator for the admin New/Edit Booking
// recurring UI (BookingsAdmin.tsx / CreateBookingForm.tsx / EditBookingForm.tsx
// via _RecurringOptions.tsx). NOT the canonical recurring-type module -- that's
// src/lib/recurring.ts, which cron/generate-recurring's REFILL passes use.
//
// The two exist side by side on purpose, not by duplication: this generator
// understands the admin UI's "repeat end" concept (never / after N
// occurrences / on a specific date) and produces the exact date array that
// gets POSTed straight into POST /api/admin/recurring-schedules as the
// initial occurrences. lib/recurring.ts's generateRecurringDates has no
// equivalent "repeat end" parameter -- refills only ever ask for a rolling
// window of N-more-occurrences off the last real visit (see
// nextOccurrenceDates), so it never needed one. Collapsing these two into a
// single function means either teaching the refill path a repeat-end concept
// it doesn't use, or losing the admin UI's "until this date" / "after N
// visits" option -- both bigger, riskier changes than this pass; see
// docs/RECURRING-REBUILD-DESIGN.md.
//
// getRecurringDisplayName and the unused regex-based generateScheduleDates/
// getIntervalDays interval-from-label-string parser that used to live in this
// file were the actual duplicate logic docs/RECURRING-REBUILD-DESIGN.md flags
// -- both retired here in favor of the single canonical
// src/lib/recurring.ts#getRecurringDisplayName (a strict superset: identical
// output for every repeatType this UI ever passes, plus a 'monthly_weekday'
// alias). See _RecurringOptions.tsx for the re-export.

export function generateRecurringDates(
  startDate: string,
  repeatEnabled: boolean,
  repeatType: string,
  repeatEnd: string,
  repeatEndCount: number,
  repeatEndDate: string,
  customInterval: number
): string[] {
  if (!repeatEnabled || !startDate) return [startDate]

  const dates: string[] = []
  const start = new Date(startDate + 'T12:00:00')

  // "Never" = through end of next year, "after" = specific count
  const endOfNextYear = new Date(start.getFullYear() + 1, 11, 31)
  const maxDates = repeatEnd === 'after' ? repeatEndCount : 500 // high cap, date limit will stop it
  const endDate = repeatEnd === 'never'
    ? endOfNextYear
    : (repeatEnd === 'on_date' && repeatEndDate ? new Date(repeatEndDate + 'T12:00:00') : null)

  let current = new Date(start)

  // For monthly_day, we need special handling
  if (repeatType === 'monthly_day') {
    const targetDay = start.getDay() // 0-6
    const targetWeek = Math.ceil(start.getDate() / 7) // 1-5

    let month = start.getMonth()
    let year = start.getFullYear()

    while (dates.length < maxDates) {
      // Find the Nth occurrence of the target day in this month
      const firstOfMonth = new Date(year, month, 1)
      let firstOccurrence = 1
      while (new Date(year, month, firstOccurrence).getDay() !== targetDay) {
        firstOccurrence++
      }
      const targetDate = firstOccurrence + (targetWeek - 1) * 7
      const lastDay = new Date(year, month + 1, 0).getDate()

      if (targetDate <= lastDay) {
        // Noon-anchored to match `start` (also noon-anchored above) -- a
        // midnight-anchored `date` here compares less-than a same-day noon
        // `start`, which silently dropped the anchor month's own occurrence
        // (the Nth-weekday-of-month this branch derives FROM `start` always
        // resolves to `start` itself in the anchor month).
        const date = new Date(year, month, targetDate, 12, 0, 0)
        if (date >= start) {
          if (endDate && date > endDate) break
          dates.push(date.toISOString().split('T')[0])
        }
      }

      month++
      if (month > 11) { month = 0; year++ }
    }
    return dates
  }

  // For other types
  while (dates.length < maxDates) {
    if (endDate && current > endDate) break
    dates.push(current.toISOString().split('T')[0])

    switch (repeatType) {
      case 'daily':
        current.setDate(current.getDate() + 1)
        break
      case 'weekly':
        current.setDate(current.getDate() + 7)
        break
      case 'biweekly':
        current.setDate(current.getDate() + 14)
        break
      case 'triweekly':
        current.setDate(current.getDate() + 21)
        break
      case 'monthly_date':
        current.setMonth(current.getMonth() + 1)
        break
      case 'custom':
        current.setDate(current.getDate() + (customInterval * 7)) // weeks, not days
        break
      default:
        current.setDate(current.getDate() + 7)
    }
  }

  return dates
}

// Payload for PUT /api/bookings/batch-update's "pattern unchanged, apply to
// all future occurrences" edit in BookingsAdmin.tsx. That route spreads this
// object straight into a tenant-scoped `bookings` table update with no
// field allowlist/aliasing (unlike its single-booking, /regenerate, and
// recurring-schedules PUT siblings, which all alias the nycmaid-era
// `cleaner_id` body key to the real `bookings.team_member_id` column).
// bookings has never had a `cleaner_id` column -- only the legacy per-tenant
// site booking tables ported in from nycmaid do -- so sending `cleaner_id`
// here 400s every row in the batch on an unknown-column error, and the
// resulting `if (!res.ok)` early-return silently skips BOTH the schedule-
// record PUT and the per-booking team save that follow it, breaking the
// entire "apply to all future" edit (price/notes/hours/lead reassignment)
// whenever the recurring pattern itself wasn't also changed.
export function buildSeriesUpdateData(opts: {
  startTime: string
  endTime: string
  teamMemberId: string | null
  price: number
  hourlyRate: number | null
  serviceType: string
  notes: string | null
  recurringType: string | null
  discountPercent?: number | null
}): Record<string, unknown> {
  return {
    start_time: opts.startTime,
    end_time: opts.endTime,
    team_member_id: opts.teamMemberId,
    price: opts.price,
    hourly_rate: opts.hourlyRate,
    service_type: opts.serviceType,
    notes: opts.notes,
    recurring_type: opts.recurringType,
    discount_percent: opts.discountPercent ?? null,
  }
}

// getRecurringDisplayName used to be duplicated here (byte-for-byte identical
// to src/lib/recurring.ts's version for every repeatType this UI passes).
// Retired 2026-07-28 -- callers now import it from the canonical module via
// _RecurringOptions.tsx's re-export. See that file and
// docs/RECURRING-REBUILD-DESIGN.md.
//
// generateScheduleDates()/getIntervalDays() -- the regex-based "re-derive an
// interval from a display-name string" parser docs/RECURRING-REBUILD-DESIGN.md
// specifically calls out as duplicate logic -- were also removed here: grep
// across the repo found zero callers (superseded by
// src/lib/recurring.ts#nextOccurrenceDates, which cron/generate-recurring
// actually uses for refills).
