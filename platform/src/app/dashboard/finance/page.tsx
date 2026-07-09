'use client'

import { useEffect, useState } from 'react'
import { useWorkerLabel } from '../worker-label-context'
import Link from 'next/link'
import './finance.css'

type Tab = 'overview'
// The finance PROCESS, left→right — one connected hub. Overview lives on this
// page; each other step links to the surface that owns it. No outside stacks.
const PROCESS: Array<{ letter: string; label: string; href: string }> = [
  { letter: 'A', label: 'Overview', href: '/dashboard/finance' },
  { letter: 'B', label: 'Transactions', href: '/dashboard/finance/transactions' },
  { letter: 'C', label: 'Expenses', href: '/dashboard/finance/receipts' },
  { letter: 'D', label: 'Ledger & Payroll', href: '/dashboard/books' },
  { letter: 'E', label: 'Reconcile', href: '/dashboard/finance/reconcile' },
  { letter: 'F', label: 'Reports', href: '/dashboard/finance/reports' },
  { letter: 'G', label: 'Close', href: '/dashboard/finance/close' },
  { letter: 'H', label: 'Accountant', href: '/dashboard/finance/cpa-access' },
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
  const worker = useWorkerLabel()
  const [tab] = useState<Tab>('overview')
  const [range, setRange] = useState<DateRange>('month')
  const [summary, setSummary] = useState<Summary>({})
  const [totals, setTotals] = useState<EnrichedTotals | null>(null)
  const [topClients, setTopClients] = useState<Array<{ name: string; amount_cents: number; meta: string; vip: boolean }>>([])
  const [monthly, setMonthly] = useState<Array<{ month: string; amount: number }>>([])
  const [aging, setAging] = useState<Array<{ label: string; count: number; total_cents: number }>>([])
  const [freq, setFreq] = useState<{ weekly: number; biweekly: number; monthly: number; other: number }>({ weekly: 0, biweekly: 0, monthly: 0, other: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/finance/summary').then((r) => r.json()).catch(() => ({})),
      fetch('/api/clients/enriched').then((r) => r.json()).catch(() => ({ clients: [], totals: null })),
      fetch('/api/finance/revenue?monthly=true').then((r) => r.json()).catch(() => ({ monthly: [] })),
      fetch('/api/finance/ar-aging').then((r) => r.json()).catch(() => ({ buckets: [] })),
    ]).then(([s, e, rev, ar]) => {
      setSummary(s || {})
      setTotals(e?.totals || null)
      setMonthly((rev?.monthly || []) as Array<{ month: string; amount: number }>)
      setAging((ar?.buckets || []) as Array<{ label: string; count: number; total_cents: number }>)
      const cs = (e?.clients || []) as Array<{
        name: string
        ltv_actual_cents: number
        bookings_count: number
        recurring: { frequency: string } | null
        stage: string
      }>
      // Real recurring mix by cadence (was fabricated 62/28/10 before).
      const f = { weekly: 0, biweekly: 0, monthly: 0, other: 0 }
      for (const c of cs) {
        if (!c.recurring?.frequency) continue
        const fr = c.recurring.frequency.toLowerCase()
        if (fr.includes('bi') || fr.includes('2')) f.biweekly++
        else if (fr.includes('week')) f.weekly++
        else if (fr.includes('month')) f.monthly++
        else f.other++
      }
      setFreq(f)
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
  const chartMax = Math.max(1, ...monthly.map((m) => m.amount))
  const chartHasData = monthly.some((m) => m.amount > 0)
  const recurringTotal = freq.weekly + freq.biweekly + freq.monthly + freq.other
  const agingTotalCents = aging.reduce((s, b) => s + (b.total_cents || 0), 0)
  const bucketCents = (label: string) => aging.find((b) => b.label === label)?.total_cents ?? 0
  const bucketMax = Math.max(1, ...aging.map((b) => b.total_cents || 0))

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
        {PROCESS.map((t) =>
          t.href === '/dashboard/finance' ? (
            <span key={t.label} className="fin-tab active">
              <span className="fin-tab-letter">{t.letter}</span>
              {t.label}
            </span>
          ) : (
            <Link key={t.label} href={t.href} className="fin-tab">
              <span className="fin-tab-letter">{t.letter}</span>
              {t.label}
            </Link>
          ),
        )}
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
          <div className="fin-stat-label">{worker.singular} Owed</div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(summary.pendingCleanerPayments ?? 0)}</div>
          <div className="fin-stat-sub">Pending payouts</div>
        </div>
        <div className="fin-stat">
          <div className="fin-stat-label">YTD Revenue</div>
          <div className="fin-stat-value"><span className="unit">$</span>{fmt(yearRev)}</div>
          <div className="fin-stat-sub">From completed jobs</div>
        </div>
      </div>

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
              {chartHasData ? (
                <svg className="fin-chart-svg" viewBox="0 0 1200 240" preserveAspectRatio="none">
                  <line x1="0" y1="60" x2="1200" y2="60" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                  <line x1="0" y1="120" x2="1200" y2="120" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                  <line x1="0" y1="180" x2="1200" y2="180" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                  {monthly.map((m, i) => {
                    const slot = 1200 / (monthly.length || 12)
                    const h = Math.max(2, Math.round((m.amount / chartMax) * 200))
                    const isCurrent = i === monthly.length - 1
                    return (
                      <rect
                        key={m.month}
                        x={i * slot + slot * 0.2}
                        y={230 - h}
                        width={slot * 0.6}
                        height={h}
                        fill={isCurrent ? '#1C1C1C' : '#3A3A3A'}
                        opacity={isCurrent ? 1 : 0.35 + (i / (monthly.length || 12)) * 0.5}
                        rx="2"
                      >
                        <title>{`${m.month}: $${Math.round(m.amount).toLocaleString('en-US')}`}</title>
                      </rect>
                    )
                  })}
                </svg>
              ) : (
                <div className="fin-chart-empty">No revenue in the last 12 months yet.</div>
              )}
            </div>
            <div className="fin-chart-x-labels">
              {monthly.map((m, i) => (
                <span key={m.month} className={`fin-chart-x-label ${i === monthly.length - 1 ? 'current' : ''}`}>
                  {m.month.split(' ')[0]}{i === monthly.length - 1 ? ' ●' : ''}
                </span>
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
                <div className="fin-mrr-segment weekly" style={{ width: `${recurringTotal ? (freq.weekly / recurringTotal) * 100 : 0}%` }} />
                <div className="fin-mrr-segment biweekly" style={{ width: `${recurringTotal ? (freq.biweekly / recurringTotal) * 100 : 0}%` }} />
                <div className="fin-mrr-segment monthly" style={{ width: `${recurringTotal ? ((freq.monthly + freq.other) / recurringTotal) * 100 : 0}%` }} />
              </div>
              <div>
                <div className="fin-mrr-leg-row">
                  <span className="fin-mrr-leg-dot" style={{ background: 'var(--fin-good)' }} />
                  <span className="fin-mrr-leg-name">Weekly</span>
                  <span className="fin-mrr-leg-num">{freq.weekly} {freq.weekly === 1 ? 'client' : 'clients'}</span>
                </div>
                <div className="fin-mrr-leg-row">
                  <span className="fin-mrr-leg-dot" style={{ background: 'var(--fin-vip)' }} />
                  <span className="fin-mrr-leg-name">Biweekly</span>
                  <span className="fin-mrr-leg-num">{freq.biweekly} {freq.biweekly === 1 ? 'client' : 'clients'}</span>
                </div>
                <div className="fin-mrr-leg-row">
                  <span className="fin-mrr-leg-dot" style={{ background: 'var(--fin-warn)' }} />
                  <span className="fin-mrr-leg-name">Monthly{freq.other > 0 ? ' + other' : ''}</span>
                  <span className="fin-mrr-leg-num">{freq.monthly + freq.other} {freq.monthly + freq.other === 1 ? 'client' : 'clients'}</span>
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
              {[
                { key: 'Current', label: '0–30d' },
                { key: '31-60', label: '31–60d' },
                { key: '61-90', label: '61–90d' },
                { key: '90+', label: '90d+' },
              ].map((b) => {
                const cents = bucketCents(b.key)
                return (
                  <div className="fin-aging-row" key={b.key}>
                    <span className="fin-aging-label">{b.label}</span>
                    <div className="fin-aging-bar">
                      {cents > 0 ? (
                        <div className="fin-aging-fill green" style={{ width: `${Math.max(8, (cents / bucketMax) * 100)}%` }}>${fmt(cents)}</div>
                      ) : (
                        <div className="fin-aging-fill empty" />
                      )}
                    </div>
                    <span className={`fin-aging-amount ${cents === 0 ? 'zero' : ''}`}>${fmt(cents)}</span>
                  </div>
                )
              })}
              <div className="fin-aging-foot">
                <span className="fin-aging-foot-label">Total</span>
                <span className="fin-aging-foot-value">${fmt(agingTotalCents)}</span>
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
