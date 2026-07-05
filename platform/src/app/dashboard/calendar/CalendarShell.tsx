'use client'

import { useState } from 'react'
import CalendarBoard from './CalendarBoard'

// The multi-view scheduling surface. One job model, four projections; the switcher
// picks the axis. Month is today's proven board (nycmaid). Timeline / Kanban /
// Projects are scaffolded here and filled in on subsequent bricks — they render an
// explicit "building" state rather than fake data, so nothing reads as finished
// that isn't.

type View = 'month' | 'timeline' | 'kanban' | 'projects'

const VIEWS: { key: View; label: string; hint: string; ready: boolean }[] = [
  { key: 'month', label: 'Month', hint: 'Overview + recurring + long-job spans', ready: true },
  { key: 'timeline', label: 'Timeline', hint: 'Dispatch by team member × time', ready: false },
  { key: 'kanban', label: 'Kanban', hint: 'Jobs by stage — drag to advance', ready: false },
  { key: 'projects', label: 'Projects', hint: 'Long jobs as spans + milestones', ready: false },
]

function Scaffold({ view }: { view: (typeof VIEWS)[number] }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/60 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-slate-700">{view.label} view — building next</p>
      <p className="mt-1 text-xs text-slate-500">{view.hint}</p>
      <p className="mt-3 text-[11px] text-slate-400">Not wired yet. Month view is live now.</p>
    </div>
  )
}

export default function CalendarShell() {
  const [view, setView] = useState<View>('month')
  const active = VIEWS.find((v) => v.key === view)!

  return (
    <div>
      <div role="tablist" aria-label="Calendar view" className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
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

      {view === 'month' ? <CalendarBoard /> : <Scaffold view={active} />}
    </div>
  )
}
