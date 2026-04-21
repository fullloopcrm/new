'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import EntitySwitcher from '../entity-switcher'

type PnL = {
  period: { from: string; to: string }
  revenue_cents: number
  cost_of_service_cents: number
  gross_profit_cents: number
  expenses_total_cents: number
  net_profit_cents: number
  tax_deductible_cents: number
  bookings_count: number
  unpaid_cents: number
  expense_by_category: { category: string; amount_cents: number }[]
}

type AR = {
  rows: Array<{
    source: string
    id: string
    reference: string
    title: string | null
    client_name: string | null
    client_id: string | null
    total_cents: number
    balance_cents: number
    due_date: string | null
    days_past_due: number
    bucket: string
  }>
  buckets: { label: string; count: number; total_cents: number }[]
  total_cents: number
}

type Payroll = {
  period: { from: string; to: string }
  rows: Array<{
    team_member_id: string
    name: string
    tax_classification: string | null
    tax_ein: string | null
    tax_ssn_last4: string | null
    hours: number
    jobs: number
    gross_pay_cents: number
    paid_out_cents: number
    balance_owed_cents: number
    hits_1099_threshold: boolean
  }>
  totals: {
    total_hours: number
    total_jobs: number
    total_gross_cents: number
    total_paid_out_cents: number
    total_balance_cents: number
    contractors_above_1099_threshold: number
  }
}

type CashFlow = {
  weeks: { week_start: string; inflows_cents: number; outflows_cents: number; net_cents: number }[]
  totals: { inflows_cents: number; outflows_cents: number; net_cents: number }
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function firstOfMonth(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)
}
function lastOfMonth(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
}

const TABS = [
  { value: 'pnl', label: 'P&L' },
  { value: 'ar', label: 'AR Aging' },
  { value: 'payroll', label: 'Payroll / 1099' },
  { value: 'cashflow', label: 'Cash Flow' },
  { value: 'export', label: 'Tax Export' },
] as const

export default function FinanceReportsPage() {
  const search = useSearchParams()
  const entityParam = search.get('entity_id') || ''
  const entityQuery = entityParam ? `&entity_id=${entityParam}` : ''

  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('pnl')
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(lastOfMonth())
  const [loading, setLoading] = useState(false)

  const [pnl, setPnl] = useState<PnL | null>(null)
  const [ar, setAr] = useState<AR | null>(null)
  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null)

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance/pnl?from=${from}&to=${to}${entityQuery}`).then(r => r.json()),
      fetch(`/api/finance/ar-aging`).then(r => r.json()),
      fetch(`/api/finance/payroll-prep?from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/finance/cash-flow?weeks=4`).then(r => r.json()),
    ]).then(([p, a, pr, cf]) => {
      setPnl(p); setAr(a); setPayroll(pr); setCashFlow(cf)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [from, to, entityQuery])

  useEffect(() => { loadAll() }, [loadAll])

  function setRange(preset: 'this_month' | 'last_month' | 'ytd' | 'last_year') {
    const now = new Date()
    if (preset === 'this_month') {
      setFrom(firstOfMonth(now)); setTo(lastOfMonth(now))
    } else if (preset === 'last_month') {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
      setFrom(firstOfMonth(d)); setTo(lastOfMonth(d))
    } else if (preset === 'ytd') {
      setFrom(`${now.getUTCFullYear()}-01-01`); setTo(now.toISOString().slice(0, 10))
    } else if (preset === 'last_year') {
      setFrom(`${now.getUTCFullYear() - 1}-01-01`); setTo(`${now.getUTCFullYear() - 1}-12-31`)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">Reports</h1>
          <p className="text-sm text-slate-500">P&amp;L, AR aging, payroll, cash flow — your books at a glance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <EntitySwitcher />
          <button onClick={() => setRange('this_month')} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">This Month</button>
          <button onClick={() => setRange('last_month')} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">Last Month</button>
          <button onClick={() => setRange('ytd')} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">YTD</button>
          <button onClick={() => setRange('last_year')} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">Last Yr</button>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm" />
          <span className="text-slate-400 text-xs">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm" />
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>}

      {/* ── P&L ── */}
      {tab === 'pnl' && pnl && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Revenue" value={formatCents(pnl.revenue_cents)} sub={`${pnl.bookings_count} jobs`} />
            <StatCard label="Cost of service" value={formatCents(pnl.cost_of_service_cents)} sub="Team pay" />
            <StatCard label="Expenses" value={formatCents(pnl.expenses_total_cents)} />
            <StatCard label="Net profit" value={formatCents(pnl.net_profit_cents)} highlight={pnl.net_profit_cents >= 0 ? 'green' : 'red'} />
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Profit &amp; Loss Summary</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <Row label="Revenue" amount={pnl.revenue_cents} />
                <Row label="Cost of service (team pay)" amount={-pnl.cost_of_service_cents} />
                <Row label="Gross profit" amount={pnl.gross_profit_cents} bold />
                <Row label="Operating expenses" amount={-pnl.expenses_total_cents} />
                <Row label="Net profit" amount={pnl.net_profit_cents} bold highlight={pnl.net_profit_cents >= 0 ? 'green' : 'red'} />
              </tbody>
            </table>
            {pnl.unpaid_cents > 0 && (
              <p className="mt-3 text-xs text-amber-700">⚠ {formatCents(pnl.unpaid_cents)} completed but unpaid — not counted in revenue above. See AR Aging.</p>
            )}
          </section>

          {pnl.expense_by_category.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Expenses by Category</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {pnl.expense_by_category.map(e => (
                    <tr key={e.category}>
                      <td className="py-2 text-slate-700 capitalize">{e.category.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-right font-medium">{formatCents(e.amount_cents)}</td>
                      <td className="py-2 text-right text-xs text-slate-400 w-12">
                        {pnl.expenses_total_cents ? `${Math.round((e.amount_cents / pnl.expenses_total_cents) * 100)}%` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">Tax-deductible: {formatCents(pnl.tax_deductible_cents)}</p>
            </section>
          )}
        </div>
      )}

      {/* ── AR Aging ── */}
      {tab === 'ar' && ar && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ar.buckets.map(b => (
              <StatCard
                key={b.label}
                label={b.label}
                value={formatCents(b.total_cents)}
                sub={`${b.count} item${b.count === 1 ? '' : 's'}`}
                highlight={b.label === '90+' && b.total_cents > 0 ? 'red' : undefined}
              />
            ))}
          </div>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-slate-900 text-sm">Open Receivables · {formatCents(ar.total_cents)}</h3>
            </div>
            {ar.rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">🎉 Nothing outstanding.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-2 font-medium">Reference</th>
                    <th className="px-5 py-2 font-medium">Client</th>
                    <th className="px-5 py-2 font-medium">Due</th>
                    <th className="px-5 py-2 font-medium">Bucket</th>
                    <th className="px-5 py-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ar.rows.map(r => (
                    <tr key={`${r.source}-${r.id}`} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          href={r.source === 'invoice' ? `/dashboard/sales/invoices/${r.id}` : `/dashboard/bookings?highlight=${r.id}`}
                          className="text-teal-600 font-medium hover:underline"
                        >
                          {r.reference}
                        </Link>
                        {r.title && <p className="text-xs text-slate-500">{r.title}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {r.client_id ? (
                          <Link href={`/dashboard/clients/${r.client_id}`} className="text-slate-900 hover:underline">{r.client_name || '—'}</Link>
                        ) : (
                          <span className="text-slate-900">{r.client_name || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          r.bucket === '90+' ? 'bg-red-50 text-red-700' :
                          r.bucket === '61-90' ? 'bg-amber-50 text-amber-700' :
                          r.bucket === '31-60' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {r.bucket}{r.days_past_due > 0 ? ` · ${r.days_past_due}d` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCents(r.balance_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* ── Payroll / 1099 ── */}
      {tab === 'payroll' && payroll && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total hours" value={payroll.totals.total_hours.toFixed(1)} />
            <StatCard label="Jobs" value={String(payroll.totals.total_jobs)} />
            <StatCard label="Gross pay" value={formatCents(payroll.totals.total_gross_cents)} />
            <StatCard label="Balance owed" value={formatCents(payroll.totals.total_balance_cents)} highlight={payroll.totals.total_balance_cents > 0 ? 'amber' : undefined} />
          </div>
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <h3 className="font-heading font-semibold text-slate-900 text-sm">
                Payroll Prep · {payroll.rows.length} team member{payroll.rows.length === 1 ? '' : 's'}
                {payroll.totals.contractors_above_1099_threshold > 0 && (
                  <span className="ml-2 text-xs text-amber-700">· {payroll.totals.contractors_above_1099_threshold} hit 1099 threshold ($600+)</span>
                )}
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">Team Member</th>
                  <th className="px-5 py-2 font-medium text-right">Jobs</th>
                  <th className="px-5 py-2 font-medium text-right">Hours</th>
                  <th className="px-5 py-2 font-medium text-right">Gross</th>
                  <th className="px-5 py-2 font-medium text-right">Paid out</th>
                  <th className="px-5 py-2 font-medium text-right">Balance</th>
                  <th className="px-5 py-2 font-medium">1099?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payroll.rows.map(r => (
                  <tr key={r.team_member_id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/team/${r.team_member_id}`} className="text-slate-900 font-medium hover:underline">{r.name}</Link>
                      {!r.tax_classification && <span className="ml-2 text-[10px] text-amber-600">⚠ no tax info</span>}
                    </td>
                    <td className="px-5 py-3 text-right">{r.jobs}</td>
                    <td className="px-5 py-3 text-right">{r.hours.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">{formatCents(r.gross_pay_cents)}</td>
                    <td className="px-5 py-3 text-right text-green-700">{formatCents(r.paid_out_cents)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${r.balance_owed_cents > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {formatCents(r.balance_owed_cents)}
                    </td>
                    <td className="px-5 py-3">
                      {r.hits_1099_threshold ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700">File</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── Cash Flow ── */}
      {tab === 'cashflow' && cashFlow && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Inflows (4w)" value={formatCents(cashFlow.totals.inflows_cents)} highlight="green" />
            <StatCard label="Outflows (4w)" value={formatCents(cashFlow.totals.outflows_cents)} highlight="red" />
            <StatCard label="Net (4w)" value={formatCents(cashFlow.totals.net_cents)} highlight={cashFlow.totals.net_cents >= 0 ? 'green' : 'red'} />
          </div>
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">Week of</th>
                  <th className="px-5 py-2 font-medium text-right">Inflows</th>
                  <th className="px-5 py-2 font-medium text-right">Outflows</th>
                  <th className="px-5 py-2 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashFlow.weeks.map(w => (
                  <tr key={w.week_start} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">{new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-5 py-3 text-right text-green-700">{formatCents(w.inflows_cents)}</td>
                    <td className="px-5 py-3 text-right text-red-700">−{formatCents(w.outflows_cents)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${w.net_cents >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{formatCents(w.net_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="text-xs text-slate-500">
            Inflows: upcoming bookings + open invoices. Outflows: recurring expenses you&apos;ve configured. One-time expenses not included.
            <Link href="/dashboard/finance/recurring" className="ml-1 text-teal-600 hover:underline">Manage recurring expenses →</Link>
          </p>
        </div>
      )}

      {/* ── Tax Export ── */}
      {tab === 'export' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-heading font-semibold text-slate-900 mb-3">Tax Export (CSV)</h3>
          <p className="text-sm text-slate-600 mb-4">
            Download a clean CSV for your accountant: revenue (paid bookings), expenses (by category, with tax_deductible flag), and contractor payouts (with tax IDs where configured).
          </p>
          <div className="flex items-center gap-3">
            {[new Date().getUTCFullYear(), new Date().getUTCFullYear() - 1, new Date().getUTCFullYear() - 2].map(y => (
              <a
                key={y}
                href={`/api/finance/tax-export?year=${y}`}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700"
              >
                Download {y}.csv
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'green' | 'red' | 'amber' }) {
  const color =
    highlight === 'green' ? 'text-green-700 border-green-200' :
    highlight === 'red' ? 'text-red-700 border-red-200' :
    highlight === 'amber' ? 'text-amber-700 border-amber-200' :
    'text-slate-900 border-slate-200'
  return (
    <div className={`bg-white border rounded-lg p-3 ${color}`}>
      <p className="text-xs text-slate-500 uppercase">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function Row({ label, amount, bold, highlight }: { label: string; amount: number; bold?: boolean; highlight?: 'green' | 'red' }) {
  const color = highlight === 'green' ? 'text-green-700' : highlight === 'red' ? 'text-red-700' : 'text-slate-900'
  return (
    <tr className={bold ? 'font-bold' : ''}>
      <td className="py-2 text-slate-700">{label}</td>
      <td className={`py-2 text-right ${color}`}>{formatCents(amount)}</td>
    </tr>
  )
}
