import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { etToday, addCalendarDays, calendarDayOfWeek, daysInCalendarMonth, formatNaiveET, parseNaiveET, type CalendarDate } from '@/lib/recurring'

type CalendarEvent = {
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

type CalendarDay = {
  date: string
  events: CalendarEvent[]
  jobs_count: number
  has_conflict: boolean
  is_idle: boolean
  heat: 'none' | 'low' | 'mid' | 'high' | 'max'
}

type TeamLoad = { id: string; name: string; jobs: number; over: boolean }
type Utilization = { id: string; name: string; pct: number }
type LiveOpsRow = {
  team_member_id: string
  team_member_name: string
  client: string
  status: 'in-progress' | 'upcoming' | 'done' | 'late'
  start: string
  detail: string
  duration_label: string
}

// Month-grid boundaries are computed as ET CalendarDates (pure Date.UTC
// arithmetic, same technique as recurring.ts's addCalendarDays), not real
// Date objects read via server-local getters -- bookings.start_time/end_time
// are naive-ET (see recurring.ts's nowNaiveET header), so a grid boundary
// built from the SERVER's local calendar (UTC on Vercel) silently shifted
// every cutoff by the ET/UTC gap, the same day-boundary bug class fixed
// elsewhere this session (e.g. dashboard/route.ts, 975d7db8).
function startOfGrid(monthStart: CalendarDate): CalendarDate {
  const dayIdx = (calendarDayOfWeek(monthStart) + 6) % 7 // Mon=0
  return addCalendarDays(monthStart, -dayIdx)
}
function endOfGrid(monthStart: CalendarDate): CalendarDate {
  const lastDayOfMonth = addCalendarDays(monthStart, daysInCalendarMonth(monthStart) - 1)
  const dayIdx = (calendarDayOfWeek(lastDayOfMonth) + 6) % 7
  const trail = 6 - dayIdx
  return addCalendarDays(lastDayOfMonth, trail + 1) // exclusive bound
}
function ymd(date: CalendarDate): string {
  return formatNaiveET(date).slice(0, 10)
}

function heatLevel(jobs: number, max: number): CalendarDay['heat'] {
  if (jobs === 0) return 'none'
  if (max <= 0) return 'low'
  const ratio = jobs / max
  if (ratio < 0.25) return 'low'
  if (ratio < 0.5) return 'mid'
  if (ratio < 0.85) return 'high'
  return 'max'
}

export async function GET(request: NextRequest) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.view')
    if (authError) return authError
    const { tenantId } = tenant
    const url = request.nextUrl
    const monthParam = url.searchParams.get('month') // YYYY-MM
    const focusMonth: CalendarDate = monthParam
      ? { year: Number(monthParam.slice(0, 4)), month: Number(monthParam.slice(5, 7)) - 1, day: 1 }
      : { ...etToday(), day: 1 }

    const gridStart = startOfGrid(focusMonth)
    const gridEnd = endOfGrid(focusMonth)
    const gridStartStr = formatNaiveET(gridStart)
    const gridEndStr = formatNaiveET(gridEnd)

    const [bookingsRes, teamRes] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, price, start_time, end_time, status, payment_status, service_type, clients(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', gridStartStr)
        .lt('start_time', gridEndStr)
        .order('start_time', { ascending: true }),
      supabaseAdmin
        .from('team_members')
        .select('id, name, status')
        .eq('tenant_id', tenantId),
    ])

    const team = (teamRes.data || []) as Array<{ id: string; name: string; status: string | null }>
    const teamById = new Map(team.map((t) => [t.id, t]))
    const bookings = (bookingsRes.data || []) as Array<Record<string, unknown>>

    // Compute conflicts: same team_member overlapping windows.
    type Window = { id: string; start: number; end: number; tm: string }
    const windowsByTm = new Map<string, Window[]>()
    for (const b of bookings) {
      const tm = b.team_member_id as string | null
      if (!tm) continue
      const start = new Date(b.start_time as string).getTime()
      const endRaw = b.end_time as string | null
      const end = endRaw ? new Date(endRaw).getTime() : start + 3 * 3_600_000
      const list = windowsByTm.get(tm) || []
      list.push({ id: b.id as string, start, end, tm })
      windowsByTm.set(tm, list)
    }
    const conflictIds = new Set<string>()
    const tightIds = new Set<string>()
    for (const list of windowsByTm.values()) {
      list.sort((a, b) => a.start - b.start)
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1]
        const curr = list[i]
        if (curr.start < prev.end) {
          conflictIds.add(prev.id)
          conflictIds.add(curr.id)
        } else if (curr.start - prev.end < 60 * 60 * 1000) {
          // less than 60min gap — flag as tight transit
          tightIds.add(prev.id)
          tightIds.add(curr.id)
        }
      }
    }

    // Bucket events by day key (YYYY-MM-DD).
    const gridDayCount = Math.round(
      (Date.UTC(gridEnd.year, gridEnd.month, gridEnd.day) - Date.UTC(gridStart.year, gridStart.month, gridStart.day)) / 86_400_000
    )
    const days: CalendarDay[] = []
    for (let i = 0; i < gridDayCount; i++) {
      days.push({
        date: ymd(addCalendarDays(gridStart, i)),
        events: [],
        jobs_count: 0,
        has_conflict: false,
        is_idle: false,
        heat: 'none',
      })
    }
    const dayByKey = new Map(days.map((d) => [d.date, d]))

    let max = 0
    for (const b of bookings) {
      const startStr = b.start_time as string
      if (!startStr) continue
      // start_time is naive-ET -- its date component IS the ET calendar day,
      // no Date parsing (and its server-TZ ambiguity) needed.
      const key = startStr.slice(0, 10)
      const day = dayByKey.get(key)
      if (!day) continue
      const tm = b.team_member_id as string | null
      const id = b.id as string
      const event: CalendarEvent = {
        id,
        start: startStr,
        end: (b.end_time as string | null) ?? null,
        client: ((b.clients as unknown as { name?: string } | null)?.name) || 'Unknown',
        team_member_id: tm,
        team_member_name: tm ? teamById.get(tm)?.name || null : null,
        status: (b.status as string | null) || 'scheduled',
        payment_status: (b.payment_status as string | null) || null,
        service_type: (b.service_type as string | null) || null,
        price_cents: Number(b.price || 0),
        conflict: conflictIds.has(id),
        tight: tightIds.has(id),
      }
      day.events.push(event)
      day.jobs_count += 1
      if (event.conflict) day.has_conflict = true
      if (day.jobs_count > max) max = day.jobs_count
    }
    for (const d of days) {
      d.heat = heatLevel(d.jobs_count, max)
      d.is_idle = d.jobs_count === 0
    }

    // Outlook stats — for the focused month + this-week view.
    // `now` stays a real instant (needed for genuine elapsed-time/future-vs-
    // past comparisons below, via parseNaiveET) -- only the calendar
    // boundaries (this week, today) are anchored to ET, matching the naive-ET
    // convention start_time/end_time are stored in.
    const now = new Date()
    const todayET = etToday()
    const todayKey = ymd(todayET)
    const monWeekIdx = (calendarDayOfWeek(todayET) + 6) % 7
    const monStart = addCalendarDays(todayET, -monWeekIdx)
    const monEnd = addCalendarDays(monStart, 7)
    const monStartStr = formatNaiveET(monStart)
    const monEndStr = formatNaiveET(monEnd)

    let weekJobs = 0
    let weekRevenueCents = 0
    let unassignedCount = 0
    let conflictCount = 0
    let todayActive = 0
    let todayTotal = 0
    let firstUpcoming: { client: string; start: string; team_member: string | null } | null = null
    const weekHoursByTm = new Map<string, number>()

    for (const b of bookings) {
      const startStr = b.start_time as string
      if (!startStr) continue
      // Naive-ET strings sort lexicographically same as chronologically, so
      // comparing against the naive-ET boundary strings directly sidesteps
      // Date-parsing's server-TZ ambiguity entirely.
      const isWeek = startStr >= monStartStr && startStr < monEndStr
      const id = b.id as string
      if (isWeek) {
        weekJobs += 1
        weekRevenueCents += Number(b.price || 0)
        if (!b.team_member_id) unassignedCount += 1
        if (conflictIds.has(id)) conflictCount += 1
        const endRaw = b.end_time as string | null
        const durHours = endRaw
          ? Math.max(0.5, (new Date(endRaw).getTime() - new Date(startStr).getTime()) / 3_600_000)
          : 3
        const tmId = (b.team_member_id as string | null) || ''
        if (tmId) weekHoursByTm.set(tmId, (weekHoursByTm.get(tmId) || 0) + durHours)
      }
      if (startStr.slice(0, 10) === todayKey) {
        todayTotal += 1
        if ((b.status as string) === 'in_progress') todayActive += 1
      }
      // Real future-vs-past check against the real current instant needs the
      // TRUE instant start_time represents (parseNaiveET), not a naive
      // reinterpret-as-UTC Date -- otherwise any booking within the ET/UTC
      // gap of "now" reads as already past (see recurring.ts's nowNaiveET
      // header for the same bug class on cutoff comparisons).
      if (parseNaiveET(startStr).getTime() > now.getTime() && !firstUpcoming) {
        firstUpcoming = {
          client: ((b.clients as unknown as { name?: string } | null)?.name) || 'Unknown',
          start: startStr,
          team_member: (b.team_member_id as string | null) ?? null,
        }
      }
    }

    // Cleaner load bar: jobs per team member this week.
    const loads: TeamLoad[] = team
      .map((t) => {
        const jobs = bookings.filter((b) => b.team_member_id === t.id && (b.start_time as string) >= monStartStr && (b.start_time as string) < monEndStr).length
        return { id: t.id, name: t.name, jobs, over: jobs >= 12 }
      })
      .sort((a, b) => b.jobs - a.jobs)

    // Utilization: hours sold vs capacity (assume 40h/week target per active member).
    const targetHours = 40
    const utilization: Utilization[] = team
      .filter((t) => (t.status || 'active') !== 'inactive')
      .map((t) => ({
        id: t.id,
        name: t.name,
        pct: Math.round(((weekHoursByTm.get(t.id) || 0) / targetHours) * 100),
      }))
      .sort((a, b) => b.pct - a.pct)

    const teamHours = [...weekHoursByTm.values()].reduce((a, b) => a + b, 0)
    const teamCapacity = utilization.length * targetHours
    const tenantUtilizationPct = teamCapacity > 0 ? Math.round((teamHours / teamCapacity) * 100) : 0
    const idleHours = Math.max(0, teamCapacity - teamHours)

    // Live ops — today's bookings.
    const liveOps: LiveOpsRow[] = bookings
      .filter((b) => (b.start_time as string).slice(0, 10) === todayKey)
      .map((b) => {
        const startStr = b.start_time as string
        const status = (b.status as string) || 'scheduled'
        let liveStatus: LiveOpsRow['status'] = 'upcoming'
        let durationLabel = ''
        if (status === 'in_progress') {
          liveStatus = 'in-progress'
          // Real elapsed time against the real current instant -- see the
          // parseNaiveET note above.
          const hrs = (now.getTime() - parseNaiveET(startStr).getTime()) / 3_600_000
          durationLabel = `${hrs.toFixed(1)}h in`
        } else if (status === 'completed') {
          liveStatus = 'done'
          durationLabel = `done ${new Date(startStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        } else {
          durationLabel = new Date(startStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }
        const tm = (b.team_member_id as string | null) || null
        return {
          team_member_id: tm || '',
          team_member_name: tm ? teamById.get(tm)?.name || 'Unassigned' : 'Unassigned',
          client: ((b.clients as unknown as { name?: string } | null)?.name) || 'Unknown',
          status: liveStatus,
          // Raw naive-ET string, matching the days[].events[].start convention
          // above -- .toISOString() would mislabel this as a true-UTC instant.
          start: startStr,
          detail: ((b.service_type as string | null) || 'job') + (b.price ? ` · $${Math.round(Number(b.price) / 100)}` : ''),
          duration_label: durationLabel,
        }
      })
      .sort((a, b) => a.start.localeCompare(b.start))

    return NextResponse.json({
      month: monthParam || ymd(focusMonth).slice(0, 7),
      grid: {
        start: ymd(gridStart),
        end: ymd(gridEnd),
        days,
      },
      team,
      load: loads,
      utilization,
      live_ops: liveOps,
      stats: {
        today_active: todayActive,
        today_total: todayTotal,
        week_jobs: weekJobs,
        week_revenue_cents: weekRevenueCents,
        utilization_pct: tenantUtilizationPct,
        unassigned: unassignedCount,
        conflicts: conflictCount,
        idle_hours: Math.round(idleHours),
        idle_revenue_cents: Math.round(idleHours * 8000), // assume $80/hr sellable
        first_upcoming: firstUpcoming,
      },
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}
