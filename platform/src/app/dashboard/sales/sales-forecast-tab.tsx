'use client'

import { useEffect, useMemo, useState } from 'react'

type Deal = {
  id: string
  stage: string
  value_cents: number
  probability: number | null
  expected_close_date: string | null
  created_at: string
}

const PROB_BY_STAGE: Record<string, number> = {
  new: 10,
  contacted: 20,
  qualified: 35,
  quoted: 50,
  negotiating: 70,
  booked: 100,
}

function fmt(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

export default function SalesForecastTab() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/deals?limit=500')
      .then((r) => r.json())
      .then((d) => setDeals((d?.deals || []) as Deal[]))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [])

  // Forecast = sum(value × probability/100) per period
  const months = useMemo(() => {
    const out: Array<{ key: string; label: string; weighted: number; pipeline: number; deals: number }> = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      const monthDeals = deals.filter((dl) => {
        const target = dl.expected_close_date ? new Date(dl.expected_close_date) : new Date(dl.created_at)
        return target.getFullYear() === d.getFullYear() && target.getMonth() === d.getMonth()
      })
      const pipeline = monthDeals.reduce((s, dl) => s + dl.value_cents, 0)
      const weighted = monthDeals.reduce((s, dl) => {
        const pct = (dl.probability ?? PROB_BY_STAGE[dl.stage] ?? 30) / 100
        return s + dl.value_cents * pct
      }, 0)
      out.push({ key, label, weighted, pipeline, deals: monthDeals.length })
    }
    return out
  }, [deals])

  const totalForecast = months.reduce((s, m) => s + m.weighted, 0)
  const totalPipeline = months.reduce((s, m) => s + m.pipeline, 0)
  const maxBar = Math.max(1, ...months.map((m) => m.pipeline))

  return (
    <>
      <div className="sl-bar-label">Forecast · Next 6 Months</div>
      <div className="sl-outlook">
        <div className="sl-stat">
          <div className="sl-stat-label">Weighted Forecast</div>
          <div className="sl-stat-value"><span className="unit">$</span>{Math.round(totalForecast / 100).toLocaleString('en-US')}</div>
          <div className="sl-stat-sub">Probability-adjusted</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Total Pipeline</div>
          <div className="sl-stat-value"><span className="unit">$</span>{Math.round(totalPipeline / 100).toLocaleString('en-US')}</div>
          <div className="sl-stat-sub">Unweighted</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Open Deals</div>
          <div className="sl-stat-value">{deals.length}</div>
          <div className="sl-stat-sub">Across all stages</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Avg Probability</div>
          <div className="sl-stat-value">{deals.length > 0 ? Math.round(deals.reduce((s, d) => s + (d.probability ?? PROB_BY_STAGE[d.stage] ?? 30), 0) / deals.length) : 0}<span className="pct">%</span></div>
          <div className="sl-stat-sub">Across pipeline</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Best Month</div>
          <div className="sl-stat-value" style={{ fontSize: 22 }}>{months.reduce((best, m) => (m.weighted > best.weighted ? m : best), months[0]).label}</div>
          <div className="sl-stat-sub">By weighted forecast</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Confidence</div>
          <div className="sl-stat-value">—</div>
          <div className="sl-stat-sub">Wires next pass</div>
        </div>
      </div>

      <div style={{ background: 'var(--sl-canvas)', border: '1px solid var(--sl-line)', borderRadius: 4, padding: 22, marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-muted)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 18, paddingBottom: 8, borderBottom: '1px solid var(--sl-ink)' }}>
          Forecast Chart · 6 Months
        </div>
        {loading && <div className="sl-empty">Loading…</div>}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, height: 240, alignItems: 'end', marginBottom: 12 }}>
            {months.map((m, i) => {
              const pipeH = (m.pipeline / maxBar) * 200
              const wH = (m.weighted / maxBar) * 200
              return (
                <div key={m.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ position: 'relative', width: '100%', height: 200, display: 'flex', alignItems: 'end', gap: 4, justifyContent: 'center' }}>
                    <div style={{ width: 16, height: pipeH, background: 'var(--sl-line)', borderRadius: '2px 2px 0 0' }} title={`Pipeline ${fmt(m.pipeline)}`} />
                    <div style={{ width: 16, height: wH, background: i === 0 ? 'var(--sl-ink)' : 'var(--sl-good)', borderRadius: '2px 2px 0 0' }} title={`Weighted ${fmt(m.weighted)}`} />
                  </div>
                  <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 10, color: 'var(--sl-muted)', letterSpacing: '0.06em' }}>{m.label}</div>
                  <div style={{ fontFamily: 'var(--sl-display)', fontSize: 12, color: 'var(--sl-ink)', fontWeight: 500 }}>{fmt(m.weighted)}</div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--sl-mono)', fontSize: 10, color: 'var(--sl-muted)', letterSpacing: '0.04em', paddingTop: 12, borderTop: '1px dashed var(--sl-line)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 8, background: 'var(--sl-line)', marginRight: 5 }} />Pipeline</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 8, background: 'var(--sl-good)', marginRight: 5 }} />Weighted</span>
        </div>
      </div>

      <div style={{ background: 'var(--sl-canvas)', border: '1px solid var(--sl-line)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 110px 110px', padding: '10px 14px', background: 'var(--sl-bg)', borderBottom: '1px solid var(--sl-line)', fontFamily: 'var(--sl-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--sl-muted)', fontWeight: 600 }}>
          <div>Month</div>
          <div>Pipeline</div>
          <div>Weighted</div>
          <div>Deals</div>
          <div className="right">Confidence</div>
        </div>
        {months.map((m) => (
          <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 110px 110px', padding: '12px 14px', borderBottom: '1px solid var(--sl-line-soft)', alignItems: 'center', fontSize: 12.5 }}>
            <div className="sl-deal-name">{m.label}</div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 12 }}>{fmt(m.pipeline)}</div>
            <div className="sl-deal-value">{fmt(m.weighted)}</div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11 }}>{m.deals}</div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 10.5, color: 'var(--sl-muted)', textAlign: 'right' }}>
              {m.pipeline > 0 ? `${Math.round((m.weighted / m.pipeline) * 100)}%` : '—'}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
