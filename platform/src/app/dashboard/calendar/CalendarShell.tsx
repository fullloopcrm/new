'use client'

import { useEffect, useState } from 'react'
import CalendarBoard from './CalendarBoard'
import KanbanView from './KanbanView'
import ProjectsView from './ProjectsView'
import TimelineView from './TimelineView'

// The multi-view scheduling surface. One job model, four projections; the switcher
// picks the axis. Each view has its own persisted size (+/-) so an operator can
// tune density per view (dense Month, larger Timeline, etc.). Size uses CSS zoom,
// which scales the whole view proportionally regardless of Tailwind's fixed text
// sizes — best in Chromium (the operator app's target).

type View = 'month' | 'timeline' | 'kanban' | 'projects'

const VIEWS: { key: View; label: string; hint: string; ready: boolean }[] = [
  { key: 'month', label: 'Month', hint: 'Overview + recurring + long-job spans', ready: true },
  { key: 'timeline', label: 'Timeline', hint: 'Dispatch by team member × time', ready: true },
  { key: 'kanban', label: 'Kanban', hint: 'Jobs by status — drag to advance', ready: true },
  { key: 'projects', label: 'Projects', hint: 'Long jobs as spans + milestones', ready: true },
]

const SCALE_MIN = 0.7
const SCALE_MAX = 1.4
const SCALE_STEP = 0.1
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
  const [scales, setScales] = useState<Record<View, number>>({ month: 1, timeline: 1, kanban: 1, projects: 1 })
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
          projects: clampScale(parsed.projects ?? cur.projects),
        }))
      }
    } catch { /* ignore bad storage */ }
  }, [])

  function adjust(delta: number) {
    setScales((cur) => {
      const next = { ...cur, [view]: clampScale(cur[view] + delta) }
      try { localStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const scale = scales[view]

  return (
    <div>
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

        {/* Per-view size adjuster */}
        <div className="flex items-center gap-1 pb-1.5" title="Adjust this view's size">
          <button
            onClick={() => adjust(-SCALE_STEP)}
            disabled={scale <= SCALE_MIN}
            aria-label="Decrease size"
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >−</button>
          <span className="w-10 text-center text-[11px] tabular-nums text-slate-500">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => adjust(SCALE_STEP)}
            disabled={scale >= SCALE_MAX}
            aria-label="Increase size"
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >+</button>
        </div>
      </div>

      {/* zoom scales the active view proportionally; each view keeps its own value */}
      <div style={{ zoom: scale }}>
        {view === 'month' ? <CalendarBoard /> : view === 'timeline' ? <TimelineView /> : view === 'kanban' ? <KanbanView /> : view === 'projects' ? <ProjectsView /> : <Scaffold view={active} />}
      </div>
    </div>
  )
}
