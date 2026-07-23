'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useWorkerLabel } from '../worker-label-context'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import '../bookings/schedule.css'
import CalendarTimeGrid from './CalendarTimeGrid'
import { BookingPopup, DayEventsPopup } from './CalendarPopups'
import {
  type CalendarEvent, type CalendarDay, fmtTime, fmtMoney, ymdToday,
  addDays, addMonths, weekDatesFor, dayLabel,
} from './calendar-shared'

// Extracted from bookings/page.tsx's Calendar tab (the richer month view: stats
// outlook, Selena query, conflict banner, team load bar, day grid, and the
// Live Ops/Utilization/Demand Heatmap side panel) so the main Schedule nav
// item (dashboard/calendar) can show the same view as its Month tab instead
// of the plainer CalendarBoard. Self-contained/duplicated rather than shared
// with bookings/page.tsx to avoid risking the already-working Bookings page
// under time pressure — dedupe into one shared component later if desired.

const TEAM_COLORS = [
  'var(--sched-team-1)', 'var(--sched-team-2)', 'var(--sched-team-3)',
  'var(--sched-team-4)', 'var(--sched-team-5)', 'var(--sched-team-6)',
  'var(--sched-team-7)', 'var(--sched-team-8)', 'var(--sched-team-9)',
]

type ApiTeam = { id: string; name: string; status: string | null }
type CalendarData = {
  month: string
  grid: { start: string; end: string; days: CalendarDay[] }
  team: ApiTeam[]
  load: Array<{ id: string; name: string; jobs: number; over: boolean }>
  utilization: Array<{ id: string; name: string; pct: number }>
  live_ops: Array<{
    team_member_id: string
    team_member_name: string
    client: string
    status: 'in-progress' | 'upcoming' | 'done' | 'late'
    start: string
    detail: string
    duration_label: string
  }>
  stats: {
    today_active: number
    today_total: number
    week_jobs: number
    week_revenue_cents: number
    utilization_pct: number
    unassigned: number
    conflicts: number
    idle_hours: number
    idle_revenue_cents: number
    first_upcoming: { client: string; start: string; team_member: string | null } | null
  }
}

function monthLabel(month: string): { name: string; year: string } {
  const [y, m] = month.split('-').map((x) => parseInt(x, 10))
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return { name: names[m - 1], year: String(y) }
}

export default function RichMonthView() {
  const worker = useWorkerLabel()
  const { tenant } = useTenantSettings()
  const agentName = (tenant?.agent_name as string) || 'Selena'
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  // Single source of truth for "what day is focused" — Month/Week/Day nav all
  // move this one date (by month, by week, by day respectively) and the
  // fetched month is always derived from it. A focused day's own calendar
  // month always contains that day's whole Mon-Sun week (the API pads the
  // grid to full weeks), so Week/Day never need a second fetch.
  const [anchorDate, setAnchorDate] = useState(() => ymdToday())
  const month = useMemo(() => anchorDate.slice(0, 7), [anchorDate])
  const [innerView, setInnerView] = useState<'month' | 'week' | 'day'>('month')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(['pending', 'scheduled', 'in_progress', 'completed']),
  )
  const [overlays, setOverlays] = useState({ conflicts: true, travel: true, recurring: false, idle: true })
  const [calScale, setCalScale] = useState(1)
  // How many jobs render side-by-side within a single day before the rest
  // collapse into "+N more" — applies to Month's day cells and to each day
  // column in Week/Day.
  const [columns, setColumns] = useState<1 | 2>(1)
  const [popupEvent, setPopupEvent] = useState<{ event: CalendarEvent; date: string } | null>(null)
  const [dayPopupDate, setDayPopupDate] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/schedule/calendar?month=${month}`)
      .then((r) => r.json())
      .then((d) => setData(d && !d.error ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [month])

  function shiftFocus(delta: number) {
    if (innerView === 'month') setAnchorDate((cur) => addMonths(cur, delta))
    else if (innerView === 'week') setAnchorDate((cur) => addDays(cur, delta * 7))
    else setAnchorDate((cur) => addDays(cur, delta))
  }

  const teamColorById = useMemo(() => {
    const map = new Map<string, string>()
    if (!data) return map
    data.team.forEach((t, i) => map.set(t.id, TEAM_COLORS[i % TEAM_COLORS.length]))
    return map
  }, [data])

  const filteredDays = useMemo(() => {
    if (!data) return []
    return data.grid.days.map((d) => ({
      ...d,
      events: d.events.filter((e) => {
        if (teamFilter !== 'all' && e.team_member_id !== teamFilter) return false
        const status = (e.status || 'scheduled').toLowerCase()
        if (!statusFilter.has(status)) return false
        return true
      }),
    }))
  }, [data, teamFilter, statusFilter])

  // Flat, chronological list of this month's jobs for the list view under the
  // calendar grid — same filtered data as the day cells (team/status filters
  // apply to both), just re-projected as rows instead of a grid.
  const monthJobsList = useMemo(() => {
    return filteredDays
      .filter((d) => d.date.startsWith(month))
      .flatMap((d) => d.events.map((e) => ({ ...e, date: d.date })))
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [filteredDays, month])

  const dayByDate = useMemo(() => new Map(filteredDays.map((d) => [d.date, d])), [filteredDays])
  const emptyDay = (date: string): CalendarDay => ({ date, events: [], jobs_count: 0, has_conflict: false, is_idle: false, heat: 'none' })
  const weekDays = useMemo(
    () => (innerView === 'week' ? weekDatesFor(anchorDate).map((date) => dayByDate.get(date) || emptyDay(date)) : []),
    [innerView, anchorDate, dayByDate],
  )
  const dayViewDays = useMemo(
    () => (innerView === 'day' ? [dayByDate.get(anchorDate) || emptyDay(anchorDate)] : []),
    [innerView, anchorDate, dayByDate],
  )
  function colorForEvent(ev: CalendarEvent): string {
    return ev.team_member_id ? teamColorById.get(ev.team_member_id) || 'var(--sched-ink)' : 'var(--sched-ink)'
  }
  const dayPopupDay = dayPopupDate ? dayByDate.get(dayPopupDate) || emptyDay(dayPopupDate) : null

  function toggleStatus(s: string) {
    const next = new Set(statusFilter)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setStatusFilter(next)
  }
  function toggleOverlay(k: keyof typeof overlays) {
    setOverlays({ ...overlays, [k]: !overlays[k] })
  }

  const ml = monthLabel(month)
  const todayStr = ymdToday()
  const stats = data?.stats
  const firstUp = stats?.first_upcoming
  const firstUpLabel = firstUp
    ? new Date(firstUp.start).toLocaleString('en-US', { weekday: 'short', hour: 'numeric' })
    : null

  return (
    <div className="sched-scope">
      {/* OUTLOOK */}
      <div className="sched-bar-label">This Period</div>
      <div className="sched-outlook">
        <div className="sched-stat">
          <div className="sched-stat-label">
            Today
            {(stats?.today_active ?? 0) > 0 && <span className="sched-stat-tag live">{stats?.today_active} active</span>}
          </div>
          <div className="sched-stat-value">
            {stats?.today_active ?? 0}
            <span className="small"> / {stats?.today_total ?? 0}</span>
          </div>
          <div className="sched-stat-sub">{stats?.today_total ? 'Active vs total' : '—'}</div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">
            This Week
            <span className="sched-stat-tag">{stats?.week_jobs ?? 0} jobs</span>
          </div>
          <div className="sched-stat-value"><span className="unit">$</span>{Math.round((stats?.week_revenue_cents ?? 0) / 100).toLocaleString('en-US')}</div>
          <div className="sched-stat-sub">{firstUpLabel ? <>Next: <strong>{firstUpLabel}</strong> · {firstUp?.client}</> : 'Nothing upcoming'}</div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">Utilization <span className="sched-stat-tag up">{stats?.utilization_pct ?? 0}%</span></div>
          <div className="sched-stat-value">{stats?.utilization_pct ?? 0}<span className="pct">%</span></div>
          <div className="sched-stat-sub">Hrs sold vs capacity</div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">
            Unassigned
            {(stats?.unassigned ?? 0) > 0 && <span className="sched-stat-tag warn">{stats?.unassigned}</span>}
          </div>
          <div className="sched-stat-value">{stats?.unassigned ?? 0}</div>
          <div className={`sched-stat-sub ${(stats?.unassigned ?? 0) > 0 ? 'warn' : ''}`}>
            {(stats?.unassigned ?? 0) > 0 ? 'Needs assignment' : 'All assigned'}
          </div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">
            Conflicts
            {(stats?.conflicts ?? 0) > 0 && <span className="sched-stat-tag warn">action</span>}
          </div>
          <div className="sched-stat-value">{stats?.conflicts ?? 0}</div>
          <div className={`sched-stat-sub ${(stats?.conflicts ?? 0) > 0 ? 'warn' : ''}`}>
            {(stats?.conflicts ?? 0) > 0 ? 'Overlapping bookings' : 'Clean'}
          </div>
        </div>
        <div className="sched-stat">
          <div className="sched-stat-label">Idle Hours</div>
          <div className="sched-stat-value">{stats?.idle_hours ?? 0}<span className="small">h</span></div>
          <div className="sched-stat-sub">Sellable · ~{fmtMoney(stats?.idle_revenue_cents ?? 0)}</div>
        </div>
      </div>

      {/* CONFLICT BANNER */}
      {(stats?.conflicts ?? 0) > 0 && (
        <div className="sched-conflict-banner">
          <span className="sched-conflict-icon">!</span>
          <span className="sched-conflict-text">
            <strong>
              {stats?.conflicts} {stats?.conflicts === 1 ? 'conflict' : 'conflicts'} need attention.
            </strong>{' '}
            Overlapping bookings on the same team member. Reassign or split.
          </span>
          <button className="sched-conflict-fix" type="button">Resolve</button>
        </div>
      )}

      <div className="sched-grid">
        <div className="sched-grid-main">
          {/* CALENDAR TOOLBAR */}
          <div className="sched-cal-toolbar">
            <div className="sched-cal-nav">
              <button className="sched-cal-nav-btn" type="button" onClick={() => shiftFocus(-1)}>‹</button>
              <button className="sched-cal-nav-btn today" type="button" onClick={() => setAnchorDate(ymdToday())}>Today</button>
              <button className="sched-cal-nav-btn" type="button" onClick={() => shiftFocus(1)}>›</button>
            </div>
            <div className="sched-cal-month">
              {innerView === 'month' && <>{ml.name} <em>{ml.year}</em></>}
              {innerView === 'week' && (() => {
                const wd = weekDatesFor(anchorDate)
                return <>{dayLabel(wd[0], { month: 'short', day: 'numeric' })} – {dayLabel(wd[6], { month: 'short', day: 'numeric' })} <em>{ml.year}</em></>
              })()}
              {innerView === 'day' && <>{dayLabel(anchorDate, { weekday: 'long', month: 'short', day: 'numeric' })} <em>{ml.year}</em></>}
            </div>
            <div className="sched-view-toggle">
              <button className={`sched-view-btn ${innerView === 'month' ? 'active' : ''}`} type="button" onClick={() => setInnerView('month')}>Month</button>
              <button className={`sched-view-btn ${innerView === 'week' ? 'active' : ''}`} type="button" onClick={() => setInnerView('week')}>Week</button>
              <button className={`sched-view-btn ${innerView === 'day' ? 'active' : ''}`} type="button" onClick={() => setInnerView('day')}>Day</button>
              <button className="sched-view-btn" type="button" disabled title="Not built yet">{worker.singular}</button>
              <button className="sched-view-btn" type="button" disabled title="Not built yet">Zone</button>
            </div>
            <div className="sched-cal-columns" role="group" aria-label="Jobs shown per day before summarizing">
              <button className={`sched-cal-columns-btn ${columns === 1 ? 'active' : ''}`} type="button" onClick={() => setColumns(1)} title="1 column per day">1 col</button>
              <button className={`sched-cal-columns-btn ${columns === 2 ? 'active' : ''}`} type="button" onClick={() => setColumns(2)} title="2 columns per day">2 col</button>
            </div>
            <div className="sched-cal-zoom">
              <button className="sched-cal-zoom-btn" type="button" onClick={() => setCalScale(s => Math.max(0.75, +(s - 0.1).toFixed(2)))} aria-label="Decrease calendar font size">−</button>
              <button className="sched-cal-zoom-btn" type="button" onClick={() => setCalScale(s => Math.min(1.5, +(s + 0.1).toFixed(2)))} aria-label="Increase calendar font size">+</button>
            </div>
          </div>

          {/* OVERLAYS */}
          <div className="sched-overlay-row">
            <span className="sched-overlay-label">Overlays</span>
            {(['conflicts', 'travel', 'recurring', 'idle'] as const).map((k) => (
              <span
                key={k}
                className={`sched-overlay-toggle ${overlays[k] ? 'on' : ''}`}
                onClick={() => toggleOverlay(k)}
              >
                <span className="sched-ov-check" />
                {k === 'conflicts' && 'Conflicts'}
                {k === 'travel' && 'Travel time'}
                {k === 'recurring' && 'Recurring forecast'}
                {k === 'idle' && 'Idle gaps'}
              </span>
            ))}
          </div>

          {/* FILTERS */}
          <div className="sched-filters">
            <span className="sched-filter-group-label">Team</span>
            <select
              className="sched-select"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All Team Members</option>
              {data?.team.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <span className="sched-filters-divider" />
            <span className="sched-filter-group-label">Status</span>
            {(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const).map((s) => {
              const slug = s === 'in_progress' ? 'in-progress' : s
              const label = s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)
              return (
                <span
                  key={s}
                  className={`sched-status-chip ${slug} ${statusFilter.has(s) ? 'active' : ''}`}
                  onClick={() => toggleStatus(s)}
                >
                  <span className="sched-status-chip-dot" />
                  {label}
                </span>
              )
            })}
            <span className="sched-filters-divider" />
            <span className="sched-team-legend">
              {data?.team.slice(0, 9).map((t) => (
                <span key={t.id} className="sched-team-pill">
                  <span className="sched-team-dot" style={{ background: teamColorById.get(t.id) }} />
                  {t.name.split(' ')[0]}
                </span>
              ))}
            </span>
          </div>

          {/* CALENDAR */}
          {innerView === 'month' && (
            <div className="sched-calendar" style={{ '--sched-cal-scale': calScale } as CSSProperties}>
              <div className="sched-cal-head">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="sched-cal-head-cell">{d}</div>
                ))}
              </div>
              <div className="sched-cal-grid">
                {loading && <div className="sched-empty" style={{ gridColumn: '1 / -1' }}>Loading…</div>}
                {!loading && filteredDays.map((day) => {
                  const dt = new Date(day.date + 'T12:00:00')
                  const inMonth = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` === month
                  const isToday = day.date === todayStr
                  const dayClasses = [
                    'sched-cal-day',
                    !inMonth ? 'muted' : '',
                    isToday ? 'today' : '',
                    day.heat === 'low' ? 'heat-low' : '',
                    day.heat === 'mid' ? 'heat-mid' : '',
                    day.heat === 'high' ? 'heat-high' : '',
                    day.heat === 'max' ? 'heat-max' : '',
                  ].filter(Boolean).join(' ')
                  const maxVisible = columns * 3
                  const visible = day.events.slice(0, maxVisible)
                  const more = day.events.length - visible.length
                  const showIdleBanner = overlays.idle && inMonth && day.is_idle && !isToday
                  return (
                    <div key={day.date} className={dayClasses}>
                      <div className="sched-cal-date-row">
                        <span className="sched-cal-date">{dt.getDate()}</span>
                        <div className="sched-cal-day-stats">
                          {day.has_conflict && overlays.conflicts && <span className="sched-cal-day-stat warn">!</span>}
                          {day.jobs_count > 0 && <span className="sched-cal-day-stat">{day.jobs_count}</span>}
                          {day.is_idle && inMonth && <span className="sched-cal-day-stat idle">idle</span>}
                        </div>
                      </div>
                      <div className={`sched-cal-events ${columns === 2 ? 'cols-2' : ''}`}>
                        {visible.map((ev) => {
                          const color = colorForEvent(ev)
                          const cls = [
                            'sched-cal-event',
                            ev.conflict && overlays.conflicts ? 'conflict' : '',
                            ev.tight && overlays.travel ? 'tight' : '',
                          ].filter(Boolean).join(' ')
                          return (
                            <div
                              key={ev.id}
                              className={cls}
                              style={{ background: color, cursor: 'pointer' }}
                              onClick={() => setPopupEvent({ event: ev, date: day.date })}
                            >
                              <span className="sched-cal-event-time">{fmtTime(ev.start)}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ev.client}{ev.team_member_id ? '' : ' · ?'}
                              </span>
                            </div>
                          )
                        })}
                        {more > 0 && (
                          <div className="sched-cal-event-more" onClick={() => setDayPopupDate(day.date)}>
                            +{more} more
                          </div>
                        )}
                      </div>
                      {showIdleBanner && <div className="sched-cal-idle-banner">Open all day</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(innerView === 'week' || innerView === 'day') && (
            <div className="sched-calendar" style={{ '--sched-cal-scale': calScale } as CSSProperties}>
              {loading ? (
                <div className="sched-empty" style={{ padding: '24px 0', textAlign: 'center' }}>Loading…</div>
              ) : (
                <CalendarTimeGrid
                  days={innerView === 'week' ? weekDays : dayViewDays}
                  todayStr={todayStr}
                  columns={columns}
                  colorFor={colorForEvent}
                  onSelectEvent={(event, date) => setPopupEvent({ event, date })}
                  onOverflow={(date) => setDayPopupDate(date)}
                />
              )}
            </div>
          )}

          {/* MONTH JOBS — LIST VIEW */}
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{ml.name} {ml.year} — Jobs</h3>
              <span className="text-xs text-slate-400">{monthJobsList.length} {monthJobsList.length === 1 ? 'job' : 'jobs'}</span>
            </div>
            {monthJobsList.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No jobs match the current filters.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {monthJobsList.map((ev) => {
                  const color = colorForEvent(ev)
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setPopupEvent({ event: ev, date: ev.date })}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-xs text-slate-400 w-24 flex-shrink-0">
                        {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs font-mono text-slate-500 w-14 flex-shrink-0">{fmtTime(ev.start)}</span>
                      <span className="text-sm text-slate-900 flex-1 truncate">{ev.client}</span>
                      <span className="text-xs text-slate-400 hidden sm:inline">{ev.team_member_name || 'Unassigned'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        ev.status === 'completed' ? 'bg-green-50 text-green-700' :
                        ev.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                        ev.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{ev.status}</span>
                      <span className="text-sm font-medium text-slate-900 w-16 text-right flex-shrink-0">{fmtMoney(ev.price_cents)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="sched-ops-panel">
          <div className="sched-panel">
            <div className="sched-panel-label">
              <span>Live Ops · Today</span>
              <span className="sched-live-tag">LIVE</span>
            </div>
            {data?.live_ops.length === 0 && <div className="sched-empty">No jobs today.</div>}
            {data?.live_ops.map((row, i) => (
              <div key={i} className="sched-ops-row">
                <span className={`sched-ops-status-dot ${row.status}`} />
                <div className="sched-ops-cleaner">
                  <div className="sched-ops-cleaner-name">{row.team_member_name}</div>
                  <div className="sched-ops-cleaner-job">{row.client} · {row.detail}</div>
                </div>
                <div>
                  <div className={`sched-ops-time ${row.status === 'in-progress' ? 'live' : ''}`}>
                    {row.duration_label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sched-panel">
            <div className="sched-panel-label">Utilization · This Week</div>
            {data?.utilization.length === 0 && <div className="sched-empty">No active team members.</div>}
            {data?.utilization.map((u) => {
              const fillClass = u.pct >= 100 ? 'over' : u.pct >= 75 ? 'full' : u.pct >= 40 ? 'med' : 'low'
              return (
                <div key={u.id} className="sched-util-row">
                  <span className="sched-util-dot" style={{ background: teamColorById.get(u.id) }} />
                  <span className="sched-util-name">{u.name}</span>
                  <div className="sched-util-bar">
                    <div className={`sched-util-fill ${fillClass}`} style={{ width: `${Math.min(100, u.pct)}%` }} />
                  </div>
                  <span className="sched-util-pct" style={u.pct >= 100 ? { color: 'var(--sched-danger)' } : {}}>
                    {u.pct}%
                  </span>
                </div>
              )
            })}
          </div>

          <div className="sched-panel">
            <div className="sched-panel-label">Demand Heatmap</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--sched-mono)', fontSize: 10.5, color: 'var(--sched-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Less</span>
              <div style={{ display: 'flex', gap: 3 }}>
                <span className="sched-heat-swatch low" />
                <span className="sched-heat-swatch mid" />
                <span className="sched-heat-swatch high" />
                <span className="sched-heat-swatch max" />
              </div>
              <span style={{ fontFamily: 'var(--sched-mono)', fontSize: 10.5, color: 'var(--sched-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>More</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--sched-graphite)', lineHeight: 1.5 }}>
              {(() => {
                if (!data) return null
                const peaks = [...data.grid.days].filter((d) => d.jobs_count > 0).sort((a, b) => b.jobs_count - a.jobs_count)
                const idle = data.grid.days.filter((d) => d.is_idle && d.date.startsWith(month)).map((d) => d.date.slice(-2)).slice(0, 3)
                const peak = peaks[0]
                return (
                  <>
                    {peak && <>Peak: <strong style={{ color: 'var(--sched-ink)' }}>{new Date(peak.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {peak.jobs_count} jobs</strong><br /></>}
                    {idle.length > 0 && <>Idle days: <strong style={{ color: 'var(--sched-ink)' }}>{idle.join(', ')}</strong></>}
                  </>
                )
              })()}
            </div>
          </div>
        </aside>
      </div>

      {popupEvent && (
        <BookingPopup
          event={popupEvent.event}
          date={popupEvent.date}
          color={colorForEvent(popupEvent.event)}
          onClose={() => setPopupEvent(null)}
        />
      )}
      {dayPopupDay && (
        <DayEventsPopup
          date={dayPopupDay.date}
          events={dayPopupDay.events}
          colorFor={colorForEvent}
          onSelect={(event) => {
            setPopupEvent({ event, date: dayPopupDay.date })
            setDayPopupDate(null)
          }}
          onClose={() => setDayPopupDate(null)}
        />
      )}
    </div>
  )
}
