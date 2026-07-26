// Shared between BookingsAdmin.tsx's edit modal and CreateBookingForm.tsx's
// create modal — both rank/display cleaners the same way, against different
// booking lists (edit modal already has the full preloaded page list; the
// create form fetches just the selected day's bookings). Extracted verbatim
// from BookingsAdmin.tsx to avoid duplicating the conflict/ranking logic.
import { worksScheduledDay, getDaySchedule, scheduleHasAnyDay } from '@/lib/day-availability'

export interface SmartScore {
  id: string
  score: number
  available: boolean
  zone_match: boolean
  has_car: boolean
  can_make_home?: boolean
  distance_miles?: number
  travel_from_prev_min?: number
  travel_to_next_min?: number
  travel_to_home_min?: number
  prev_job_label?: string
  next_job_label?: string
  is_preferred?: boolean
  reason: string
}

// Alternate-time suggestion (admin view — full reason, since it's owner-facing).
// Mirrors SlotSuggestion from smart-schedule.ts.
export interface SlotSuggestion {
  time24: string
  label: string
  cleanerId: string
  cleanerName: string
  score: number
  reason: string
  travelFromPrevMin?: number
  teamShort?: number
}

export interface AvailabilityCleaner {
  id: string
  working_days?: string[]
  unavailable_dates?: string[]
  schedule?: Record<string, unknown>
  max_jobs_per_day?: number
}

export interface AvailabilityBooking {
  team_member_id: string
  start_time: string
  end_time: string | null
  status: string
  clients: { name: string } | null
}

// Alternate-time strip: shown when nobody is available at the chosen time.
// Clicking a pick rewrites the form's start time to that slot. Owner-facing,
// so the full clustering reason ("Victor is nearby…") is fine to show here.
export function SuggestionStrip({ suggestions, onPick, variant }: { suggestions: SlotSuggestion[]; onPick: (time24: string) => void; variant: 'full' | 'better' }) {
  if (suggestions.length === 0) return null
  return (
    <div className={`mb-2 p-2 rounded-lg border ${variant === 'full' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50/60 border-indigo-200'}`}>
      <p className={`text-[11px] font-semibold mb-1.5 ${variant === 'full' ? 'text-amber-800' : 'text-indigo-700'}`}>
        {variant === 'full' ? "No one's free at that time. Try one of these:" : 'Better-routed times today:'}
      </p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.time24}
            type="button"
            onClick={() => onPick(s.time24)}
            className="flex items-baseline justify-between gap-2 text-left px-2 py-1.5 bg-white border border-amber-300 rounded hover:bg-amber-100 transition-colors"
          >
            <span className="text-sm font-semibold text-[var(--sched-ink)]">{s.label}</span>
            <span className="text-[11px] text-gray-600 flex-1">{s.reason}</span>
            {s.teamShort != null && s.teamShort > 0 && (
              <span className="text-[10px] text-red-500 font-medium">{s.teamShort} slot{s.teamShort > 1 ? 's' : ''} short</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function getCleanerAvailability(
  cleaner: AvailabilityCleaner,
  dateStr: string,
  timeStr: string | undefined,
  durationHours: number | undefined,
  bookings: AvailabilityBooking[]
): { available: boolean; reason?: string; dayBookings?: Array<{ time: string; client: string; hours: number }> } {
  if (!dateStr) return { available: true }
  const dateObj = new Date(dateStr + 'T12:00:00')
  const dayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' })

  if (cleaner.unavailable_dates?.includes(dateStr)) {
    return { available: false, reason: 'Requested off' }
  }
  // No days configured (or all off) → NOT available; otherwise honor the set
  // days. worksScheduledDay normalizes both stored formats. See day-availability.ts.
  if (!worksScheduledDay(cleaner.working_days, cleaner.schedule, dateStr)) {
    return { available: false, reason: 'Doesn\'t work ' + dayShort + 's' }
  }
  if (scheduleHasAnyDay(cleaner.schedule)) {
    const daySchedule = getDaySchedule(cleaner.schedule, dateStr)
    if (daySchedule === null || daySchedule === undefined) {
      return { available: false, reason: 'Not scheduled' }
    }
    // Check if requested time falls within cleaner's working hours
    if (timeStr && daySchedule.start && daySchedule.end) {
      const parseTimeToMin = (t: string): number => {
        const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
        if (!match) return 0
        let hrs = parseInt(match[1])
        const mins = parseInt(match[2])
        const ampm = match[3]?.toUpperCase()
        if (ampm === 'PM' && hrs < 12) hrs += 12
        if (ampm === 'AM' && hrs === 12) hrs = 0
        return hrs * 60 + mins
      }
      const schedStart = parseTimeToMin(daySchedule.start)
      const schedEnd = parseTimeToMin(daySchedule.end)
      const [rh, rm] = timeStr.split(':').map(Number)
      const requestStart = rh * 60 + rm
      const requestEnd = requestStart + (durationHours || 2) * 60
      if (requestStart < schedStart) {
        return { available: false, reason: `Starts at ${daySchedule.start}` }
      }
      if (requestEnd > schedEnd) {
        return { available: false, reason: `Off by ${daySchedule.end}` }
      }
    }
  }

  // Check existing bookings on this date
  const dayBookingCount = bookings.filter(b => b.team_member_id === cleaner.id && b.start_time.startsWith(dateStr) && !['cancelled'].includes(b.status)).length

  // Check max jobs per day
  if (cleaner.max_jobs_per_day && dayBookingCount >= cleaner.max_jobs_per_day) {
    return { available: false, reason: `Max ${cleaner.max_jobs_per_day} jobs/day (has ${dayBookingCount})` }
  }

  const dayBookings = bookings
    .filter(b => b.team_member_id === cleaner.id && b.start_time.startsWith(dateStr) && !['cancelled'].includes(b.status))
    .map(b => {
      const start = new Date(b.start_time)
      const end = b.end_time ? new Date(b.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 2) / 2
      return {
        time: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        client: b.clients?.name || 'Client',
        hours,
        startMin: start.getHours() * 60 + start.getMinutes(),
        endMin: start.getHours() * 60 + start.getMinutes() + hours * 60,
      }
    })
    .sort((a, b) => a.startMin - b.startMin)

  // Check time conflict if time provided
  if (timeStr && durationHours) {
    const [h, m] = timeStr.split(':').map(Number)
    const requestStart = h * 60 + m
    const requestEnd = requestStart + durationHours * 60
    const buffer = 60 // 60 min buffer between jobs
    const conflict = dayBookings.find(b =>
      requestStart < b.endMin + buffer && requestEnd + buffer > b.startMin
    )
    if (conflict) {
      return {
        available: false,
        reason: `Conflict: ${conflict.time} ${conflict.client}`,
        dayBookings: dayBookings.map(({ time, client, hours }) => ({ time, client, hours })),
      }
    }
  }

  return {
    available: true,
    dayBookings: dayBookings.map(({ time, client, hours }) => ({ time, client, hours })),
  }
}
