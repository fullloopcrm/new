// Keeps already-generated future bookings in sync with their recurring
// schedule when an admin edits it. Without this, an edit only affects
// bookings the cron generates AFTER the edit -- everything already sitting
// in the DB (often weeks out) keeps the stale day/time/rate/discount
// forever. Ported from the nycmaid standalone build's recurring-sync.ts
// (2026-07-20 "recurring booking rebuild"), adapted to this codebase's
// multi-tenant model (tenantDb scoping) and its percent-only discount +
// naive-ET time conventions (computeNaiveVisitWindow/nowNaiveET in
// lib/recurring.ts) instead of nycmaid's discount_type/discount_value pair
// and raw new Date().toISOString() cutoff.
//
// Behavior: changing day/time SHIFTS all future not-yet-occurred bookings
// onto the new pattern immediately -- it does not leave near-term visits on
// the old day. Rows are updated in place (never deleted/recreated) so
// booking IDs, tokens, and history survive; this also avoids firing the
// cancellation notifications a DELETE+recreate would.
import { tenantDb } from './tenant-db'
import { nextOccurrenceDates, computeNaiveVisitWindow, nowNaiveET, type RecurringType } from './recurring'
import { applyDiscount } from './discount'

export interface ScheduleSyncFields {
  recurring_type: RecurringType
  day_of_week: number | null
  preferred_time: string | null // 'HH:MM' or 'HH:MM:SS'
  duration_hours: number
  hourly_rate: number | null
  discount_percent: number | null
}

export interface BookingChange {
  booking_id: string
  old_start_time: string
  new_start_time: string
  old_end_time: string
  new_end_time: string
}

export interface SyncResult {
  bookings_synced: number
  bookings_skipped: number
  skipped_reasons: string[]
  new_next_generate_after: string | null
  preview?: BookingChange[] // present only when dryRun=true
}

function parsePreferredTime(raw: string | null): { h: number; m: number } {
  const match = String(raw || '09:00').match(/(\d{1,2}):(\d{2})/)
  return { h: match ? parseInt(match[1], 10) % 24 : 9, m: match ? parseInt(match[2], 10) % 60 : 0 }
}

/**
 * Recompute and update every not-yet-occurred scheduled/pending booking for
 * a schedule to match its NEW configuration. Call after the schedule row has
 * already been updated in the DB. Does nothing (returns zero counts) if
 * there are no future bookings.
 *
 * `datesChanged` -- true if day_of_week or recurring_type changed, in which
 * case bookings are re-dated onto the new pattern starting from the next
 * occurrence on/after today. If false, only time/rate/discount recompute and
 * each booking keeps its existing date.
 */
export async function syncFutureBookings(
  tenantId: string,
  scheduleId: string,
  newSchedule: ScheduleSyncFields,
  datesChanged: boolean,
  dryRun = false,
): Promise<SyncResult> {
  const db = tenantDb(tenantId)

  const { data: futureBookings, error: fetchErr } = await db
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('schedule_id', scheduleId)
    .in('status', ['scheduled', 'pending'])
    .gte('start_time', nowNaiveET())
    .order('start_time', { ascending: true })

  if (fetchErr) throw new Error(`syncFutureBookings: fetch failed — ${fetchErr.message}`)
  if (!futureBookings || futureBookings.length === 0) {
    return { bookings_synced: 0, bookings_skipped: 0, skipped_reasons: [], new_next_generate_after: null }
  }

  const { h, m } = parsePreferredTime(newSchedule.preferred_time)
  const hours = Number(newSchedule.duration_hours) || 3
  const rate = Number(newSchedule.hourly_rate) || 0
  const price = applyDiscount(Math.round(rate * hours * 100), newSchedule.discount_percent)

  let targetDates: string[]
  if (datesChanged) {
    // Anchor one day before the naive-ET "today" so nextOccurrenceDates'
    // "next interval after lastOccurrence" (see its docstring in
    // lib/recurring.ts) lands ON today at the earliest, not one interval
    // past it.
    const anchor = new Date(`${nowNaiveET().slice(0, 10)}T12:00:00Z`)
    anchor.setUTCDate(anchor.getUTCDate() - 1)
    const count = Math.max(20, futureBookings.length + 4)
    const generated = nextOccurrenceDates({
      recurringType: newSchedule.recurring_type,
      lastOccurrence: anchor,
      dayOfWeek: newSchedule.day_of_week ?? undefined,
      count,
    })
    targetDates = generated.slice(0, futureBookings.length).map((d) => d.toISOString().slice(0, 10))
  } else {
    targetDates = futureBookings.map((b) => String(b.start_time).slice(0, 10))
  }

  if (targetDates.length < futureBookings.length) {
    throw new Error(
      `syncFutureBookings: only generated ${targetDates.length} dates for ${futureBookings.length} bookings — refusing to partially sync. Check recurring_type/day_of_week.`,
    )
  }

  let synced = 0
  let skipped = 0
  const skippedReasons: string[] = []
  const preview: BookingChange[] = []

  for (let i = 0; i < futureBookings.length; i++) {
    const booking = futureBookings[i]
    const date = targetDates[i]
    const { startISO, endISO } = computeNaiveVisitWindow(date, h, m, hours)

    if (dryRun) {
      preview.push({
        booking_id: booking.id as string,
        old_start_time: booking.start_time as string,
        new_start_time: startISO,
        old_end_time: booking.end_time as string,
        new_end_time: endISO,
      })
      synced++
      continue
    }

    const { error: updateErr } = await db
      .from('bookings')
      .update({
        start_time: startISO,
        end_time: endISO,
        price,
        hourly_rate: newSchedule.hourly_rate ?? null,
        discount_percent: newSchedule.discount_percent ?? null,
      })
      .eq('id', booking.id)

    if (updateErr) {
      // Most likely a slot-overlap guard -- some other booking (different
      // schedule, manual one-off) already holds that exact slot. Skip and
      // surface it rather than aborting the whole sync.
      skipped++
      skippedReasons.push(`booking ${booking.id} -> ${startISO}: ${updateErr.message}`)
      continue
    }
    synced++
  }

  let newNextGenerateAfter: string | null = null
  if (datesChanged && targetDates.length > 0) {
    newNextGenerateAfter = targetDates[targetDates.length - 1]
    if (!dryRun) {
      await db.from('recurring_schedules').update({ next_generate_after: newNextGenerateAfter }).eq('id', scheduleId)
    }
  }

  return {
    bookings_synced: synced,
    bookings_skipped: skipped,
    skipped_reasons: skippedReasons,
    new_next_generate_after: newNextGenerateAfter,
    ...(dryRun ? { preview } : {}),
  }
}
