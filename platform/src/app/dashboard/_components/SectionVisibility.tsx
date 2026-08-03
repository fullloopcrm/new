'use client'

import { useState, useTransition } from 'react'

interface SectionVisibilityProps {
  section: string
  label: string
  initialHidden: boolean
  children: React.ReactNode
}

const INK = 'var(--color-loop-ink)'
const MUTED = 'var(--color-loop-muted)'
const LINE = 'var(--color-loop-line)'
const CANVAS = 'var(--color-loop-canvas)'
const MONO = 'var(--mono)'

// Wraps one Loop dashboard row (Revenue/Sales/Jobs/etc.) with an on/off toggle.
// Persisted tenant-wide via /api/dashboard/section-visibility — a tenant with
// no sales pipeline or no bookings can turn that row off once instead of
// staring at zeros every day. Local state flips instantly; the PUT is fired
// in the background so the toggle never waits on the network.
export default function SectionVisibility({ section, label, initialHidden, children }: SectionVisibilityProps) {
  const [hidden, setHidden] = useState(initialHidden)
  const [, startTransition] = useTransition()

  const toggle = () => {
    const next = !hidden
    setHidden(next)
    startTransition(() => {
      fetch('/api/dashboard/section-visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, hidden: next }),
      }).catch(() => {})
    })
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div
          className="inline-block"
          style={{
            fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em',
            color: hidden ? MUTED : INK, fontWeight: 600, paddingBottom: '6px',
            borderBottom: `1px solid ${hidden ? LINE : INK}`, minWidth: '100px',
          }}
        >
          {label}{hidden ? ' · hidden' : ''}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!hidden}
          aria-label={hidden ? `Show ${label} row` : `Hide ${label} row`}
          onClick={toggle}
          title={hidden ? `Show ${label}` : `Hide ${label}`}
          style={{
            width: 28, height: 16, borderRadius: 8, border: `1px solid ${INK}`,
            background: hidden ? 'transparent' : INK, position: 'relative', flexShrink: 0,
            cursor: 'pointer', padding: 0,
          }}
        >
          <span
            style={{
              position: 'absolute', top: 1, left: hidden ? 1 : 12, width: 12, height: 12, borderRadius: 6,
              background: hidden ? INK : CANVAS, transition: 'left 120ms ease',
            }}
          />
        </button>
      </div>
      {!hidden && children}
    </div>
  )
}
