'use client'

import { useEffect } from 'react'
import type { BreakdownGroup } from './stat-breakdown-types'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', muted2: 'var(--color-loop-muted-2)',
  good: 'var(--color-loop-good)', warn: 'var(--color-loop-warn)',
  display: 'var(--display)', mono: 'var(--mono)',
}

const formatMoney = (cents: number) => '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

interface Props {
  group: BreakdownGroup
  onClose: () => void
}

export default function StatDrillModal({ group, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const hasAmounts = group.rows.some(r => r.amountCents != null)
  const total = hasAmounts ? group.rows.reduce((s, r) => s + (r.amountCents || 0), 0) : null

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: V.canvas, border: `1px solid ${V.line}`, maxWidth: 640, width: '100%', maxHeight: '78vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${V.line}` }}>
          <div>
            <div style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600 }}>{group.title}</div>
            <div style={{ fontFamily: V.mono, fontSize: '11px', color: V.muted2, marginTop: 4 }}>
              {group.rows.length} record{group.rows.length === 1 ? '' : 's'}
              {total != null ? ` · ${formatMoney(total)} total` : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ fontFamily: V.mono, fontSize: '16px', color: V.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto' }}>
          {group.rows.length === 0 ? (
            <p className="p-5" style={{ color: V.muted, fontFamily: V.mono, fontSize: '12px' }}>{group.emptyLabel || 'No records in this range.'}</p>
          ) : group.rows.map((r, i, arr) => (
            <div key={r.id} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: V.ink }}>{r.primary}</p>
                {r.secondary && <p className="text-sm truncate" style={{ color: V.muted }}>{r.secondary}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {r.amountCents != null && <p style={{ fontFamily: V.mono, fontSize: '13px', color: V.ink }}>{formatMoney(r.amountCents)}</p>}
                {r.date && <p style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 2 }}>{formatDate(r.date)}</p>}
                {r.status && (
                  <span style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: r.status === 'completed' ? V.good : r.status === 'in_progress' ? V.warn : V.muted }}>
                    {r.status === 'in_progress' ? 'live' : r.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
