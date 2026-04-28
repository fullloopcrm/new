'use client'

import { useEffect, useState } from 'react'
import './finance.css'

type Tab = 'overview' | 'revenue' | 'margin' | 'forecast'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'overview', letter: 'A', label: 'Overview' },
  { key: 'revenue', letter: 'B', label: 'Revenue' },
  { key: 'margin', letter: 'C', label: 'Margin' },
  { key: 'forecast', letter: 'D', label: 'Forecast' },
]

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'ytd' | 'custom'
const DATE_OPTS: Array<{ key: DateRange; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Custom' },
]

type Summary = {
  weekRevenue?: number
  weekLabor?: number
  monthRevenue?: number
  monthLabor?: number
  monthLaborPaid?: number
  yearRevenue?: number
  yearLabor?: number
  pendingClientPayments?: number
  pendingCleanerPayments?: number
}

type EnrichedTotals = {
  total: number
  vip: number
  recurring: number
  mrr_cents: number
}

function fmt(cents: number): string {
  return Math.round(cents / 100).toLocaleString('en-US')
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [range, setRange] = useState<DateRange>('month')
  const [summary, setSummary] = useState<Summary>({})
  const [totals, setTotals] = useState<EnrichedTotals | null>(null)
  const [topClients, setTopClients] = useState<Array<{ name: string; amount_cents: number; meta: string; vip: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/finance/summary').then((r) => r.json()).catch(() => ({})),
      fetch('/api/clients/enriched').then((r) => r.json()).catch(() => ({ clients: [], totals: null })),
    ]).then(([s, e]) => {
      setSummary(s || {})
      setTotals(e?.totals || null)
      const cs = (e?.clients || []) as Array<{
        name: string
        ltv_actual_cents: number
        bookings_count: number
        recurring: { frequency: string } | null
        stage: string
      }>
      const top = [...cs]
        .sort((a, b) => b.ltv_actual_cents - a.ltv_actual_cents)
        .slice(0, 5)
        .map((c) => ({
          name: c.name,
          amount_cents: c.ltv_actual_cents,
          meta: c.recurring ? `${c.recurring.frequency} · ${c.bookings_count} jobs` : `One-time · ${c.bookings_count} ${c.bookings_count === 1 ? 'job' : 'jobs'}`,
          vip: c.stage === 'vip',
        }))
      setTopClients(top)
      setLoading(false)
    })
  }, [])

  const monthRevCents = (summary.monthRevenue ?? 0) * 100 || (summary.monthRevenue ?? 0)
  const yearRevCents = (summary.yearRevenue ?? 0) * 100 || (summary.yearRevenue ?? 0)
  // bookings.price is INTEGER cents, so summary returns cents already.
  const monthRev = summary.monthRevenue ?? 0
  const yearRev = summary.yearRevenue ?? 0
  const monthLabor = summary.monthLabor ?? 0
  const marginPct = monthRev > 0 ? Math.round(((monthRev - monthLabor) / monthRev) * 100) : 0
  const netCents = monthRev - monthLabor
  const outstanding = summary.pendingClientPayments ?? 0
  const mrrCents = totals?.mrr_cents ?? 0
  const recurringCount = totals?.recurring ?? 0
  const totalRevenueSum = topClients.reduce((s, c) => s + c.amount_cents, 0)

  return (
    <div className="fin-scope">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div className="fin-date-range">
          {DATE_OPTS.map((d) => (
            <button
              key={d.key}
              className={`fin-date-opt ${range === d.key ? 'active' : ''}`}
              onClick={() => setRange(d.key)}
              type="button"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fin-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`fin-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
            <span className="fin-tab-letter">{t.letter}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="fin-bar-label">Snapshot</div>
      <div className="fin-outlook">
        <div className="fin-stat">
          <div className="fin-stat-label">Revenue · Month</div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(monthRev)}</div>
          <div className="fin-stat-sub">Booked + collected</div>
        </div>
        <div className="fin-stat">
          <div className="fin-stat-label">Net Margin <span className="fin-stat-tag up">{marginPct}%</span></div>
          <div className="fin-stat-value">{marginPct}<span className="pct">%</span></div>
          <div className="fin-stat-sub good"><strong>${fmt(netCents)}</strong> kept</div>
        </div>
        <div className="fin-stat">
          <div className="fin-stat-label">MRR <span className="fin-stat-tag up">recurring</span></div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(mrrCents)}</div>
          <div className="fin-stat-sub">From <strong>{recurringCount}</strong> recurring</div>
        </div>
        <div className="fin-stat">
          <div className="fin-stat-label">Outstanding {outstanding > 0 && <span className="fin-stat-tag warn">action</span>}</div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(outstanding)}</div>
          <div className={`fin-stat-sub ${outstanding > 0 ? 'warn' : ''}`}>
            {outstanding > 0 ? 'Owed to you' : 'All collected'}
          </div>
        </div>
        <div className="fin-stat">
          <div className="fin-stat-label">Cleaner Owed</div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(summary.pendingCleanerPayments ?? 0)}</div>
          <div className="fin-stat-sub">Pending payouts</div>
        </div>
        <div className="fin-stat">
          <div className="fin-stat-label">YTD Revenue</div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(yearRev)}</div>
          <div className="fin-stat-sub">From completed jobs</div>
        </div>
      </div>

      {tab !== 'overview' && (
        <div className="fin-coming-soon">
          <div className="fin-coming-soon-title">Coming soon.</div>
          <div>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      {tab === 'overview' && (
        <>
          {/* HERO CHART (visual mock — TODO: wire trailing 12 months from /api/finance/revenue) */}
          <div className="fin-chart-section">
            <div className="fin-chart-head">
              <div className="fin-chart-title-block">
                <span className="fin-chart-title">Revenue · Trailing 12 Months</span>
                <span className="fin-chart-big-num">${fmt(yearRev)}</span>
                <div className="fin-chart-meta-row">
                  <span><strong>${fmt(monthRev)}</strong> this month</span>
                  <span className="good">↗ live</span>
                  <span><strong>{marginPct}%</strong> net margin</span>
                </div>
              </div>
              <div className="fin-chart-mode">
                <button className="fin-chart-mode-btn active" type="button">Revenue</button>
                <button className="fin-chart-mode-btn" type="button">Rev + Margin</button>
                <button className="fin-chart-mode-btn" type="button">Jobs</button>
                <button className="fin-chart-mode-btn" type="button">MRR</button>
              </div>
            </div>
            <div className="fin-chart-canvas">
              <svg className="fin-chart-svg" viewBox="0 0 1200 240" preserveAspectRatio="none">
                <line x1="0" y1="60" x2="1200" y2="60" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                <line x1="0" y1="120" x2="1200" y2="120" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                <line x1="0" y1="180" x2="1200" y2="180" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                {[
                  { x: 50, h: 14, op: 0.2 },
                  { x: 138, h: 18, op: 0.2 },
                  { x: 226, h: 22, op: 0.25 },
                  { x: 314, h: 28, op: 0.3 },
                  { x: 402, h: 35, op: 0.35 },
                  { x: 490, h: 50, op: 0.4 },
                  { x: 578, h: 70, op: 0.5 },
                  { x: 666, h: 85, op: 0.6 },
                  { x: 754, h: 105, op: 0.7 },
                  { x: 842, h: 120, op: 0.8 },
                  { x: 930, h: 140, op: 0.9 },
                  { x: 1018, h: 152, op: 1, current: true },
                ].map((b, i) => (
                  <rect
                    key={i}
                    x={b.x}
                    y={230 - b.h}
                    width="64"
                    height={b.h}
                    fill={b.current ? '#1C1C1C' : '#3A3A3A'}
                    opacity={b.op}
                    rx="2"
                  />
                ))}
              </svg>
            </div>
            <div className="fin-chart-x-labels">
              {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'].map((m, i) => (
                <span key={m} className={`fin-chart-x-label ${i === 11 ? 'current' : ''}`}>{m}{i === 11 ? ' ●' : ''}</span>
              ))}
            </div>
          </div>

          {/* PANEL GRID */}
          <div className="fin-panel-grid">
            <div className="fin-panel">
              <div className="fin-panel-head">
                <span className="fin-panel-label">Recurring Revenue (MRR)</span>
                <span className="fin-panel-cta">Drill →</span>
              </div>
              <div className="fin-mrr-big"><span className="unit">$</span>{fmt(mrrCents)}</div>
              <div className="fin-mrr-meta">From <strong>{recurringCount}</strong> recurring clients</div>
              <div className="fin-mrr-bar">
                <div className="fin-mrr-segment weekly" style={{ width: '62%' }} />
                <div className="fin-mrr-segment biweekly" style={{ width: '28%' }} />
                <div className="fin-mrr-segment monthly" style={{ width: '10%' }} />
              </div>
              <div>
                <div className="fin-mrr-leg-row">
                  <span className="fin-mrr-leg-dot" style={{ background: 'var(--fin-good)' }} />
                  <span className="fin-mrr-leg-name">Weekly</span>
                  <span className="fin-mrr-leg-num">{Math.round(recurringCount * 0.62)} clients</span>
                </div>
                <div className="fin-mrr-leg-row">
                  <span className="fin-mrr-leg-dot" style={{ background: 'var(--fin-vip)' }} />
                  <span className="fin-mrr-leg-name">Biweekly</span>
                  <span className="fin-mrr-leg-num">{Math.round(recurringCount * 0.28)} clients</span>
                </div>
                <div className="fin-mrr-leg-row">
                  <span className="fin-mrr-leg-dot" style={{ background: 'var(--fin-warn)' }} />
                  <span className="fin-mrr-leg-name">Monthly</span>
                  <span className="fin-mrr-leg-num">{Math.max(0, recurringCount - Math.round(recurringCount * 0.62) - Math.round(recurringCount * 0.28))} clients</span>
                </div>
              </div>
              <div className="fin-mrr-arr">
                <span className="fin-mrr-arr-label">ARR (run rate)</span>
                <span className="fin-mrr-arr-value">${fmt(mrrCents * 12)}</span>
              </div>
            </div>

            <div className="fin-panel">
              <div className="fin-panel-head">
                <span className="fin-panel-label">Top Clients · YTD</span>
                <span className="fin-panel-cta">All →</span>
              </div>
              {loading && <div className="fin-empty">Loading…</div>}
              {!loading && topClients.length === 0 && <div className="fin-empty">No completed jobs this year.</div>}
              {topClients.map((c, i) => (
                <div key={c.name + i} className="fin-client-row">
                  <span className="fin-client-rank">{String(i + 1).padStart(2, '0')}</span>
                  <div className="fin-client-info">
                    <div className="fin-client-name">
                      {c.name}
                      {c.vip && <span className="fin-client-vip">VIP</span>}
                    </div>
                    <div className="fin-client-meta">{c.meta}</div>
                  </div>
                  <div>
                    <div className="fin-client-amount">${fmt(c.amount_cents)}</div>
                    <div className="fin-client-pct">
                      {totalRevenueSum > 0 ? `${Math.round((c.amount_cents / totalRevenueSum) * 100)}%` : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fin-panel">
              <div className="fin-panel-head">
                <span className="fin-panel-label">Outstanding · Aging</span>
                <span className="fin-panel-cta">Collect →</span>
              </div>
              <div className="fin-aging-row">
                <span className="fin-aging-label">0–30d</span>
                <div className="fin-aging-bar">
                  {outstanding > 0 ? (
                    <div className="fin-aging-fill green" style={{ width: '100%' }}>${fmt(outstanding)}</div>
                  ) : (
                    <div className="fin-aging-fill empty" />
                  )}
                </div>
                <span className={`fin-aging-amount ${outstanding === 0 ? 'zero' : ''}`}>${fmt(outstanding)}</span>
              </div>
              <div className="fin-aging-row">
                <span className="fin-aging-label">31–60d</span>
                <div className="fin-aging-bar"><div className="fin-aging-fill empty" /></div>
                <span className="fin-aging-amount zero">$0</span>
              </div>
              <div className="fin-aging-row">
                <span className="fin-aging-label">61–90d</span>
                <div className="fin-aging-bar"><div className="fin-aging-fill empty" /></div>
                <span className="fin-aging-amount zero">$0</span>
              </div>
              <div className="fin-aging-row">
                <span className="fin-aging-label">90d+</span>
                <div className="fin-aging-bar"><div className="fin-aging-fill empty" /></div>
                <span className="fin-aging-amount zero">$0</span>
              </div>
              <div className="fin-aging-foot">
                <span className="fin-aging-foot-label">Total</span>
                <span className="fin-aging-foot-value">${fmt(outstanding)}</span>
              </div>
              {outstanding > 0 && (
                <div className="fin-aging-action">Send batch reminder via Selena →</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
