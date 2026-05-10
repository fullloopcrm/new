import { supabaseAdmin } from '@/lib/supabase'
import { isHoliday } from '@/lib/holidays'

export interface AvailabilitySlot {
  time: string
  available: boolean
}

export interface AvailabilityResult {
  slots: AvailabilitySlot[]
  sameDay?: boolean
  message?: string
}

export interface CleanerAvailability {
  id: string
  name: string
  available: boolean
  conflict?: string
}

const BUSINESS_START = 7  // Earliest start 7am (regular: 8am)
const BUSINESS_END = 19  // Latest start 6pm, must finish by 7pm latest
const BUFFER_MINUTES = 90

// Preferred scheduling pockets — try to fill these first
const PREFERRED_POCKETS = [8, 12, 16] // 8am, 12pm, 4pm

const TIME_LABELS: Record<number, string> = {
  7: '7:00 AM', 8: '8:00 AM', 9: '9:00 AM', 10: '10:00 AM', 11: '11:00 AM', 12: '12:00 PM',
  13: '1:00 PM', 14: '2:00 PM', 15: '3:00 PM', 16: '4:00 PM', 17: '5:00 PM', 18: '6:00 PM'
}

// Parse naive time string to minutes since midnight
const toMinutes = (timeStr: string) => {
  const timePart = timeStr.split('T')[1] || '00:00'
  const [h, m] = timePart.split(':').map(Number)
  return h * 60 + m
}

// Get cleaners available on a given day (filters by holidays, working_days, schedule, unavailable_dates)
async function getCleanersForDay(date: string) {
  // Block holidays — no one works
  if (isHoliday(date)) return []

  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })

  const { data: allCleaners } = await supabaseAdmin
    .from('cleaners')
    .select('*')
    .eq('active', true)

  if (!allCleaners || allCleaners.length === 0) return []

  return allCleaners.filter(c => {
    if (c.unavailable_dates && Array.isArray(c.unavailable_dates) && c.unavailable_dates.includes(date)) {
      return false
    }
    if (c.working_days && Array.isArray(c.working_days) && c.working_days.length > 0) {
      return c.working_days.includes(dayOfWeek)
    }
    if (c.schedule && typeof c.schedule === 'object' && Object.keys(c.schedule).length > 0) {
      return c.schedule[dayOfWeek] !== null && c.schedule[dayOfWeek] !== undefined
    }
    return true // Available 7 days a week by default
  })
}

// Get existing bookings for a date (excluding cancelled)
async function getBookingsForDay(date: string, excludeBookingId?: string) {
  const startOfDay = date + 'T00:00:00'
  const endOfDay = date + 'T23:59:59'

  let query = supabaseAdmin
    .from('bookings')
    .select('id, cleaner_id, start_time, end_time, clients(name)')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .neq('status', 'cancelled')

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data } = await query
  return data || []
}

// Check if a specific cleaner has a conflict at a given time range
function hasConflict(
  cleanerId: string,
  slotStartMin: number,
  slotEndMin: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingBookings: any[]
): { conflict: boolean; reason?: string } {
  for (const booking of existingBookings) {
    if (booking.cleaner_id !== cleanerId) continue
    const bookingStartMin = toMinutes(booking.start_time)
    const bookingEndMin = toMinutes(booking.end_time)
    const bufferStart = bookingStartMin - BUFFER_MINUTES
    const bufferEnd = bookingEndMin + BUFFER_MINUTES
    if (slotStartMin < bufferEnd && slotEndMin > bufferStart) {
      const clients = booking.clients
      const clientName = (Array.isArray(clients) ? clients[0]?.name : clients?.name) || 'Client'
      const [, t] = booking.start_time.split('T')
      const [bh, bm] = (t || '00:00').split(':').map(Number)
      const ampm = bh >= 12 ? 'PM' : 'AM'
      const hr = bh % 12 || 12
      const timeStr = bm > 0 ? `${hr}:${String(bm).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
      return { conflict: true, reason: `Booked ${timeStr} (${clientName})` }
    }
  }
  return { conflict: false }
}

/**
 * Public availability: which time slots have at least one available cleaner?
 * Duration-aware — a 4hr deep clean won't show 3PM as available.
 * Returns all slots, with preferred pockets (8am, 12pm, 4pm) first.
 */
export async function checkAvailability(date: string, durationHours: number = 2): Promise<AvailabilityResult> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (date === today) {
    return { slots: [], sameDay: true, message: 'Same-day bookings require confirmation' }
  }

  const holidayName = isHoliday(date)
  if (holidayName) {
    return { slots: [], message: `Closed for ${holidayName}` }
  }

  const cleaners = await getCleanersForDay(date)
  if (cleaners.length === 0) {
    const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })
    return { slots: [], message: 'No cleaners available on ' + dayOfWeek }
  }

  const existingBookings = await getBookingsForDay(date)
  const durationMin = durationHours * 60
  // Last start time: service must finish by BUSINESS_END
  const lastStartHour = BUSINESS_END - durationHours

  const slots: AvailabilitySlot[] = []

  for (let hour = BUSINESS_START; hour <= Math.min(lastStartHour, 18); hour++) {
    const slotStartMin = hour * 60
    const slotEndMin = slotStartMin + durationMin

    const hasAvailableCleaner = cleaners.some(cleaner => {
      const result = hasConflict(cleaner.id, slotStartMin, slotEndMin, existingBookings)
      return !result.conflict
    })

    if (TIME_LABELS[hour]) {
      slots.push({ time: TIME_LABELS[hour], available: hasAvailableCleaner })
    }
  }

  return { slots }
}

/**
 * Smart scheduling: returns the best available times for a date,
 * prioritizing preferred pockets (8am, 12pm, 4pm) first.
 * Used by Yinez to suggest optimal times.
 */
export async function getSmartSuggestions(date: string, durationHours: number = 2): Promise<string[]> {
  const result = await checkAvailability(date, durationHours)
  if (result.sameDay || result.slots.length === 0) return []

  const available = result.slots.filter(s => s.available)
  if (available.length === 0) return []

  // Sort: preferred pockets first (8am, 12pm, 4pm), then everything else
  const pocketTimes = PREFERRED_POCKETS.map(h => TIME_LABELS[h]).filter(Boolean)

  const preferred = available.filter(s => pocketTimes.includes(s.time))
  const others = available.filter(s => !pocketTimes.includes(s.time))

  return [...preferred.map(s => s.time), ...others.map(s => s.time)]
}

/**
 * Admin: which cleaners are available for a specific time slot?
 * Returns all cleaners with available/conflict status.
 */
export async function checkCleanerAvailability(
  date: string,
  startTime: string, // HH:MM format
  durationHours: number = 2,
  excludeBookingId?: string
): Promise<CleanerAvailability[]> {
  const cleanersForDay = await getCleanersForDay(date)
  const existingBookings = await getBookingsForDay(date, excludeBookingId)

  const [h, m] = startTime.split(':').map(Number)
  const slotStartMin = h * 60 + m
  const slotEndMin = slotStartMin + durationHours * 60

  // Also get cleaners NOT working this day so we can show them as unavailable
  const { data: allCleaners } = await supabaseAdmin
    .from('cleaners')
    .select('id, name')
    .eq('active', true)

  return (allCleaners || []).map(cleaner => {
    const worksToday = cleanersForDay.some(c => c.id === cleaner.id)
    if (!worksToday) {
      return { id: cleaner.id, name: cleaner.name, available: false, conflict: 'Not scheduled to work' }
    }

    const result = hasConflict(cleaner.id, slotStartMin, slotEndMin, existingBookings)
    return {
      id: cleaner.id,
      name: cleaner.name,
      available: !result.conflict,
      conflict: result.reason
    }
  })
}
