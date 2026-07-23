'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import RichMonthView from './RichMonthView'
import KanbanView from './KanbanView'
import TimelineView from './TimelineView'
import MobileDayListView from './MobileDayListView'

// The multi-view scheduling surface. One job model, three projections; the switcher
// picks the axis. Each view has its own persisted size (+/-) so an operator can
// tune density per view (dense Month, larger Timeline, etc.). Size uses CSS zoom,
// which scales the whole view proportionally regardless of Tailwind's fixed text
// sizes — best in Chromium (the operator app's target).
//
// Projects used to be a fourth tab here (ProjectsView) — moved out to its own
// page (/dashboard/jobs/projects) since a project deserves more than a Gantt
// strip squeezed into the calendar switcher. Don't re-add it here.

type View = 'month' | 'timeline' | 'kanban'

const VIEWS: { key: View; label: string; hint: string; ready: boolean }[] = [
  { key: 'month', label: 'Month', hint: 'Overview + recurring + long-job spans', ready: true },
  { key: 'timeline', label: 'Timeline', hint: 'Dispatch by team member × time', ready: true },
  { key: 'kanban', label: 'Kanban', hint: 'Jobs by status — drag to advance', ready: true },
]

const SCALE_MIN = 0.7
const SCALE_MAX = 1.4
const SCALE_STORAGE_KEY = 'fl-cal-view-scales'

function clampScale(n: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(n * 10) / 10))
}

function Scaffold({ view }: { view: (typeof VIEWS)[number] }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/60 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-slate-700">{view.label} view — building next</p>
      <p className="mt-1 text-xs text-slate-500">{view.hint}</p>
    </div>
  )
}

export default function CalendarShell() {
  const [view, setView] = useState<View>('month')
  const [scales, setScales] = useState<Record<View, number>>({ month: 1, timeline: 1, kanban: 1 })
  const active = VIEWS.find((v) => v.key === view)!

  // Load persisted per-view sizes once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCALE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<View, number>>
        setScales((cur) => ({
          month: clampScale(parsed.month ?? cur.month),
          timeline: clampScale(parsed.timeline ?? cur.timeline),
          kanban: clampScale(parsed.kanban ?? cur.kanban),
        }))
      }
    } catch { /* ignore bad storage */ }
  }, [])

  const scale = scales[view]

  return (
    <div>
      {/* Mobile: a simple today-only list (scheduled/live/completed), scoped to
          the ET calendar day — re-derived on load so it naturally rolls to the
          new day at midnight ET without a separate clear job. */}
      <div className="md:hidden">
        <MobileDayListView />
      </div>

      <div className="hidden md:block">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200">
        <div role="tablist" aria-label="Calendar view" className="flex flex-wrap gap-1">
          {VIEWS.map((v) => {
            const selected = v.key === view
            return (
              <button
                key={v.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setView(v.key)}
                title={v.hint}
                className={`relative -mb-px px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  selected
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {v.label}
                {!v.ready && (
                  <span className="ml-1.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-slate-400">soon</span>
                )}
              </button>
            )
          })}
        </div>

      </div>

      {/* Font-only scaling: the size control adjusts the TEXT inside event chips,
          not the window/layout. Each rule scales from the element's real base size,
          so 100% renders identically to before. Per-view value via --cal-fs. */}
      <div className="cal-scale" style={{ '--cal-fs': scale } as CSSProperties}>
        <style>{`
          .cal-scale .fc-daygrid-event .fc-event-title { font-size: calc(9px * var(--cal-fs, 1)) !important; }
          .cal-scale .cal-chip-sm { font-size: calc(10px * var(--cal-fs, 1)); }
          .cal-scale .cal-chip-md { font-size: calc(14px * var(--cal-fs, 1)); }
        `}</style>
        {view === 'month' ? <RichMonthView /> : view === 'timeline' ? <TimelineView /> : view === 'kanban' ? <KanbanView /> : <Scaffold view={active} />}
      </div>
      </div>
    </div>
  )
}
