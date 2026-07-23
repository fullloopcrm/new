import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantTimezone, toTenantNaiveString, parseTenantNaiveString } from '@/lib/tenant-time'

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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}
function startOfGrid(d: Date): Date {
  const first = startOfMonth(d)
  const dayIdx = (first.getDay() + 6) % 7 // Mon=0
  return new Date(first.getFullYear(), first.getMonth(), 1 - dayIdx)
}
function endOfGrid(d: Date): Date {
  const last = endOfMonth(d)
  const lastDate = new Date(last.getFullYear(), last.getMonth(), 0)
  const dayIdx = (lastDate.getDay() + 6) % 7
  const trail = 6 - dayIdx
  return new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + trail + 1)
}
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
    const { tenantId, tenant } = await getTenantForRequest()
    const timezone = getTenantTimezone(tenant)
    const url = request.nextUrl
    const monthParam = url.searchParams.get('month') // YYYY-MM
    // Default (no ?month=) must be the tenant's OWN current calendar month —
    // `new Date()` reads the server's (UTC) month, which flips a day+ early
    // for US tenants near a month boundary.
    const focus = monthParam
      ? new Date(`${monthParam}-01T00:00:00`)
      : new Date(`${toTenantNaiveString(timezone).slice(0, 7)}-01T00:00:00`)

    const gridStart = startOfGrid(focus)
    const gridEnd = endOfGrid(focus)

    const [bookingsRes, teamRes] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, price, start_time, end_time, status, payment_status, service_type, clients(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', gridStart.toISOString())
        .lt('start_time', gridEnd.toISOString())
        .order('start_time', { ascending: true }),
      supabaseAdmin
        .from('team_members')
        .select('id, name, status')
        .eq('tenant_id', tenantId),
    ])

    const team = (teamRes.data || []) as Array<{ id: string; name: string; status: string | null }>
    const teamById = new Map(team.map((t) => [t.id, t]))
    const bookings = ((bookingsRes.data || []) as Array<Record<string, unknown>>)
      .filter((b) => (b.status as string) !== 'cancelled')

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
    const days: CalendarDay[] = []
    const dayCursor = new Date(gridStart)
    while (dayCursor < gridEnd) {
      days.push({
        date: ymd(dayCursor),
        events: [],
        jobs_count: 0,
        has_conflict: false,
        is_idle: false,
        heat: 'none',
      })
      dayCursor.setDate(dayCursor.getDate() + 1)
    }
    const dayByKey = new Map(days.map((d) => [d.date, d]))

    let max = 0
    for (const b of bookings) {
      const startStr = b.start_time as string
      if (!startStr) continue
      const key = ymd(new Date(startStr))
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
    // start_time is naive tenant-local — every comparison below runs against
    // naive strings (not real-instant Date math) so bookings land on the
    // correct tenant-local day regardless of the server's own (UTC) clock.
    const now = new Date()
    const nowNaive = toTenantNaiveString(timezone, now)
    const todayKey = nowNaive.slice(0, 10)
    const weekStartNaive = (() => {
      const d = new Date(`${todayKey}T00:00:00`)
      const dayIdx = (d.getDay() + 6) % 7
      d.setDate(d.getDate() - dayIdx)
      return d.toISOString().slice(0, 10)
    })()
    const weekEndNaive = (() => {
      const d = new Date(`${weekStartNaive}T00:00:00`)
      d.setDate(d.getDate() + 7)
      return d.toISOString().slice(0, 10)
    })()

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
      const start = new Date(startStr)
      const isWeek = startStr >= weekStartNaive && startStr < weekEndNaive
      const id = b.id as string
      if (isWeek) {
        weekJobs += 1
        weekRevenueCents += Number(b.price || 0)
        if (!b.team_member_id) unassignedCount += 1
        if (conflictIds.has(id)) conflictCount += 1
        const endRaw = b.end_time as string | null
        const durHours = endRaw
          ? Math.max(0.5, (new Date(endRaw).getTime() - start.getTime()) / 3_600_000)
          : 3
        const tmId = (b.team_member_id as string | null) || ''
        if (tmId) weekHoursByTm.set(tmId, (weekHoursByTm.get(tmId) || 0) + durHours)
      }
      if (startStr.slice(0, 10) === todayKey) {
        todayTotal += 1
        if ((b.status as string) === 'in_progress') todayActive += 1
      }
      if (startStr > nowNaive && !firstUpcoming) {
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
        const jobs = bookings.filter((b) => b.team_member_id === t.id && (b.start_time as string) >= weekStartNaive && (b.start_time as string) < weekEndNaive).length
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
        const start = new Date(b.start_time as string)
        const status = (b.status as string) || 'scheduled'
        let liveStatus: LiveOpsRow['status'] = 'upcoming'
        let durationLabel = ''
        if (status === 'in_progress') {
          liveStatus = 'in-progress'
          // Real elapsed time needs the TRUE instant start_time represents,
          // not the naive-digits-parsed-as-UTC value `start` holds.
          const realStart = parseTenantNaiveString(b.start_time as string, timezone)
          const hrs = (now.getTime() - realStart.getTime()) / 3_600_000
          durationLabel = `${hrs.toFixed(1)}h in`
        } else if (status === 'completed') {
          liveStatus = 'done'
          durationLabel = `done ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        } else {
          durationLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }
        const tm = (b.team_member_id as string | null) || null
        return {
          team_member_id: tm || '',
          team_member_name: tm ? teamById.get(tm)?.name || 'Unassigned' : 'Unassigned',
          client: ((b.clients as unknown as { name?: string } | null)?.name) || 'Unknown',
          status: liveStatus,
          start: start.toISOString(),
          detail: ((b.service_type as string | null) || 'job') + (b.price ? ` · $${Math.round(Number(b.price) / 100)}` : ''),
          duration_label: durationLabel,
        }
      })
      .sort((a, b) => a.start.localeCompare(b.start))

    return NextResponse.json({
      month: monthParam || ymd(focus).slice(0, 7),
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
