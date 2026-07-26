'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CalendarEvent } from './calendar-shared'
import { fmtMoney, fmtTimeFull, dayLabel } from './calendar-shared'

// Two popups shared by Month/Week/Day: click an event chip -> BookingPopup
// (a quick summary + link to the full record); click a day's "+N more" ->
// DayEventsPopup (every job that day, each row opens BookingPopup in turn).
// Both close on Escape, backdrop click, or their own close button — neither
// navigates away on open, so the operator keeps their place on the calendar.

function useEscToClose(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      {children}
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', scheduled: 'Scheduled', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
}

export function BookingPopup({
  event, color, date, onClose,
}: {
  event: CalendarEvent
  color: string
  date?: string
  onClose: () => void
}) {
  const router = useRouter()
  useEscToClose(onClose)

  return (
    <Backdrop onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Booking for ${event.client}`}
        style={{ background: 'var(--sched-canvas, #fff)', borderRadius: 12, width: 360, maxWidth: '100%', border: '1px solid var(--sched-line-soft, #e4e2dc)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 4, background: color }} />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sched-ink, #1c1c1c)' }}>{event.client}</div>
              <div style={{ fontSize: 12.5, color: 'var(--sched-muted, #7a7a78)', marginTop: 2 }}>
                {date ? `${dayLabel(date)} · ` : ''}{fmtTimeFull(event.start)}{event.end ? ` – ${fmtTimeFull(event.end)}` : ''}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 18, lineHeight: 1, color: 'var(--sched-muted, #7a7a78)', cursor: 'pointer', padding: 4 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'rgba(28,28,28,0.06)', color: 'var(--sched-ink, #1c1c1c)' }}>
              {STATUS_LABEL[event.status] || event.status}
            </span>
            {event.conflict && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'rgba(139,26,26,0.1)', color: 'var(--sched-danger, #8b1a1a)' }}>Conflict</span>
            )}
            {event.tight && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'rgba(139,69,19,0.1)', color: 'var(--sched-warn, #8b4513)' }}>Tight transit</span>
            )}
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '80px 1fr', rowGap: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--sched-muted, #7a7a78)' }}>Team</span>
            <span style={{ color: 'var(--sched-ink, #1c1c1c)' }}>{event.team_member_name || 'Unassigned'}</span>
            <span style={{ color: 'var(--sched-muted, #7a7a78)' }}>Service</span>
            <span style={{ color: 'var(--sched-ink, #1c1c1c)' }}>{event.service_type || '—'}</span>
            <span style={{ color: 'var(--sched-muted, #7a7a78)' }}>Price</span>
            <span style={{ color: 'var(--sched-ink, #1c1c1c)' }}>{fmtMoney(event.price_cents)}</span>
            <span style={{ color: 'var(--sched-muted, #7a7a78)' }}>Payment</span>
            <span style={{ color: 'var(--sched-ink, #1c1c1c)' }}>{event.payment_status || '—'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button type="button" onClick={onClose} style={{ fontSize: 13, background: 'none', border: '1px solid var(--sched-line-soft, #ddd)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Close</button>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/bookings/${event.id}`)}
              style={{ fontSize: 13, fontWeight: 600, background: 'var(--sched-ink, #1c1c1c)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
            >
              Open full booking
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  )
}

export function DayEventsPopup({
  date, events, colorFor, onSelect, onClose,
}: {
  date: string
  events: CalendarEvent[]
  colorFor: (event: CalendarEvent) => string
  onSelect: (event: CalendarEvent) => void
  onClose: () => void
}) {
  useEscToClose(onClose)
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start))

  return (
    <Backdrop onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`All jobs on ${dayLabel(date)}`}
        style={{ background: 'var(--sched-canvas, #fff)', borderRadius: 12, width: 420, maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--sched-line-soft, #e4e2dc)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--sched-line-soft, #e4e2dc)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--sched-ink, #1c1c1c)' }}>{dayLabel(date, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div style={{ fontSize: 12, color: 'var(--sched-muted, #7a7a78)' }}>{sorted.length} {sorted.length === 1 ? 'job' : 'jobs'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 18, lineHeight: 1, color: 'var(--sched-muted, #7a7a78)', cursor: 'pointer', padding: 4 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 0' }}>
          {sorted.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onSelect(ev)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(28,28,28,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: colorFor(ev) }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--sched-mono, monospace)', color: 'var(--sched-muted, #7a7a78)', width: 56, flexShrink: 0 }}>{fmtTimeFull(ev.start)}</span>
              <span style={{ fontSize: 13.5, color: 'var(--sched-ink, #1c1c1c)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.client}</span>
              <span style={{ fontSize: 11.5, color: 'var(--sched-muted, #7a7a78)', flexShrink: 0 }}>{ev.team_member_name || 'Unassigned'}</span>
            </div>
          ))}
          {sorted.length === 0 && (
            <div style={{ padding: '20px 18px', textAlign: 'center', fontSize: 13, color: 'var(--sched-muted, #7a7a78)' }}>No jobs.</div>
          )}
        </div>
      </div>
    </Backdrop>
  )
}
