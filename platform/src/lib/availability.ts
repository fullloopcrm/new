import { supabaseAdmin } from '@/lib/supabase'
import { isHoliday } from '@/lib/holidays'
import { worksScheduledDay, slotWithinHours } from '@/lib/day-availability'
import { getSettings } from '@/lib/settings'
import { hourToLabel, slotStartHours } from '@/lib/time-slots'

export interface AvailabilitySlot {
  time: string
  available: boolean
}

export interface AvailabilityResult {
  slots: AvailabilitySlot[]
  sameDay?: boolean
  message?: string
}

export interface TeamMemberAvailability {
  id: string
  name: string
  available: boolean
  conflict?: string
}

const BUFFER_MINUTES = 60 // travel buffer between jobs — aligned with smart-schedule + schedule-monitor

const toMinutes = (timeStr: string) => {
  const timePart = timeStr.split('T')[1] || '00:00'
  const [h, m] = timePart.split(':').map(Number)
  return h * 60 + m
}

// Day index (0=Sun) to short name
const DAY_SHORT: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
}

/**
 * Get team members available on a given day for a tenant. Canonical model:
 * working_days/schedule columns via worksScheduledDay (handles both historical
 * formats; no/all-off days = unavailable) + unavailable_dates one-off days off.
 * Replaces the old team_members.notes JSON + fake Mon–Fri default, so this agrees
 * with the smart-schedule scorer instead of drifting from it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTeamForDay(tenantId: string, date: string): Promise<any[]> {
  const { data: allMembers } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!allMembers || allMembers.length === 0) return []

  return allMembers.filter(m => {
    if ((m.unavailable_dates as string[] | null)?.includes(date)) return false
    return worksScheduledDay(m.working_days, m.schedule, date)
  })
}

/**
 * Get existing bookings for a date (excluding cancelled).
 */
async function getBookingsForDay(tenantId: string, date: string, excludeBookingId?: string) {
  const startOfDay = date + 'T00:00:00'
  const endOfDay = date + 'T23:59:59'

  let query = supabaseAdmin
    .from('bookings')
    .select('id, team_member_id, start_time, end_time, clients(name)')
    .eq('tenant_id', tenantId)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .neq('status', 'cancelled')

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data } = await query
  return data || []
}

/**
 * Check if a team member has a booking conflict (with buffer).
 */
function hasConflict(
  memberId: string,
  slotStartMin: number,
  slotEndMin: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingBookings: any[]
): { conflict: boolean; reason?: string } {
  for (const booking of existingBookings) {
    if (booking.team_member_id !== memberId) continue
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
 * Public availability: which time slots have at least one available team member?
 * Duration-aware — a 4hr deep clean won't show 3PM as available.
 */
export async function checkAvailability(
  tenantId: string,
  date: string,
  durationHours: number = 2
): Promise<AvailabilityResult> {
  const now = new Date()
  const today = now.toLocaleDateString('en-CA')
  const settings = await getSettings(tenantId)
  const { open_365, allow_same_day } = settings

  // Same-day is opt-in per tenant (allow_same_day, already surfaced in
  // dashboard settings and enforced on the portal booking path) — previously
  // this blocked EVERY tenant unconditionally regardless of that setting,
  // which is the same-day half of F4's 24/7-emergency-vertical bug (towing,
  // restoration, emergency plumbing all need same-day/same-hour self-booking).
  if (date === today && !allow_same_day) {
    return { slots: [], sameDay: true, message: 'Same-day bookings require confirmation' }
  }

  // Open-365 tenants (e.g. nycmaid, 24-7 emergency trades) never treat a holiday
  // as closed. The business-hours window is per-tenant too, so a 24-7 trade that
  // sets 0–24 hours can surface any-time slots.
  if (!open_365) {
    const holidayName = isHoliday(date)
    if (holidayName) {
      return { slots: [], message: `Closed for ${holidayName}` }
    }
  }

  const team = await getTeamForDay(tenantId, date)
  if (team.length === 0) {
    const dayOfWeek = DAY_SHORT[new Date(date + 'T12:00:00').getDay()] || ''
    return { slots: [], message: 'No team members available on ' + dayOfWeek }
  }

  const existingBookings = await getBookingsForDay(tenantId, date)
  const durationMin = durationHours * 60
  // Previously hardcoded to 9-5 here regardless of what the tenant configured
  // (the business-hours half of F4's bug) — slotStartHours() below now reads
  // the tenant's actual business_hours_start/end.
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const slots: AvailabilitySlot[] = []

  for (const hour of slotStartHours(settings.business_hours_start, settings.business_hours_end, durationHours)) {
    const slotStartMin = hour * 60
    const slotEndMin = slotStartMin + durationMin

    // Same-day: never offer a slot that has already started.
    if (date === today && slotStartMin <= nowMinutes) continue

    const hasAvailableMember = team.some(member => {
      // Honor the member's working HOURS for the day before checking conflicts —
      // mirrors the scorer so shown slots match what assignment will allow.
      if (!slotWithinHours(member.schedule, date, slotStartMin, slotEndMin)) return false
      const result = hasConflict(member.id, slotStartMin, slotEndMin, existingBookings)
      return !result.conflict
    })

    slots.push({ time: hourToLabel(hour), available: hasAvailableMember })
  }

  return { slots }
}

/**
 * Check if a team member is unavailable on a specific date (day off or not a working day).
 * Returns { unavailable: false } or { unavailable: true, reason: string }.
 */
export async function checkMemberDayOff(
  tenantId: string,
  memberId: string,
  date: string
): Promise<{ unavailable: boolean; reason?: string; memberName?: string }> {
  const dayIndex = new Date(date + 'T12:00:00').getDay()
  const dayName = DAY_SHORT[dayIndex] || ''

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('name, working_days, schedule, unavailable_dates')
    .eq('id', memberId)
    .eq('tenant_id', tenantId)
    .single()

  if (!member) return { unavailable: false }

  if ((member.unavailable_dates as string[] | null)?.includes(date)) {
    return { unavailable: true, reason: `${member.name} has requested ${date} off. Cannot assign.`, memberName: member.name }
  }

  if (!worksScheduledDay(member.working_days, member.schedule, date)) {
    return { unavailable: true, reason: `${member.name} does not work on ${dayName}s.`, memberName: member.name }
  }

  return { unavailable: false }
}

/**
 * Admin: which team members are available for a specific time slot?
 * Returns all active team members with available/conflict status.
 */
export async function checkTeamAvailability(
  tenantId: string,
  date: string,
  startTime: string,
  durationHours: number = 2,
  excludeBookingId?: string
): Promise<TeamMemberAvailability[]> {
  const membersForDay = await getTeamForDay(tenantId, date)
  const existingBookings = await getBookingsForDay(tenantId, date, excludeBookingId)

  const [h, m] = startTime.split(':').map(Number)
  const slotStartMin = h * 60 + m
  const slotEndMin = slotStartMin + durationHours * 60

  const { data: allMembers } = await supabaseAdmin
    .from('team_members')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  return (allMembers || []).map(member => {
    const worksToday = membersForDay.some(m => m.id === member.id)
    if (!worksToday) {
      return { id: member.id, name: member.name, available: false, conflict: 'Not scheduled to work' }
    }

    const result = hasConflict(member.id, slotStartMin, slotEndMin, existingBookings)
    return {
      id: member.id,
      name: member.name,
      available: !result.conflict,
      conflict: result.reason
    }
  })
}
