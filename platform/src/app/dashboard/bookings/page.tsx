'use client'

import { useEffect, useMemo, useState } from 'react'
import './schedule.css'
import BookingsListTab from './bookings-list-tab'

const TEAM_COLORS = [
  'var(--sched-team-1)', 'var(--sched-team-2)', 'var(--sched-team-3)',
  'var(--sched-team-4)', 'var(--sched-team-5)', 'var(--sched-team-6)',
  'var(--sched-team-7)', 'var(--sched-team-8)', 'var(--sched-team-9)',
]

type Tab = 'calendar' | 'bookings' | 'map' | 'cleaner' | 'capacity'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'calendar', letter: 'A', label: 'Calendar' },
  { key: 'bookings', letter: 'B', label: 'Bookings' },
  { key: 'map', letter: 'C', label: 'Map' },
  { key: 'cleaner', letter: 'D', label: 'By Cleaner' },
  { key: 'capacity', letter: 'E', label: 'Capacity' },
]

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

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 || 12
  if (m === 0) return `${h12}${period}`
  return `${h12}:${String(m).padStart(2, '0')}${period}`
}
function fmtMoney(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}
function ymdToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map((x) => parseInt(x, 10))
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(month: string): { name: string; year: string } {
  const [y, m] = month.split('-').map((x) => parseInt(x, 10))
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return { name: names[m - 1], year: String(y) }
}

export default function SchedulePage() {
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('calendar')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(['pending', 'scheduled', 'in_progress', 'completed']),
  )
  const [overlays, setOverlays] = useState({ conflicts: true, travel: true, recurring: false, idle: true })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/schedule/calendar?month=${month}`)
      .then((r) => r.json())
      .then((d) => setData(d && !d.error ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [month])

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
      {/* TABS */}
      <div className="sched-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`sched-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            <span className="sched-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'bookings' && stats?.week_jobs ? <span className="sched-tab-count">{stats.week_jobs}</span> : null}
          </button>
        ))}
      </div>

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

      {/* SELENA QUERY */}
      <div className="sched-selena-query">
        <span className="sched-selena-query-icon">Selena · Schedule</span>
        <input className="sched-selena-query-input" placeholder="find me a 3hr deep clean slot in UWS this week with Jeff…" />
        <span className="sched-selena-suggest-pill">Reassign overloaded</span>
        <span className="sched-selena-suggest-pill">Fill idle days</span>
        <span className="sched-selena-suggest-pill">Optimize routes</span>
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

      {/* LOAD BAR */}
      {data && data.load.length > 0 && (
        <div className="sched-load-bar">
          <span className="sched-load-label">Team Load · This Week</span>
          <div className="sched-load-strip">
            {data.load.map((l) => {
              const idle = l.jobs <= 2
              const color = idle ? undefined : teamColorById.get(l.id) || 'var(--sched-team-1)'
              return (
                <div
                  key={l.id}
                  className={`sched-load-cell ${idle ? 'idle' : ''} ${l.over ? 'over' : ''}`}
                  style={idle ? undefined : { background: color }}
                  title={`${l.name} · ${l.jobs} jobs${l.over ? ' · OVER' : idle ? ' · idle' : ''}`}
                >
                  <span className="sched-load-name">{l.name.split(' ')[0]}</span>
                  <span className="sched-load-num">{l.jobs}</span>
                </div>
              )
            })}
          </div>
          <div>
            <div className="sched-load-summary">
              {data.load.reduce((s, l) => s + l.jobs, 0)}
              <span style={{ fontFamily: 'var(--sched-mono)', fontSize: 13, color: 'var(--sched-muted)', fontWeight: 400 }}>
                {' / '}{data.load.length}
              </span>
            </div>
            <div className="sched-load-summary-label">Jobs / Cleaners</div>
          </div>
        </div>
      )}

      {tab === 'bookings' && <BookingsListTab />}

      {tab !== 'calendar' && tab !== 'bookings' && (
        <div className="sched-coming-soon">
          <div className="sched-coming-soon-title">Coming soon.</div>
          <div>This view ({TABS.find((t) => t.key === tab)?.label}) will land next pass.</div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="sched-grid">
          <div>
            {/* CALENDAR TOOLBAR */}
            <div className="sched-cal-toolbar">
              <div className="sched-cal-nav">
                <button className="sched-cal-nav-btn" type="button" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
                <button
                  className="sched-cal-nav-btn today"
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
                  }}
                >
                  Today
                </button>
                <button className="sched-cal-nav-btn" type="button" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
              </div>
              <div className="sched-cal-month">
                {ml.name} <em>{ml.year}</em>
              </div>
              <div className="sched-view-toggle">
                <button className="sched-view-btn active" type="button">Month</button>
                <button className="sched-view-btn" type="button" disabled>Week</button>
                <button className="sched-view-btn" type="button" disabled>Day</button>
                <button className="sched-view-btn" type="button" disabled>Cleaner</button>
                <button className="sched-view-btn" type="button" disabled>Zone</button>
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
            <div className="sched-calendar">
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
                  const visible = day.events.slice(0, 3)
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
                      <div className="sched-cal-events">
                        {visible.map((ev) => {
                          const color = ev.team_member_id
                            ? teamColorById.get(ev.team_member_id) || 'var(--sched-ink)'
                            : 'var(--sched-ink)'
                          const cls = [
                            'sched-cal-event',
                            ev.conflict && overlays.conflicts ? 'conflict' : '',
                            ev.tight && overlays.travel ? 'tight' : '',
                          ].filter(Boolean).join(' ')
                          return (
                            <div key={ev.id} className={cls} style={{ background: color }}>
                              <span className="sched-cal-event-time">{fmtTime(ev.start)}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ev.client}{ev.team_member_id ? '' : ' · ?'}
                              </span>
                            </div>
                          )
                        })}
                        {more > 0 && <div className="sched-cal-event-more">+{more} more</div>}
                      </div>
                      {showIdleBanner && <div className="sched-cal-idle-banner">Open all day</div>}
                    </div>
                  )
                })}
              </div>
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
      )}
    </div>
  )
}
