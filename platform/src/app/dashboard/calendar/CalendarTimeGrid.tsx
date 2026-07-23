'use client'

import type { CalendarDay, CalendarEvent } from './calendar-shared'
import { packEventsIntoLanes, fmtTime, dayLabel } from './calendar-shared'

// Hour-positioned grid shared by Week (7 columns) and Day (1 column) — each
// day gets its own column, events are placed by actual start/end time, and
// genuinely overlapping jobs split into side-by-side lanes (classic
// interval-graph packing, see calendar-shared.packEventsIntoLanes). `columns`
// caps how many lanes render side-by-side before the rest collapse into a
// single "+N more" pill for that day (opens the same DayEventsPopup Month
// uses) — the same 1/2-column preference the Month grid uses, applied here
// to how many concurrent jobs a day column shows before it summarizes.

const DAY_START_MIN = 6 * 60  // 6 AM
const DAY_END_MIN = 22 * 60   // 10 PM
const RANGE = DAY_END_MIN - DAY_START_MIN
const HOUR_PX = 52
const HOURS = Array.from({ length: RANGE / 60 + 1 }, (_, i) => DAY_START_MIN / 60 + i)

function hourLabel(h: number): string {
  const ampm = h >= 12 ? 'p' : 'a'
  const hr = h % 12 || 12
  return `${hr}${ampm}`
}

export default function CalendarTimeGrid({
  days, todayStr, columns, colorFor, onSelectEvent, onOverflow,
}: {
  days: CalendarDay[]
  todayStr: string
  columns: 1 | 2
  colorFor: (event: CalendarEvent) => string
  onSelectEvent: (event: CalendarEvent, date: string) => void
  onOverflow: (date: string) => void
}) {
  const gridHeight = (RANGE / 60) * HOUR_PX

  return (
    <div className="sched-timegrid">
      <div className="sched-timegrid-head" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d) => (
          <div key={d.date} className={`sched-timegrid-head-cell ${d.date === todayStr ? 'today' : ''}`}>
            <span className="sched-timegrid-head-dow">{dayLabel(d.date, { weekday: 'short' })}</span>
            <span className="sched-timegrid-head-date">{dayLabel(d.date, { day: 'numeric' })}</span>
          </div>
        ))}
      </div>

      <div className="sched-timegrid-body" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div className="sched-timegrid-hours" style={{ height: gridHeight }}>
          {HOURS.map((h) => (
            <div key={h} className="sched-timegrid-hour-label" style={{ top: (h * 60 - DAY_START_MIN) / 60 * HOUR_PX }}>
              {hourLabel(h)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const laned = packEventsIntoLanes(day.events)
          const visible = laned.filter((e) => e.lane < columns)
          const hiddenCount = laned.length - visible.length
          return (
            <div key={day.date} className={`sched-timegrid-col ${day.date === todayStr ? 'today' : ''}`} style={{ height: gridHeight }}>
              {HOURS.map((h) => (
                <div key={h} className="sched-timegrid-gridline" style={{ top: (h * 60 - DAY_START_MIN) / 60 * HOUR_PX }} />
              ))}
              {visible.map((ev) => {
                const cappedLanes = Math.min(ev.lanesInGroup, columns)
                const lane = Math.min(ev.lane, cappedLanes - 1)
                const top = Math.max(0, (ev.startMin - DAY_START_MIN) / 60) * HOUR_PX
                const height = Math.max(20, (Math.min(ev.endMin, DAY_END_MIN) - Math.max(ev.startMin, DAY_START_MIN)) / 60 * HOUR_PX)
                const widthPct = 100 / cappedLanes
                return (
                  <div
                    key={ev.id}
                    className={`sched-timegrid-event ${ev.conflict ? 'conflict' : ''}`}
                    style={{
                      top, height,
                      left: `${lane * widthPct}%`,
                      width: `calc(${widthPct}% - 3px)`,
                      background: colorFor(ev),
                    }}
                    onClick={() => onSelectEvent(ev, day.date)}
                    title={`${ev.client} · ${fmtTime(ev.start)}`}
                  >
                    <span className="sched-timegrid-event-time">{fmtTime(ev.start)}</span>
                    <span className="sched-timegrid-event-client">{ev.client}</span>
                  </div>
                )
              })}
              {hiddenCount > 0 && (
                <div className="sched-timegrid-overflow" onClick={() => onOverflow(day.date)}>
                  +{hiddenCount} more
                </div>
              )}
              {day.events.length === 0 && <div className="sched-timegrid-empty">No jobs</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
