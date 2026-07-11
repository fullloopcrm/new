// Shared booking time-slot helpers so availability (slot display) and the book
// route (slot label → start hour) agree across the FULL 24h day. Emergency / 24-7
// trades (towing, restoration, emergency plumbing) set wide business hours; these
// helpers represent any hour, not just the legacy 9am–4pm band.

/** Hour (0-23) → "9:00 AM" / "12:00 PM" / "7:00 PM" / "12:00 AM". */
export function hourToLabel(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr12 = h % 12 || 12
  return `${hr12}:00 ${ampm}`
}

/** "7:00 PM" / "7 PM" / "19:00" → 19. Returns null when unparseable. */
export function labelToHour(label: string): number | null {
  if (!label) return null
  const s = label.trim().toUpperCase()
  // 12-hour clock with AM/PM.
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/)
  if (m) {
    const h = Number(m[1]) % 12
    return m[3] === 'PM' ? h + 12 : h
  }
  // 24-hour "19:00" form (no meridiem).
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (h24) {
    const h = Number(h24[1])
    return h >= 0 && h <= 23 ? h : null
  }
  return null
}

/**
 * Start hours for bookable slots given the tenant's business hours + job
 * duration. A slot must finish by businessEnd; hours are clamped to a real day.
 * A 24-7 tenant (0..24) yields every hour a full-length job can start.
 */
export function slotStartHours(businessStart: number, businessEnd: number, durationHours: number): number[] {
  const start = Math.max(0, Math.floor(businessStart))
  const end = Math.min(24, Math.ceil(businessEnd))
  const dur = Math.max(1, Math.ceil(durationHours))
  const lastStart = Math.min(end - dur, 23)
  const hours: number[] = []
  for (let h = start; h <= lastStart; h++) hours.push(h)
  return hours
}
