'use client'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { CrewRow } from '@/lib/crew'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', mono: 'var(--mono)',
}

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), {
  ssr: false,
  loading: () => <div style={{ height: 400, background: V.canvas, border: `1px solid ${V.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.muted }}>Loading map…</div>,
})

export interface MapJob {
  id: string
  start_time: string
  status: string
  service_type: string | null
  cleaner_id: string | null
  clients: { name: string; address: string; latitude?: number | null; longitude?: number | null } | null
  team_members: { name: string } | null
  booking_team_members?: CrewRow[] | null
}

type RangeKey = 'today' | 'week' | 'month'
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
]

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: V.mono, fontSize: '11px', padding: '4px 10px', borderRadius: 999,
        border: `1px solid ${active ? V.ink : V.line}`,
        background: active ? V.ink : 'transparent',
        color: active ? V.canvas : V.muted,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// Boundaries are computed server-side (dashboard/page.tsx) and passed as
// ISO strings so the map's day/week/month cutoffs match the rest of this
// page's ladders/KPIs exactly, rather than a second, possibly-drifting
// definition of "today" computed independently in the browser.
export default function JobsMap({
  jobs, dayRange, weekRange, monthRange,
}: {
  jobs: MapJob[]
  dayRange: [string, string]
  weekRange: [string, string]
  monthRange: [string, string]
}) {
  const [range, setRange] = useState<RangeKey>('today')
  const [cleanerId, setCleanerId] = useState<string>('all')

  const [rangeStart, rangeEnd] = useMemo(() => {
    const bounds = { today: dayRange, week: weekRange, month: monthRange }[range]
    return [new Date(bounds[0]).getTime(), new Date(bounds[1]).getTime()]
  }, [range, dayRange, weekRange, monthRange])

  // Every cleaner touching ANY job in the widest (month) window — not just
  // the currently selected range — so switching to "Today" doesn't also
  // wipe someone out of the dropdown who only has jobs later this week/month.
  const cleaners = useMemo(() => {
    const byId = new Map<string, string>()
    for (const j of jobs) {
      if (j.booking_team_members && j.booking_team_members.length > 0) {
        for (const c of j.booking_team_members) {
          if (c.team_member_id && c.team_members?.name) byId.set(c.team_member_id, c.team_members.name)
        }
      } else if (j.cleaner_id && j.team_members?.name) {
        byId.set(j.cleaner_id, j.team_members.name)
      }
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [jobs])

  const filteredJobs = useMemo(() => jobs.filter(j => {
    // job.start_time is a naive Eastern wall-clock string (see dashboard/
    // page.tsx's parseNaive comment) — reinterpreting as if UTC keeps this
    // consistent with dayRange/weekRange/monthRange regardless of the
    // browser's own local timezone.
    const t = new Date(j.start_time.replace(' ', 'T').replace(/(\.\d+)?Z?$/, '') + 'Z').getTime()
    if (t < rangeStart || t > rangeEnd) return false
    if (cleanerId === 'all') return true
    const crewIds = j.booking_team_members && j.booking_team_members.length > 0
      ? j.booking_team_members.map(c => c.team_member_id)
      : (j.cleaner_id ? [j.cleaner_id] : [])
    return crewIds.includes(cleanerId)
  }), [jobs, rangeStart, rangeEnd, cleanerId])

  // DashboardMap's geocoding effect keys off this array by reference — an
  // inline .map() in the JSX below would build a brand-new array (and new
  // per-job objects) on every render, re-running the full geocode pipeline
  // (and re-flashing "Locating N jobs…") on every filter click even though
  // most jobs already carry persisted lat/lng and don't need it. Memoizing
  // means that only actually happens when filteredJobs itself changes.
  const dashboardMapJobs = useMemo(
    () => filteredJobs.map(j => ({ ...j, cleaners: j.team_members })),
    [filteredJobs]
  )

  const Bar = (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>Jobs · Map</div>
  )

  return (
    <div className="mb-8">
      {Bar}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {RANGE_OPTIONS.map(opt => (
          <Pill key={opt.key} active={range === opt.key} onClick={() => setRange(opt.key)}>{opt.label}</Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Pill active={cleanerId === 'all'} onClick={() => setCleanerId('all')}>All cleaners</Pill>
        {cleaners.map(([id, name]) => (
          <Pill key={id} active={cleanerId === id} onClick={() => setCleanerId(id)}>{name}</Pill>
        ))}
      </div>
      <div style={{ border: `1px solid ${V.line}` }}>
        {/* DashboardMap maps `cleaners(name)`; our rows carry `team_members(name)` — alias it. */}
        <DashboardMap jobs={dashboardMapJobs as never} />
      </div>
    </div>
  )
}
