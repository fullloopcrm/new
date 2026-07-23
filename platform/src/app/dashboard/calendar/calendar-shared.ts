// Shared types/helpers for the Month/Week/Day calendar views + their popups,
// so the event shape and time math stay in one place instead of drifting
// across RichMonthView, the time-grid, and the popups.

export type CalendarEvent = {
  id: string
  start: string
  end: string | null
  client: string
  team_member_id: string | null
  team_member_name: string | null
  status: string
  payment_status: string | null
  service_type: string | null
  price_cents: number
  conflict: boolean
  tight: boolean
}

export type CalendarDay = {
  date: string
  events: CalendarEvent[]
  jobs_count: number
  has_conflict: boolean
  is_idle: boolean
  heat: 'none' | 'low' | 'mid' | 'high' | 'max'
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 || 12
  if (m === 0) return `${h12}${period}`
  return `${h12}:${String(m).padStart(2, '0')}${period}`
}

export function fmtTimeFull(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function fmtMoney(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

export function ymdToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10))
  const dt = new Date(y, m - 1, d + delta)
  return ymd(dt)
}

export function addMonths(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10))
  const dt = new Date(y, m - 1 + delta, 1)
  const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
  dt.setDate(Math.min(d, lastDay))
  return ymd(dt)
}

// Monday-start week containing `dateStr`, as 7 consecutive YYYY-MM-DD keys.
export function weekDatesFor(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10))
  const dt = new Date(y, m - 1, d)
  const dayIdx = (dt.getDay() + 6) % 7 // Mon=0
  const monday = new Date(dt)
  monday.setDate(dt.getDate() - dayIdx)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return ymd(day)
  })
}

export function dayLabel(dateStr: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', opts)
}

function toMinutes(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export type LanedEvent = CalendarEvent & { lane: number; lanesInGroup: number; startMin: number; endMin: number }

// Classic interval-graph coloring: sort by start, assign each event the first
// free lane, and group events into overlap clusters so each cluster reports
// how many lanes it actually needs (siblings share that width; unrelated
// clusters earlier/later in the day don't force extra lanes on each other).
export function packEventsIntoLanes(events: CalendarEvent[], fallbackDurationMin = 180): LanedEvent[] {
  const sorted = [...events]
    .map((e) => {
      const startMin = toMinutes(e.start)
      const endMin = e.end ? Math.max(startMin + 15, toMinutes(e.end)) : startMin + fallbackDurationMin
      return { ...e, startMin, endMin }
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  const laned: LanedEvent[] = []
  let active: { end: number; lane: number }[] = []
  let group: LanedEvent[] = []

  function flushGroup() {
    if (group.length === 0) return
    const lanesInGroup = Math.max(...group.map((g) => g.lane)) + 1
    for (const g of group) g.lanesInGroup = lanesInGroup
    laned.push(...group)
    group = []
  }

  for (const ev of sorted) {
    active = active.filter((a) => a.end > ev.startMin)
    if (active.length === 0 && group.length > 0) flushGroup()
    const usedLanes = new Set(active.map((a) => a.lane))
    let lane = 0
    while (usedLanes.has(lane)) lane++
    active.push({ end: ev.endMin, lane })
    group.push({ ...ev, lane, lanesInGroup: 0 })
  }
  flushGroup()
  return laned
}
