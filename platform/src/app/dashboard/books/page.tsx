'use client'

import { useEffect, useMemo, useState } from 'react'
import './books.css'

type Tab = 'overview' | 'ledger' | 'payroll' | 'expenses' | 'reconcile' | 'tax' | 'statements' | 'qb' | 'cleaners'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'overview', letter: 'A', label: 'Overview' },
  { key: 'ledger', letter: 'B', label: 'Ledger' },
  { key: 'payroll', letter: 'C', label: 'Payroll' },
  { key: 'expenses', letter: 'D', label: 'Expenses' },
  { key: 'reconcile', letter: 'E', label: 'Reconcile' },
  { key: 'tax', letter: 'F', label: 'Tax' },
  { key: 'statements', letter: 'G', label: 'Statements' },
  { key: 'qb', letter: 'H', label: 'QuickBooks' },
  { key: 'cleaners', letter: 'I', label: 'Cleaners' },
]

type LedgerRow = {
  id: string
  date: string
  type: 'revenue' | 'expense' | 'payroll'
  desc: string
  desc_sub: string
  account: string | null
  account_tag: string
  source: string
  status: 'review' | 'ready' | 'synced'
  amount_cents: number
}

type Booking = {
  id: string
  start_time: string
  service_type: string | null
  price: number | null
  team_member_pay: number | null
  team_member_paid: boolean | null
  payment_status: string | null
  status: string
  clients: { name: string | null } | null
  team_members: { name: string | null } | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtMoney(cents: number): string {
  const abs = Math.abs(cents)
  return '$' + (abs / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function BooksPage() {
  const [tab, setTab] = useState<Tab>('ledger')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'review' | 'ready' | 'synced'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'payroll' | 'expense'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/bookings?limit=100')
      .then((r) => r.json())
      .then((d) => {
        const bookings = (d?.bookings || []) as Booking[]
        const built: LedgerRow[] = []
        for (const b of bookings) {
          const price = Number(b.price || 0)
          const pay = Number(b.team_member_pay || 0)
          if (price > 0) {
            built.push({
              id: `rev-${b.id}`,
              date: b.start_time,
              type: 'revenue',
              desc: `${b.clients?.name || 'Unknown'} · ${b.service_type || 'Service'}`,
              desc_sub: '',
              account: '4000 · Service Revenue',
              account_tag: b.service_type || 'service',
              source: 'Booking',
              status: b.payment_status === 'paid' ? 'synced' : 'ready',
              amount_cents: price,
            })
          }
          if (pay > 0 && b.team_members?.name) {
            built.push({
              id: `pay-${b.id}`,
              date: b.start_time,
              type: 'payroll',
              desc: `${b.team_members.name} · ${b.clients?.name || 'job'}`,
              desc_sub: '',
              account: '5000 · Contractor Pay',
              account_tag: `1099 · ${b.team_members.name}`,
              source: 'Auto',
              status: b.team_member_paid ? 'synced' : 'ready',
              amount_cents: pay,
            })
          }
        }
        built.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRows(built)
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const all = rows.length
    const review = rows.filter((r) => r.status === 'review').length
    const ready = rows.filter((r) => r.status === 'ready').length
    const synced = rows.filter((r) => r.status === 'synced').length
    const revenue = rows.filter((r) => r.type === 'revenue').length
    const payroll = rows.filter((r) => r.type === 'payroll').length
    const expense = rows.filter((r) => r.type === 'expense').length
    return { all, review, ready, synced, revenue, payroll, expense }
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${r.desc} ${r.account || ''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [rows, statusFilter, typeFilter, search])

  const totalRevenue = rows.filter((r) => r.type === 'revenue').reduce((s, r) => s + r.amount_cents, 0)
  const totalPayroll = rows.filter((r) => r.type === 'payroll').reduce((s, r) => s + r.amount_cents, 0)
  const totalExpenses = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount_cents, 0)
  const net = totalRevenue - totalPayroll - totalExpenses

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((r) => r.id)))
  }

  return (
    <div className="books-scope">
      <div className="books-qb-bar">
        <span className="books-qb-bar-status">QuickBooks · Not Connected</span>
        <span className="books-qb-bar-divider" />
        <span className="books-qb-bar-meta">Connect to enable auto-sync</span>
        <div className="books-qb-bar-actions">
          <button className="books-btn books-btn-ghost" type="button">Connect QuickBooks</button>
        </div>
      </div>

      <div className="books-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`books-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
            <span className="books-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'ledger' && counts.review > 0 && <span className="books-tab-count warn">{counts.review}</span>}
          </button>
        ))}
      </div>

      <div className="books-bar-label">Sync Status</div>
      <div className="books-outlook">
        <div className="books-stat">
          <div className="books-stat-label">Need Review {counts.review > 0 && <span className="books-stat-tag warn">action</span>}</div>
          <div className="books-stat-value">{counts.review}</div>
          <div className={`books-stat-sub ${counts.review > 0 ? 'warn' : ''}`}>
            {counts.review > 0 ? 'Unmapped or flagged' : 'All mapped'}
          </div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Ready to Sync</div>
          <div className="books-stat-value">{counts.ready}</div>
          <div className="books-stat-sub">All categorized</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Synced <span className="books-stat-tag qb">QB</span></div>
          <div className="books-stat-value">{counts.synced}</div>
          <div className="books-stat-sub good">Pushed to QuickBooks</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Total Volume</div>
          <div className="books-stat-value"><span className="unit">$</span>{(Math.round((totalRevenue + totalPayroll + totalExpenses) / 100)).toLocaleString('en-US')}</div>
          <div className="books-stat-sub">Revenue + payroll + expenses</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Net</div>
          <div className="books-stat-value"><span className="unit">$</span>{(Math.round(net / 100)).toLocaleString('en-US')}</div>
          <div className="books-stat-sub good">After payroll + expenses</div>
        </div>
      </div>

      {tab !== 'ledger' && (
        <div className="books-coming-soon">
          <div className="books-coming-soon-title">Coming soon.</div>
          <div>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      {tab === 'ledger' && (
        <>
          <div className="books-toolbar">
            <div className="books-search">
              <span className="books-search-icon">⌕</span>
              <input
                type="text"
                placeholder="Search description, account, amount, client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="books-toolbar-right">
              <button className="books-btn books-btn-ghost" type="button">Filters</button>
              <button className="books-btn books-btn-ghost" type="button">+ Manual Entry</button>
            </div>
          </div>

          <div className="books-filter-chips">
            <span className={`books-chip ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
              All <span className="books-chip-count">{counts.all}</span>
            </span>
            <span className={`books-chip ${statusFilter === 'review' ? 'active' : ''}`} onClick={() => setStatusFilter('review')}>
              <span className="books-chip-dot warn" />Need Review <span className="books-chip-count">{counts.review}</span>
            </span>
            <span className={`books-chip ${statusFilter === 'ready' ? 'active' : ''}`} onClick={() => setStatusFilter('ready')}>
              <span className="books-chip-dot muted" />Ready <span className="books-chip-count">{counts.ready}</span>
            </span>
            <span className={`books-chip ${statusFilter === 'synced' ? 'active' : ''}`} onClick={() => setStatusFilter('synced')}>
              <span className="books-chip-dot qb" />Synced <span className="books-chip-count">{counts.synced}</span>
            </span>
            <span className={`books-chip ${typeFilter === 'revenue' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'revenue' ? 'all' : 'revenue')}>
              Revenue <span className="books-chip-count">{counts.revenue}</span>
            </span>
            <span className={`books-chip ${typeFilter === 'payroll' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'payroll' ? 'all' : 'payroll')}>
              Payroll <span className="books-chip-count">{counts.payroll}</span>
            </span>
            <span className={`books-chip ${typeFilter === 'expense' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')}>
              Expenses <span className="books-chip-count">{counts.expense}</span>
            </span>
          </div>

          {selected.size > 0 && (
            <div className="books-bulk-bar">
              <span className="books-bulk-count">{selected.size} selected</span>
              <span className="books-bulk-divider" />
              <button className="books-bulk-action" type="button">Categorize</button>
              <button className="books-bulk-action" type="button">Mark Reviewed</button>
              <button className="books-bulk-action" type="button">Export</button>
              <span style={{ marginLeft: 'auto', opacity: 0.6, fontFamily: 'var(--books-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {(() => {
                  const total = rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount_cents, 0)
                  return `${fmtMoney(total)} total`
                })()}
              </span>
              <button className="books-bulk-action primary" type="button">Sync to QB →</button>
            </div>
          )}

          <div className="books-table">
            <div className="books-thead">
              <div>
                <span
                  className={`books-check ${selected.size > 0 && selected.size === filtered.length ? 'checked' : ''}`}
                  onClick={toggleAll}
                />
              </div>
              <div>Date</div>
              <div>Type</div>
              <div>Description</div>
              <div>QB Account</div>
              <div>Source</div>
              <div>Status</div>
              <div />
              <div className="right">Amount</div>
            </div>

            {loading && <div className="books-empty">Loading…</div>}
            {!loading && filtered.length === 0 && <div className="books-empty">No transactions match.</div>}

            {filtered.map((r) => (
              <div key={r.id} className={`books-row ${r.status === 'review' ? 'unmapped' : ''} ${r.status === 'synced' ? 'synced' : ''}`}>
                <div onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`books-check ${selected.has(r.id) ? 'checked' : ''}`}
                    onClick={() => toggleOne(r.id)}
                  />
                </div>
                <div className="books-row-date">{fmtDate(r.date)}</div>
                <div><span className={`books-type ${r.type}`}>{r.type}</span></div>
                <div style={{ minWidth: 0 }}>
                  <div className="books-row-desc">{r.desc}</div>
                  {r.desc_sub && <div className="books-row-desc-sub">{r.desc_sub}</div>}
                </div>
                <div className="books-account-cell">
                  <div className={`books-account-name ${r.account ? '' : 'unmapped'}`}>{r.account || 'Needs category'}</div>
                  <div className="books-account-tag">{r.account_tag}</div>
                </div>
                <div><span className="books-source">{r.source}</span></div>
                <div><span className={`books-status ${r.status}`}>{r.status}</span></div>
                <div />
                <div className={`books-row-amount ${r.type === 'revenue' ? 'revenue' : 'expense'}`}>{fmtMoney(r.amount_cents)}</div>
              </div>
            ))}
          </div>

          <div className="books-footer">
            <div className="books-footer-cell">
              <div className="books-footer-label">Revenue</div>
              <div className="books-footer-value good">{fmtMoney(totalRevenue)}</div>
            </div>
            <div className="books-footer-cell">
              <div className="books-footer-label">Payroll</div>
              <div className="books-footer-value">−{fmtMoney(totalPayroll)}</div>
            </div>
            <div className="books-footer-cell">
              <div className="books-footer-label">Expenses</div>
              <div className="books-footer-value warn">−{fmtMoney(totalExpenses)}</div>
            </div>
            <div className="books-footer-cell">
              <div className="books-footer-label">Net</div>
              <div className={`books-footer-value ${net >= 0 ? 'good' : 'warn'}`}>{fmtMoney(net)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
