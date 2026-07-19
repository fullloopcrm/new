'use client'

import { useState } from 'react'
import BreakdownModal, { type BreakdownItem, type BreakdownTokens } from './BreakdownModal'

export interface ClickableStatTile {
  key: string
  label: string
  value: string
  sub?: string
  modalTitle: string
  items: BreakdownItem[]
  background?: string
  valueColor?: string
  labelColor?: string
  valueFontSize?: number
}

interface ClickableStatGridProps {
  tiles: ClickableStatTile[]
  columns: number
  tokens: BreakdownTokens
  padding?: string
  valueFontSize?: number
  labelLetterSpacing?: string
}

export default function ClickableStatGrid({
  tiles,
  columns,
  tokens,
  padding = 'px-5 py-4',
  valueFontSize = 28,
  labelLetterSpacing = '0.18em',
}: ClickableStatGridProps) {
  const [openTile, setOpenTile] = useState<ClickableStatTile | null>(null)

  return (
    <>
      <div className="grid mb-8" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, background: tokens.canvas, border: `1px solid ${tokens.line}` }}>
        {tiles.map((t, i, arr) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setOpenTile(t)}
            className={`text-left ${padding}`}
            style={{
              borderRight: i < arr.length - 1 ? `1px solid ${tokens.line}` : 'none',
              background: t.background ?? tokens.canvas,
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            <div style={{ fontFamily: tokens.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: labelLetterSpacing, color: t.labelColor ?? tokens.muted, fontWeight: 600, marginBottom: 8 }}>
              {t.label}
            </div>
            <div style={{ fontFamily: tokens.display, fontSize: t.valueFontSize ?? valueFontSize, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: t.valueColor ?? tokens.ink, fontFeatureSettings: '"tnum","lnum"' }}>
              {t.value}
            </div>
            {t.sub && (
              <div style={{ fontFamily: tokens.mono, fontSize: '10.5px', color: tokens.muted, marginTop: 6 }}>{t.sub}</div>
            )}
          </button>
        ))}
      </div>
      <BreakdownModal
        open={openTile != null}
        title={openTile?.modalTitle || ''}
        items={openTile?.items || []}
        tokens={tokens}
        onClose={() => setOpenTile(null)}
      />
    </>
  )
}
