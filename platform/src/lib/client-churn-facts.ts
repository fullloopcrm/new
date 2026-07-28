// Shared "is this client still active" signal — used by the renurture cron
// (picks the next win-back touch per client) and cleaner retention (rolls
// the same signal up by team_member_id). One definition of churn, two
// consumers, so they can never drift apart.
import { parseNaiveET } from '@/lib/recurring'

export interface ClientChurnFacts {
  completedCount: number
  lastServiceDate: number | null // epoch ms
  hasUpcoming: boolean
  scheduleCount: number
  hasActiveSchedule: boolean
}

interface BookingRow {
  client_id: string
  status: string
  start_time: string
}

interface ScheduleRow {
  client_id: string
  status: string
}

// bookings.start_time is a naive America/New_York wall-clock string, not
// real UTC — parseNaiveET is required here, same bug class as
// cron/no-show-check et al. if you swap in `new Date(...)`.
export function computeChurnFactsByClient(
  clients: { id: string }[],
  bookings: BookingRow[],
  schedules: ScheduleRow[],
  now: number,
): Map<string, ClientChurnFacts> {
  const bookingsByClient = new Map<string, BookingRow[]>()
  for (const b of bookings) {
    if (!bookingsByClient.has(b.client_id)) bookingsByClient.set(b.client_id, [])
    bookingsByClient.get(b.client_id)!.push(b)
  }
  const schedulesByClient = new Map<string, ScheduleRow[]>()
  for (const s of schedules) {
    if (!schedulesByClient.has(s.client_id)) schedulesByClient.set(s.client_id, [])
    schedulesByClient.get(s.client_id)!.push(s)
  }

  const result = new Map<string, ClientChurnFacts>()
  for (const client of clients) {
    const clientBookings = bookingsByClient.get(client.id) || []
    const clientSchedules = schedulesByClient.get(client.id) || []

    const completedCount = clientBookings.filter(b => b.status === 'completed').length
    const hasUpcoming = clientBookings.some(b => (b.status === 'scheduled' || b.status === 'in_progress') && parseNaiveET(b.start_time).getTime() > now)
    const lastServiceDate = clientBookings
      .filter(b => b.status === 'completed')
      .map(b => parseNaiveET(b.start_time).getTime())
      .sort((a, b) => b - a)[0] ?? null
    const scheduleCount = clientSchedules.length
    const hasActiveSchedule = clientSchedules.some(s => s.status === 'active')

    result.set(client.id, { completedCount, lastServiceDate, hasUpcoming, scheduleCount, hasActiveSchedule })
  }
  return result
}
