'use client'

import Link from 'next/link'

// Shared "click a stat tile, see how it was calculated" breakdown modal.
// Ported from nycmaid's admin dashboard jobs-modal pattern.

export interface BreakdownItem {
  id: string
  title: string
  subtitle?: string
  meta?: string
  amountCents?: number
  amountText?: string
  date?: string
  status?: string
  statusTone?: 'good' | 'warn' | 'muted'
  href?: string
}

export interface BreakdownTokens {
  canvas: string
  line: string
  lineSoft?: string
  ink: string
  muted: string
  muted2?: string
  good: string
  warn: string
  display: string
  mono: string
}

interface BreakdownModalProps {
  open: boolean
  title: string
  items: BreakdownItem[]
  tokens: BreakdownTokens
  onClose: () => void
  emptyLabel?: string
  showTotal?: boolean
}

const defaultFormatAmount = (cents: number) => '$' + Math.round(cents / 100).toLocaleString('en-US')

export default function BreakdownModal({ open, title, items, tokens, onClose, emptyLabel = 'No records found', showTotal = true }: BreakdownModalProps) {
  if (!open) return null
  const total = items.reduce((s, i) => s + (i.amountCents || 0), 0)
  const lineSoft = tokens.lineSoft || tokens.line
  const muted2 = tokens.muted2 || tokens.muted

  return (
    <div
      className="fixed inset-0 flex items-end md:items-center justify-center z-[1000]"
      style={{ background: 'rgba(28, 28, 28, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="p-6 w-full md:max-w-2xl max-h-[85vh] md:max-h-[80vh] overflow-hidden flex flex-col"
        style={{ background: tokens.canvas, border: `1px solid ${tokens.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: `1px solid ${tokens.line}` }}>
          <h3 style={{ fontFamily: tokens.display, fontSize: '20px', fontWeight: 500, letterSpacing: '-0.02em', color: tokens.ink }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ color: tokens.muted, fontSize: '22px', lineHeight: 1 }}>&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <p style={{ color: tokens.muted }} className="text-center py-8">{emptyLabel}</p>
          ) : (
            items.map((item, i, arr) => {
              const body = (
                <div className="flex justify-between items-start">
                  <div className="min-w-0 pr-3">
                    <p className="font-medium truncate" style={{ color: tokens.ink }}>{item.title}</p>
                    {item.subtitle && <p className="text-sm truncate" style={{ color: tokens.muted }}>{item.subtitle}</p>}
                    {item.meta && <p className="text-xs truncate" style={{ color: muted2 }}>{item.meta}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {(item.amountText || item.amountCents != null) && (
                      <p style={{ fontFamily: tokens.display, fontSize: '16px', fontWeight: 500, color: tokens.ink, fontFeatureSettings: '"tnum","lnum"' }}>
                        {item.amountText ?? defaultFormatAmount(item.amountCents || 0)}
                      </p>
                    )}
                    {item.date && <p className="text-sm" style={{ color: tokens.muted }}>{item.date}</p>}
                    {item.status && (
                      <span style={{ fontFamily: tokens.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: item.statusTone === 'good' ? tokens.good : item.statusTone === 'warn' ? tokens.warn : tokens.muted }}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              )
              const rowStyle = { borderBottom: i < arr.length - 1 ? `1px solid ${lineSoft}` : 'none' }
              return item.href ? (
                <Link key={item.id} href={item.href} className="block py-3 px-2 transition-colors hover:bg-black/[0.02]" style={rowStyle}>
                  {body}
                </Link>
              ) : (
                <div key={item.id} className="py-3 px-2" style={rowStyle}>
                  {body}
                </div>
              )
            })
          )}
        </div>
        {showTotal && (
          <div className="pt-4 mt-4 flex justify-between items-center" style={{ borderTop: `1px solid ${tokens.line}` }}>
            <p className="text-sm" style={{ color: tokens.muted }}>{items.length} record{items.length !== 1 ? 's' : ''}</p>
            <p style={{ fontFamily: tokens.display, fontSize: '18px', fontWeight: 500, color: tokens.ink, fontFeatureSettings: '"tnum","lnum"' }}>Total: {defaultFormatAmount(total)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
