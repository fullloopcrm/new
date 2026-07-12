import { describe, it, expect } from 'vitest'
import {
  countOverlappingBookings,
  slotHasCapacity,
  buildPortalSlots,
  type EpochRange,
} from './portal-availability'

// Helper: epoch-ms range for a same-day HH:MM window on a fixed date.
const DATE = '2026-08-17' // a plain weekday, no holiday edge cases
function range(startHHMM: string, endHHMM: string): EpochRange {
  return {
    start: new Date(`${DATE}T${startHHMM}:00`).getTime(),
    end: new Date(`${DATE}T${endHHMM}:00`).getTime(),
  }
}
describe('countOverlappingBookings', () => {
  it('counts only bookings that overlap the slot window', () => {
    const slotStart = new Date(`${DATE}T10:00:00`).getTime()
    const slotEnd = new Date(`${DATE}T12:00:00`).getTime()
    const booked = [
      range('10:00', '12:00'), // exact overlap
      range('11:00', '13:00'), // partial overlap
      range('08:00', '10:00'), // ends exactly at slot start — no overlap
      range('12:00', '14:00'), // starts exactly at slot end — no overlap
      range('14:00', '16:00'), // fully after — no overlap
    ]
    expect(countOverlappingBookings(slotStart, slotEnd, booked)).toBe(2)
  })
})

describe('slotHasCapacity — capacity-aware overlap (P2-6)', () => {
  const slotStart = new Date(`${DATE}T10:00:00`).getTime()
  const slotEnd = new Date(`${DATE}T12:00:00`).getTime()
  const oneBooking = [range('10:00', '12:00')]
  const twoBookings = [range('10:00', '12:00'), range('10:30', '12:30')]

  it('1-crew tenant: a single overlapping booking fills the slot (UNCHANGED)', () => {
    expect(slotHasCapacity(slotStart, slotEnd, oneBooking, 1)).toBe(false)
    expect(slotHasCapacity(slotStart, slotEnd, [], 1)).toBe(true)
  })

  it('2-crew tenant: one booking still leaves the slot open (double-book allowed)', () => {
    expect(slotHasCapacity(slotStart, slotEnd, oneBooking, 2)).toBe(true)
  })

  it('2-crew tenant: two concurrent bookings fill the slot (at capacity)', () => {
    expect(slotHasCapacity(slotStart, slotEnd, twoBookings, 2)).toBe(false)
  })

  it('capacity floors at 1 (0 / negative / NaN never over-book to "always open")', () => {
    expect(slotHasCapacity(slotStart, slotEnd, oneBooking, 0)).toBe(false)
    expect(slotHasCapacity(slotStart, slotEnd, oneBooking, -3)).toBe(false)
    expect(slotHasCapacity(slotStart, slotEnd, oneBooking, NaN)).toBe(false)
  })
})

describe('buildPortalSlots — grid unchanged, availability capacity-aware (P2-6)', () => {
  it('keeps the exact 8am–6pm 30-min grid for a 2h job', () => {
    const slots = buildPortalSlots(DATE, 2, [], 5)
    expect(slots[0].time).toBe('8:00 AM')
    // last start for a 2h job that must finish by 9pm, capped at the 6pm row.
    expect(slots[slots.length - 1].time).toBe('6:00 PM')
    // all open when there are no bookings
    expect(slots.every((s) => s.available)).toBe(true)
  })

  it('2-crew tenant can double-book the 10:00 AM slot; a 3rd concurrent booking closes it', () => {
    const at10 = new Date(`${DATE}T10:00:00`).getTime()
    const find = (slots: { time: string; available: boolean }[]) =>
      slots.find((s) => s.time === '10:00 AM')!

    // one overlapping booking, capacity 2 → still open
    let slots = buildPortalSlots(DATE, 2, [range('10:00', '12:00')], 2)
    expect(find(slots).available).toBe(true)

    // two overlapping bookings, capacity 2 → full
    slots = buildPortalSlots(DATE, 2, [range('10:00', '12:00'), range('11:00', '13:00')], 2)
    expect(find(slots).available).toBe(false)
    expect(at10).toBeGreaterThan(0) // sanity: fixture date parsed
  })

  it('1-crew tenant behavior is unchanged: one booking blocks its slot', () => {
    const slots = buildPortalSlots(DATE, 2, [range('12:00', '14:00')], 1)
    const noon = slots.find((s) => s.time === '12:00 PM')!
    expect(noon.available).toBe(false)
    // a non-overlapping earlier slot stays open
    const eight = slots.find((s) => s.time === '8:00 AM')!
    expect(eight.available).toBe(true)
  })

  it('omits late starts that would run past 9pm for a long job (grid preserved from prior route)', () => {
    const slots = buildPortalSlots(DATE, 4, [], 1)
    // Cutoff is per-hour (hour + duration > 21), reproduced 1:1 from the old route.
    // 4h job: 5pm row (17+4=21) kept incl. its :30; 6pm row (18+4=22) dropped.
    expect(slots.some((s) => s.time === '5:00 PM')).toBe(true)
    expect(slots.some((s) => s.time === '5:30 PM')).toBe(true)
    expect(slots.some((s) => s.time === '6:00 PM')).toBe(false)
  })
})

// nycmaid guard: the config-tenant capacity path lives in ./portal-availability
// and is fully separate from the nycmaid cleaner path (src/lib/nycmaid/availability).
// This test documents the boundary — the nycmaid module is not imported or altered
// here, so its per-cleaner + same-day emergency logic is unaffected by this change.
describe('nycmaid isolation (P2-6)', () => {
  it('does not depend on nor re-export anything from the nycmaid availability path', async () => {
    const mod = await import('./portal-availability')
    expect(Object.keys(mod).sort()).toEqual(
      ['buildPortalSlots', 'countOverlappingBookings', 'slotHasCapacity'].sort(),
    )
  })
})
