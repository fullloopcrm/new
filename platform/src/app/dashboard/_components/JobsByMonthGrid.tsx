'use client'
import { useState } from 'react'

export type MonthJob = {
  id: string
  clientName: string
  date: string
  status: string
  price: number
}

export type MonthCell = {
  label: string
  count: number
  revenue: number
  isCurrent: boolean
  isFuture: boolean
  jobs: MonthJob[]
}

const formatMoney = (cents: number) => '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })

export function JobsByMonthGrid({ months, canViewFinance, V }: {
  months: MonthCell[]
  canViewFinance: boolean
  V: { line: string; canvas: string; ink: string; muted: string; muted2: string; display: string; mono: string }
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const open = openIdx !== null ? months[openIdx] : null

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)', background: V.canvas, border: `1px solid ${V.line}` }}>
        {months.map((m, i, arr) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="px-3 py-3 text-left hover:opacity-70 transition-opacity cursor-pointer"
            style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none', background: m.isCurrent ? '#FBFBF6' : (m.isFuture ? 'transparent' : V.canvas) }}
          >
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.14em', color: m.isCurrent ? V.ink : V.muted, fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontFamily: V.display, fontSize: '22px', fontWeight: 500, color: m.count === 0 ? V.muted2 : V.ink, lineHeight: 1, fontFeatureSettings: '"tnum","lnum"' }}>{m.count}</div>
            {canViewFinance && (
              <div style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.muted, marginTop: 4 }}>{m.revenue > 0 ? formatMoney(m.revenue) : '—'}</div>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpenIdx(null)}
        >
          <div
            className="w-full max-w-2xl mx-4"
            style={{ background: V.canvas, border: `1px solid ${V.line}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${V.line}` }}>
              <div>
                <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600 }}>{open.label} — {open.count} jobs</div>
                {canViewFinance && (
                  <div style={{ fontFamily: V.display, fontSize: '20px', fontWeight: 500, color: V.ink, marginTop: 2 }}>{formatMoney(open.revenue)}</div>
                )}
              </div>
              <button type="button" onClick={() => setOpenIdx(null)} style={{ fontFamily: V.mono, fontSize: '12px', color: V.muted }}>Close ✕</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {open.jobs.length === 0 ? (
                <div className="px-5 py-8 text-center" style={{ fontFamily: V.mono, fontSize: '12px', color: V.muted }}>No jobs this month.</div>
              ) : (
                open.jobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${V.line}` }}>
                    <div>
                      <div style={{ fontFamily: V.display, fontSize: '14px', color: V.ink }}>{j.clientName}</div>
                      <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 2 }}>{formatDate(j.date)} · {j.status}</div>
                    </div>
                    {canViewFinance && (
                      <div style={{ fontFamily: V.mono, fontSize: '12px', color: V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{formatMoney(j.price)}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
