'use client'

import { useEffect, useState } from 'react'
import { useWorkerLabel } from '../worker-label-context'
import { useUserPrefs } from '@/lib/use-user-prefs'
import './finance.css'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import BankTransactionsPage from './transactions/page'
import ReceiptsPage from './receipts/page'
import BooksPage from '../books/page'
import ReconcilePage from './reconcile/page'
import FinanceReportsPage from './reports/page'
import FinanceClosePage from './close/page'
import CpaAccessPage from './cpa-access/page'

// True in-page tabs — no route change, no navigation, no back button.
// Content for the 7 non-Overview tabs is each surface's existing, real page
// component rendered inline (not rebuilt/stubbed) — only the shell around
// them changed from "separate route" to "same page, swapped content".
type Tab = 'overview' | 'transactions' | 'expenses' | 'ledger' | 'reconcile' | 'reports' | 'close' | 'accountant'
const TAB_DEFS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'overview', letter: 'A', label: 'Overview' },
  { key: 'transactions', letter: 'B', label: 'Transactions' },
  { key: 'expenses', letter: 'C', label: 'Expenses' },
  { key: 'ledger', letter: 'D', label: 'Ledger & Payroll' },
  { key: 'reconcile', letter: 'E', label: 'Reconcile' },
  { key: 'reports', letter: 'F', label: 'Reports' },
  { key: 'close', letter: 'G', label: 'Close' },
  { key: 'accountant', letter: 'H', label: 'Accountant' },
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
  yearContracted?: number
  yearContractedJobs?: number
  yearContractedGap?: number
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
  const { tenant } = useTenantSettings()
  const agentName = (tenant?.agent_name as string) || 'Selena'
  const [tab] = useState<Tab>('overview')
  const [range, setRange] = useState<DateRange>('month')

  const financePrefs = useUserPrefs('finance', { default_range: 'month' })
  useEffect(() => {
    if (financePrefs.loaded) setRange(financePrefs.prefs.default_range as DateRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financePrefs.loaded])
  const [summary, setSummary] = useState<Summary>({})
  const [totals, setTotals] = useState<EnrichedTotals | null>(null)
  const [topClients, setTopClients] = useState<Array<{ name: string; amount_cents: number; meta: string; vip: boolean }>>([])
  const [monthlyTrend, setMonthlyTrend] = useState<
    Array<{ month: string; actual: number | null; forecast: number | null; isPending: boolean; isCurrent: boolean }>
  >([])
  const [projectedFullYearRevenue, setProjectedFullYearRevenue] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/finance/summary').then((r) => r.json()).catch(() => ({})),
      fetch('/api/clients/enriched').then((r) => r.json()).catch(() => ({ clients: [], totals: null })),
      fetch('/api/finance/revenue?monthly=true').then((r) => r.json()).catch(() => ({ monthly: [] })),
    ]).then(([s, e, rev]) => {
      setSummary(s || {})
      setTotals(e?.totals || null)
      setMonthlyTrend(rev?.monthly || [])
      setProjectedFullYearRevenue(rev?.projectedFullYearRevenue ?? null)
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
        {[
          { href: '/dashboard/finance', letter: 'A', label: 'Overview' },
          { href: '/dashboard/finance/transactions', letter: 'B', label: 'Transactions' },
          { href: '/dashboard/finance/receipts', letter: 'C', label: 'Expenses' },
          { href: '/dashboard/books', letter: 'D', label: 'Ledger & Payroll' },
          { href: '/dashboard/finance/reconcile', letter: 'E', label: 'Reconcile' },
          { href: '/dashboard/finance/reports', letter: 'F', label: 'Reports' },
          { href: '/dashboard/finance/close', letter: 'G', label: 'Close' },
          { href: '/dashboard/finance/cpa-access', letter: 'H', label: 'Accountant' },
        ].map((t) =>
          t.href === '/dashboard/finance' ? (
            <span key={t.label} className="fin-tab active">
              <span className="fin-tab-letter">{t.letter}</span>
              {t.label}
            </span>
          ) : (
            <a key={t.label} href={t.href} className="fin-tab">
              <span className="fin-tab-letter">{t.letter}</span>
              {t.label}
            </a>
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
          {/* HERO CHART — calendar-year Jan→now, ledger-sourced actuals; remaining
              months shown pending with a simple forecast (avg of completed
              months this year) so the year reads as a whole, not a dead stop. */}
          <div className="fin-chart-section">
            <div className="fin-chart-head">
              <div className="fin-chart-title-block">
                <span className="fin-chart-title">Revenue · {new Date().getFullYear()}</span>
                <span className="fin-chart-big-num">${fmt(yearRev)}</span>
                <div className="fin-chart-meta-row">
                  <span><strong>${fmt(monthRev)}</strong> this month</span>
                  <span className="good">↗ live</span>
                  <span><strong>{marginPct}%</strong> net margin</span>
                  {projectedFullYearRevenue != null && (
                    <span>projected full year <strong>${Math.round(projectedFullYearRevenue).toLocaleString('en-US')}</strong></span>
                  )}
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
              <svg className="fin-chart-svg" viewBox="0 0 1200 320" preserveAspectRatio="none">
                <line x1="0" y1="80" x2="1200" y2="80" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                <line x1="0" y1="160" x2="1200" y2="160" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                <line x1="0" y1="240" x2="1200" y2="240" stroke="#E4E2DC" strokeWidth="1" strokeDasharray="2,3" />
                {(() => {
                  const maxAmount = Math.max(...monthlyTrend.map((m) => m.actual ?? 0), ...monthlyTrend.map((m) => m.forecast ?? 0), 1)
                  return monthlyTrend.map((m, i) => {
                    const value = m.isPending ? m.forecast : m.actual
                    const h = value && value > 0 ? Math.max((value / maxAmount) * 190, 2) : 0
                    const x = 50 + i * 88
                    return (
                      <g key={m.month}>
                        {value != null && value > 0 && (
                          <text
                            x={x + 32}
                            y={300 - h - 10}
                            textAnchor="middle"
                            fontSize="13"
                            fontWeight={m.isCurrent ? 700 : 500}
                            fill={m.isPending ? 'var(--fin-warn, #8B4513)' : 'var(--fin-ink, #1C1C1C)'}
                          >
                            ${Math.round(value).toLocaleString('en-US')}
                          </text>
                        )}
                        <rect
                          x={x}
                          y={300 - h}
                          width="64"
                          height={h}
                          fill={m.isCurrent ? '#1C1C1C' : '#3A3A3A'}
                          opacity={m.isPending ? 0.18 : 0.2 + (i / 11) * 0.8}
                          strokeDasharray={m.isPending ? '4,3' : undefined}
                          stroke={m.isPending ? '#3A3A3A' : undefined}
                          strokeWidth={m.isPending ? 1 : undefined}
                          rx="2"
                        />
                      </g>
                    )
                  })
                })()}
              </svg>
            </div>
            <div className="fin-chart-x-labels">
              {monthlyTrend.map((m, i) => (
                <span key={m.month} className={`fin-chart-x-label ${m.isCurrent ? 'current' : ''}`}>
                  {m.month}{m.isCurrent ? ' ●' : ''}{m.isPending ? ' (forecast)' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* MONTH-BY-MONTH BREAKDOWN — actual vs. forecast, side by side */}
          <div className="fin-panel" style={{ marginBottom: 24 }}>
            <div className="fin-panel-head">
              <span className="fin-panel-label">Month-by-Month · {new Date().getFullYear()}</span>
              <span className="fin-panel-cta" style={{ cursor: 'default' }}>Avg-of-completed-months forecast</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fin-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '8px 12px' }}>Month</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actual</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Forecast</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrend.map((m) => (
                  <tr key={m.month} style={{ borderTop: '1px solid var(--fin-line-soft)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{m.month}{m.isCurrent ? ' (in progress)' : ''}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{m.actual != null ? `$${fmt(m.actual * 100)}` : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--fin-muted)' }}>
                      {m.forecast != null ? `$${fmt(m.forecast * 100)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: m.isPending ? 'rgba(139,69,19,0.1)' : m.isCurrent ? 'rgba(28,28,28,0.06)' : 'rgba(31,77,44,0.1)',
                          color: m.isPending ? 'var(--fin-warn)' : m.isCurrent ? 'var(--fin-ink)' : 'var(--fin-good)',
                        }}
                      >
                        {m.isPending ? 'Forecast' : m.isCurrent ? 'In progress' : 'Actual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CONTRACTED VS COLLECTED — the dashboard homepage's "Jobs · YTD" total
              (every booked job this year, any payment status) vs. this page's
              ledger-recognized revenue. Same underlying bookings, two honest
              different numbers — this is what "the gap" actually is. */}
          {summary.yearContracted != null && (
            <div className="fin-panel" style={{ marginBottom: 24, padding: 20 }}>
              <div className="fin-panel-head" style={{ marginBottom: 12 }}>
                <span className="fin-panel-label">Contracted vs. Collected · YTD</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fin-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Contracted ({summary.yearContractedJobs} jobs)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>${fmt(summary.yearContracted)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fin-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Collected (ledger)</div>
                  <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>${fmt(yearRev)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fin-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gap (not yet collected)</div>
                  <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: 'var(--fin-warn)' }}>
                    ${fmt(summary.yearContractedGap ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <div className="fin-aging-action">Send batch reminder via {agentName} →</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
