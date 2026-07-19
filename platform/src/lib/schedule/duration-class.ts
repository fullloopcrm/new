/**
 * Duration-class deriver for the multi-view calendar (Timeline / Month / Kanban /
 * Projects). Pure logic — no DB, no `new Date()` timezone pitfalls. Booking times
 * are stored as `timestamp without time zone` (naive wall-clock), so we parse them
 * as naive and never let a runtime timezone shift the result.
 *
 * A job's class decides which view lane it renders in:
 *   slot     — within one day (maid, salon, pest, tow, junk, laundry, fitness)
 *   multiday — spans 2-14 days (dumpster rental, small landscaping)
 *   project  — has a project_id, OR a job_id (a sales-converted multi-booking
 *              job — per jobs.ts, job_id is only ever set for genuine projects,
 *              never a single-booking cleaning), OR spans >14 days
 *
 * `duration_class` may be stored on the booking as an explicit override; when
 * absent, derive it here so existing rows (nycmaid cleaning) need no backfill.
 */

export type DurationClass = 'slot' | 'multiday' | 'project'

export const MULTIDAY_MAX_DAYS = 14

/** Parse a naive "YYYY-MM-DDTHH:MM[:SS]" (or "YYYY-MM-DD") into minutes since a fixed epoch-day. Timezone-free. */
function naiveToMinutes(value: string): number | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  if (!y || !mo || !d) return null
  // Days since a fixed reference via UTC math on date-only parts (no local TZ),
  // then add the naive time-of-day. UTC here is a pure calendar calculation, not
  // a wall-clock interpretation — it never shifts by the runtime's timezone.
  const dayMs = Date.UTC(y, mo - 1, d)
  const [h = 0, m = 0] = (timePart || '00:00').split(':').map(Number)
  return Math.round(dayMs / 60000) + h * 60 + m
}

/** Whole-day span between two naive timestamps (end - start), floored. Null if unparseable. */
export function spanDays(startTime: string, endTime: string | null | undefined): number | null {
  const s = naiveToMinutes(startTime)
  if (s == null) return null
  const e = endTime ? naiveToMinutes(endTime) : null
  if (e == null) return 0
  return Math.floor((e - s) / (60 * 24))
}

export interface DurationClassInput {
  start_time: string
  end_time?: string | null
  project_id?: string | null
  job_id?: string | null
  duration_class?: string | null
}

/**
 * Resolve a booking's duration class. Explicit stored value wins; otherwise
 * derive from project/job linkage + span. A booking tied to a project (either
 * primitive — the lightweight calendar `projects` table via project_id, or a
 * sales-converted multi-booking `jobs` row via job_id) is always `project`.
 */
export function deriveDurationClass(b: DurationClassInput): DurationClass {
  if (b.duration_class === 'slot' || b.duration_class === 'multiday' || b.duration_class === 'project') {
    return b.duration_class
  }
  if (b.project_id || b.job_id) return 'project'
  const days = spanDays(b.start_time, b.end_time)
  if (days == null) return 'slot'
  if (days > MULTIDAY_MAX_DAYS) return 'project'
  if (days >= 1) return 'multiday'
  return 'slot'
}
