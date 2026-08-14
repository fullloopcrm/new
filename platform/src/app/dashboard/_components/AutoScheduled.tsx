'use client'
import { useEffect, useState } from 'react'
import { naiveToAnchoredDate } from '@/lib/naive-time'

interface AutoScheduledEntry {
  id: string
  created_at: string
  message: string
  booking_id: string | null
  client_name: string | null
  client_address: string | null
  team_member_name: string | null
  start_time: string | null
  end_time: string | null
  status: string | null
  reason: string | null
}

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', warn: 'var(--color-loop-warn)', mono: 'var(--mono)',
}

const fmtWhen = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AutoScheduled() {
  const [entries, setEntries] = useState<AutoScheduledEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/auto-scheduled')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (loaded && entries.length === 0) return null

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>{children}</div>
  )

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <Bar>{`Auto Scheduled (${entries.length})`}</Bar>
      </div>

      {entries.map((e) => (
        <div key={e.id} className="px-4 py-3 mb-2" style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: V.muted }}>
              {fmtWhen(e.created_at)} {e.status ? `· ${e.status.replace(/_/g, ' ')}` : ''}
            </div>
            {e.booking_id && (
              <a href={`/dashboard/bookings?edit=${e.booking_id}`} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: V.ink, textDecoration: 'underline' }}>View booking</a>
            )}
          </div>
          <div className="mt-1" style={{ color: V.ink }}>
            {e.client_name
              ? <>{e.client_name}{e.client_address ? ` — ${e.client_address}` : ''}{e.team_member_name ? ` → assigned to ${e.team_member_name}` : ''}</>
              : e.message}
          </div>
          {(e.start_time || e.end_time) && (
            <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 2 }}>
              {e.start_time ? naiveToAnchoredDate(e.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' , timeZone: 'UTC' }) : ''}
              {e.end_time ? ` – ${naiveToAnchoredDate(e.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' , timeZone: 'UTC' })}` : ''}
            </div>
          )}
          <div className="mt-2" style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.warn }}>
            Why: {e.reason || 'No scoring reason recorded'}
          </div>
        </div>
      ))}
    </div>
  )
}
