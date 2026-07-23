'use client'

import { useState } from 'react'
import StatDrillModal from './StatDrillModal'
import type { BreakdownGroup, StatCell } from './stat-breakdown-types'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)',
  display: 'var(--display)', mono: 'var(--mono)',
}

interface Props {
  cells: StatCell[]
  columns: number
  breakdowns: Record<string, BreakdownGroup>
  valueFontSize?: string
  emphasizeFontSize?: string
  padding?: string
  className?: string
}

// Generic clickable stat grid for the Loop dashboard — any cell whose `key`
// has a matching entry in `breakdowns` opens a drill-down modal listing the
// underlying records. Cells without a breakdown entry render inert, same as
// before. Reusable on any page that renders a row of computed stats.
export default function ClickableStatGrid({ cells, columns, breakdowns, valueFontSize = '26px', emphasizeFontSize, padding = 'px-5 py-4', className = 'mb-8' }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const openGroup = openKey ? breakdowns[openKey] : null

  return (
    <>
      <div className={`grid ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, background: V.canvas, border: `1px solid ${V.line}` }}>
        {cells.map((c, i, arr) => {
          const clickable = Boolean(breakdowns[c.key])
          const Wrapper = clickable ? 'button' : 'div'
          return (
            <Wrapper
              key={c.key}
              onClick={clickable ? () => setOpenKey(c.key) : undefined}
              className={`${padding} text-left`}
              style={{
                borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none',
                background: c.bg ?? (c.emphasize ? '#FBFBF6' : V.canvas),
                cursor: clickable ? 'pointer' : 'default',
                width: '100%',
              }}
            >
              <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontFamily: V.display, fontSize: c.emphasize ? (emphasizeFontSize || valueFontSize) : valueFontSize, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: c.valueColor || V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.value}</div>
              {c.sub && <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 6 }}>{c.sub}</div>}
            </Wrapper>
          )
        })}
      </div>
      {openGroup && <StatDrillModal group={openGroup} onClose={() => setOpenKey(null)} />}
    </>
  )
}
