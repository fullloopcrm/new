// Capacity-aware portal availability grid.
//
// The customer portal (src/app/portal/page.tsx → /api/portal/availability) shows
// bookable time slots for a date. The old rule marked a slot unavailable the
// moment ANY booking overlapped it — which is wrong for every tenant that runs
// more than one crew/worker: a business with 3 cleaners could only ever show ONE
// concurrent slot as open, silently under-booking (lost revenue) two-thirds of
// its true capacity.
//
// This module is CONFIG-TENANT ONLY. nycmaid clones resolve availability through
// their own src/lib/nycmaid/availability.ts + _lib/availability (cleaners table,
// per-cleaner conflict + same-day emergency flow) and must NOT be touched.
//
// Pure (no DB): the caller fetches the day's bookings and the tenant's worker
// capacity, then passes them in — so the rule is unit-testable in isolation.

export interface EpochRange {
  start: number // epoch ms
  end: number // epoch ms
}

export interface PortalSlot {
  time: string
  available: boolean
}

// Portal slot grid — 30-min steps, 8:00 AM through 6:00 PM. Preserved exactly
// from the route's prior inline generation so the fix changes ONLY the
// booked/available decision, not which slots appear.
const PORTAL_START_HOUR = 8
const PORTAL_END_HOUR = 18
const PORTAL_LATEST_FINISH_HOUR = 21 // a job must finish by 9pm

/** How many booked ranges overlap [slotStart, slotEnd). */
export function countOverlappingBookings(
  slotStart: number,
  slotEnd: number,
  booked: EpochRange[],
): number {
  let n = 0
  for (const b of booked) {
    if (slotStart < b.end && slotEnd > b.start) n++
  }
  return n
}

/**
 * A slot is open while the number of overlapping bookings is BELOW the tenant's
 * concurrent worker/crew capacity. capacity 1 reproduces the old "one booking
 * blocks the slot" behavior; capacity N lets a slot fill up to N concurrent jobs.
 */
export function slotHasCapacity(
  slotStart: number,
  slotEnd: number,
  booked: EpochRange[],
  capacity: number,
): boolean {
  const cap = Math.max(1, Math.floor(capacity) || 1)
  return countOverlappingBookings(slotStart, slotEnd, booked) < cap
}

/**
 * Build the portal availability grid for a date, capacity-aware.
 *
 * @param date          YYYY-MM-DD (interpreted in the server's local tz, as before)
 * @param durationHours job length; late slots that would run past 9pm are omitted
 * @param booked        epoch-ms ranges of that day's non-cancelled bookings
 * @param capacity      concurrent worker/crew capacity (active team members); >= 1
 */
export function buildPortalSlots(
  date: string,
  durationHours: number,
  booked: EpochRange[],
  capacity: number,
): PortalSlot[] {
  const slots: PortalSlot[] = []

  for (let hour = PORTAL_START_HOUR; hour <= PORTAL_END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      // Don't offer a start that would end after the latest finish time.
      if (hour + durationHours > PORTAL_LATEST_FINISH_HOUR) continue
      if (hour === PORTAL_END_HOUR && minute === 30) continue

      const slotStart = new Date(
        `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      )
      const slotStartMs = slotStart.getTime()
      const slotEndMs = slotStartMs + durationHours * 3600000

      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const timeLabel = `${h}:${String(minute).padStart(2, '0')} ${ampm}`

      slots.push({
        time: timeLabel,
        available: slotHasCapacity(slotStartMs, slotEndMs, booked, capacity),
      })
    }
  }

  return slots
}
