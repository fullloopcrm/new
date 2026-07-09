'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import './books.css'

type Tab = 'overview' | 'ledger' | 'payroll' | 'expenses' | 'reconcile' | 'tax' | 'statements' | 'cleaners'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'overview', letter: 'A', label: 'Overview' },
  { key: 'ledger', letter: 'B', label: 'Ledger' },
  { key: 'payroll', letter: 'C', label: 'Payroll' },
  { key: 'expenses', letter: 'D', label: 'Expenses' },
  { key: 'reconcile', letter: 'E', label: 'Reconcile' },
  { key: 'tax', letter: 'F', label: 'Tax' },
  { key: 'statements', letter: 'G', label: 'Statements' },
  { key: 'cleaners', letter: 'H', label: 'Cleaners' },
]

type DisplayType = 'revenue' | 'payroll' | 'expense' | 'transfer'

type LedgerLine = {
  coa_id: string
  code: string
  name: string
  type: string
  subtype: string | null
  debit_cents: number
  credit_cents: number
  memo: string | null
}

type LedgerEntry = {
  id: string
  entry_date: string
  memo: string | null
  source: string | null
  source_id: string | null
  posted: boolean
  period_locked: boolean
  lines: LedgerLine[]
  display_type: DisplayType
  account_code: string | null
  account_name: string | null
  amount_cents: number
}

type Totals = {
  revenue_cents: number
  payroll_cents: number
  expense_cents: number
  net_cents: number
  entries_count: number
}

type Account = { id: string; code: string; name: string; type: string }

type Range = 'month' | 'year' | 'all'
const RANGES: Array<{ key: Range; label: string }> = [
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
]

function rangeToDates(r: Range): { from?: string; to?: string } {
  if (r === 'all') return {}
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const from = r === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    : new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  return { from, to }
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}
function fmtMoney(cents: number): string {
  const abs = Math.abs(cents)
  return '$' + (abs / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function fmtWhole(cents: number): string {
  return Math.round(cents / 100).toLocaleString('en-US')
}
function sourceLabel(source: string | null): string {
  switch (source) {
    case 'booking': return 'Booking'
    case 'booking_cogs': return 'Labor'
    case 'payment': return 'Payment'
    case 'manual': return 'Manual'
    case 'bank_txn': return 'Bank'
    case 'invoice': return 'Invoice'
    case 'expense': return 'Expense'
    default: return source ? source.replace(/_/g, ' ') : 'System'
  }
}

export default function BooksPage() {
  const [tab, setTab] = useState<Tab>('ledger')
  const [range, setRange] = useState<Range>('year')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'payroll' | 'expense' | 'transfer'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEntry, setShowEntry] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const { from, to } = rangeToDates(range)
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    fetch(`/api/finance/ledger?${qs.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Failed to load ledger')
        return r.json()
      })
      .then((d) => {
        setEntries((d.entries || []) as LedgerEntry[])
        setTotals(d.totals || null)
        setTotal(d.total || 0)
      })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load ledger'); setEntries([]) })
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    return entries.filter((r) => {
      if (typeFilter !== 'all' && r.display_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${r.memo || ''} ${r.account_code || ''} ${r.account_name || ''} ${sourceLabel(r.source)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, typeFilter, search])

  const counts = useMemo(() => ({
    all: entries.length,
    revenue: entries.filter((r) => r.display_type === 'revenue').length,
    payroll: entries.filter((r) => r.display_type === 'payroll').length,
    expense: entries.filter((r) => r.display_type === 'expense').length,
    transfer: entries.filter((r) => r.display_type === 'transfer').length,
  }), [entries])

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((r) => r.id)))
  }

  function exportCsv() {
    const rows = filtered.filter((r) => selected.size === 0 || selected.has(r.id))
    const header = ['Date', 'Type', 'Description', 'Account', 'Source', 'Amount']
    const body = rows.map((r) => [
      r.entry_date,
      r.display_type,
      (r.memo || '').replace(/"/g, '""'),
      `${r.account_code || ''} ${r.account_name || ''}`.trim().replace(/"/g, '""'),
      sourceLabel(r.source),
      (r.amount_cents / 100).toFixed(2),
    ])
    const csv = [header, ...body].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function runBackfill() {
    setBackfilling(true)
    setNotice(null)
    try {
      const res = await fetch('/api/finance/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backfill: true }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Backfill failed')
      const b = d.backfilled
      setNotice(`Posted ${b.revenue_posted} revenue + ${b.labor_posted} labor entries from ${b.bookings_scanned} bookings.`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="books-scope">
      <div className="books-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`books-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
            <span className="books-tab-letter">{t.letter}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="books-bar-label">Your Books · {RANGES.find((r) => r.key === range)?.label}</div>
        <div className="books-range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`books-range-opt ${range === r.key ? 'active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="books-outlook">
        <div className="books-stat">
          <div className="books-stat-label">Entries</div>
          <div className="books-stat-value">{totals?.entries_count ?? 0}</div>
          <div className="books-stat-sub">Posted to your ledger</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Revenue</div>
          <div className="books-stat-value"><span className="unit">$</span>{fmtWhole(totals?.revenue_cents ?? 0)}</div>
          <div className="books-stat-sub good">Income received</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Payroll</div>
          <div className="books-stat-value"><span className="unit">$</span>{fmtWhole(totals?.payroll_cents ?? 0)}</div>
          <div className="books-stat-sub">Contractor + wages</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Expenses</div>
          <div className="books-stat-value"><span className="unit">$</span>{fmtWhole(totals?.expense_cents ?? 0)}</div>
          <div className="books-stat-sub warn">Operating costs</div>
        </div>
        <div className="books-stat">
          <div className="books-stat-label">Net</div>
          <div className="books-stat-value"><span className="unit">$</span>{fmtWhole(totals?.net_cents ?? 0)}</div>
          <div className={`books-stat-sub ${(totals?.net_cents ?? 0) >= 0 ? 'good' : 'warn'}`}>After payroll + expenses</div>
        </div>
      </div>

      {notice && <div className="books-notice">{notice}</div>}
      {error && <div className="books-notice error">{error}</div>}

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
                placeholder="Search description, account, source…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="books-toolbar-right">
              <button className="books-btn books-btn-ghost" type="button" onClick={exportCsv} disabled={filtered.length === 0}>
                Export CSV
              </button>
              <button className="books-btn" type="button" onClick={() => setShowEntry(true)}>+ Manual Entry</button>
            </div>
          </div>

          <div className="books-filter-chips">
            <span className={`books-chip ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
              All <span className="books-chip-count">{counts.all}</span>
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
            {counts.transfer > 0 && (
              <span className={`books-chip ${typeFilter === 'transfer' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'transfer' ? 'all' : 'transfer')}>
                Transfers <span className="books-chip-count">{counts.transfer}</span>
              </span>
            )}
          </div>

          {selected.size > 0 && (
            <div className="books-bulk-bar">
              <span className="books-bulk-count">{selected.size} selected</span>
              <span className="books-bulk-divider" />
              <button className="books-bulk-action" type="button" onClick={exportCsv}>Export selected</button>
              <span style={{ marginLeft: 'auto', opacity: 0.6, fontFamily: 'var(--books-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {(() => {
                  const totalSel = entries.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount_cents, 0)
                  return `${fmtMoney(totalSel)} net`
                })()}
              </span>
            </div>
          )}

          <div className="books-table">
            <div className="books-thead">
              <div>
                <span
                  className={`books-check ${filtered.length > 0 && selected.size === filtered.length ? 'checked' : ''}`}
                  onClick={toggleAll}
                />
              </div>
              <div>Date</div>
              <div>Type</div>
              <div>Description</div>
              <div>Account</div>
              <div>Source</div>
              <div>Status</div>
              <div />
              <div className="right">Amount</div>
            </div>

            {loading && <div className="books-empty">Loading…</div>}
            {!loading && entries.length === 0 && (
              <div className="books-empty-state">
                <div className="books-empty-state-title">No ledger entries yet.</div>
                <div className="books-empty-state-sub">
                  Revenue and labor post automatically as jobs get paid. Post your existing paid bookings to the ledger to see history now.
                </div>
                <button className="books-btn" type="button" onClick={runBackfill} disabled={backfilling}>
                  {backfilling ? 'Posting…' : 'Post historical bookings →'}
                </button>
              </div>
            )}
            {!loading && entries.length > 0 && filtered.length === 0 && <div className="books-empty">No entries match.</div>}

            {filtered.map((r) => (
              <div key={r.id} className="books-row">
                <div onClick={(e) => e.stopPropagation()}>
                  <span className={`books-check ${selected.has(r.id) ? 'checked' : ''}`} onClick={() => toggleOne(r.id)} />
                </div>
                <div className="books-row-date">{fmtDate(r.entry_date)}</div>
                <div><span className={`books-type ${r.display_type}`}>{r.display_type}</span></div>
                <div style={{ minWidth: 0 }}>
                  <div className="books-row-desc">{r.memo || '—'}</div>
                  {r.lines.length > 2 && <div className="books-row-desc-sub">{r.lines.length} lines</div>}
                </div>
                <div className="books-account-cell">
                  <div className={`books-account-name ${r.account_code ? '' : 'unmapped'}`}>
                    {r.account_code ? `${r.account_code} · ${r.account_name}` : 'Unmapped'}
                  </div>
                </div>
                <div><span className="books-source">{sourceLabel(r.source)}</span></div>
                <div>
                  <span className={`books-status ${r.period_locked ? 'ready' : 'synced'}`}>
                    {r.period_locked ? 'locked' : 'posted'}
                  </span>
                </div>
                <div />
                <div className={`books-row-amount ${r.amount_cents >= 0 ? 'revenue' : 'expense'}`}>
                  {fmtMoney(r.amount_cents)}
                </div>
              </div>
            ))}
          </div>

          {filtered.length > 0 && (
            <div className="books-footer">
              <div className="books-footer-cell">
                <div className="books-footer-label">Revenue</div>
                <div className="books-footer-value good">{fmtMoney(totals?.revenue_cents ?? 0)}</div>
              </div>
              <div className="books-footer-cell">
                <div className="books-footer-label">Payroll</div>
                <div className="books-footer-value">−{fmtMoney(totals?.payroll_cents ?? 0)}</div>
              </div>
              <div className="books-footer-cell">
                <div className="books-footer-label">Expenses</div>
                <div className="books-footer-value warn">−{fmtMoney(totals?.expense_cents ?? 0)}</div>
              </div>
              <div className="books-footer-cell">
                <div className="books-footer-label">Net</div>
                <div className={`books-footer-value ${(totals?.net_cents ?? 0) >= 0 ? 'good' : 'warn'}`}>{fmtMoney(totals?.net_cents ?? 0)}</div>
              </div>
            </div>
          )}

          {total > entries.length && (
            <div className="books-more-note">Showing {entries.length} most recent of {total} entries. Narrow the range to see older ones.</div>
          )}
        </>
      )}

      {showEntry && <ManualEntryModal onClose={() => setShowEntry(false)} onSaved={() => { setShowEntry(false); load() }} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Manual journal entry modal — real balanced double-entry against the tenant's
// chart of accounts. Posts via POST /api/finance/ledger.
// ─────────────────────────────────────────────────────────────
type EntryLine = { coa_id: string; debit: string; credit: string }

function ManualEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<EntryLine[]>([
    { coa_id: '', debit: '', credit: '' },
    { coa_id: '', debit: '', credit: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/finance/chart-of-accounts')
      .then((r) => r.json())
      .then((d) => setAccounts((d.accounts || []) as Account[]))
      .catch(() => setAccounts([]))
  }, [])

  const toCents = (s: string) => Math.round((parseFloat(s) || 0) * 100)
  const totalDebits = lines.reduce((s, l) => s + toCents(l.debit), 0)
  const totalCredits = lines.reduce((s, l) => s + toCents(l.credit), 0)
  const balanced = totalDebits === totalCredits && totalDebits > 0
  const validLines = lines.filter((l) => l.coa_id && (toCents(l.debit) > 0 || toCents(l.credit) > 0)).length

  function setLine(i: number, patch: Partial<EntryLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function addLine() { setLines((prev) => [...prev, { coa_id: '', debit: '', credit: '' }]) }
  function removeLine(i: number) { setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i))) }

  async function save() {
    setErr(null)
    setSaving(true)
    try {
      const payload = {
        entry_date: date,
        memo,
        lines: lines
          .filter((l) => l.coa_id && (toCents(l.debit) > 0 || toCents(l.credit) > 0))
          .map((l) => ({ coa_id: l.coa_id, debit_cents: toCents(l.debit), credit_cents: toCents(l.credit) })),
      }
      const res = await fetch('/api/finance/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Could not save entry')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="books-modal-overlay" onClick={onClose}>
      <div className="books-modal" onClick={(e) => e.stopPropagation()}>
        <div className="books-modal-head">
          <div className="books-modal-title">New Journal Entry</div>
          <button className="books-modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="books-modal-body">
          <div className="books-field-row">
            <label className="books-field">
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="books-field grow">
              <span>Description</span>
              <input type="text" placeholder="What is this entry for?" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </label>
          </div>

          <div className="books-lines">
            <div className="books-lines-head">
              <div>Account</div>
              <div className="right">Debit</div>
              <div className="right">Credit</div>
              <div />
            </div>
            {lines.map((l, i) => (
              <div className="books-line-row" key={i}>
                <select value={l.coa_id} onChange={(e) => setLine(i, { coa_id: e.target.value })}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                  ))}
                </select>
                <input
                  type="number" inputMode="decimal" placeholder="0.00" className="right" value={l.debit}
                  onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })}
                />
                <input
                  type="number" inputMode="decimal" placeholder="0.00" className="right" value={l.credit}
                  onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })}
                />
                <button type="button" className="books-line-del" onClick={() => removeLine(i)} disabled={lines.length <= 2}>×</button>
              </div>
            ))}
            <button type="button" className="books-btn books-btn-ghost books-add-line" onClick={addLine}>+ Add line</button>
          </div>

          <div className={`books-balance ${balanced ? 'ok' : 'off'}`}>
            <span>Debits {fmtMoney(totalDebits)}</span>
            <span>Credits {fmtMoney(totalCredits)}</span>
            <span className="books-balance-flag">
              {balanced ? '✓ Balanced' : totalDebits === 0 ? 'Enter amounts' : `Off by ${fmtMoney(Math.abs(totalDebits - totalCredits))}`}
            </span>
          </div>

          {err && <div className="books-notice error">{err}</div>}
        </div>

        <div className="books-modal-foot">
          <button className="books-btn books-btn-ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="books-btn" type="button" onClick={save} disabled={!balanced || validLines < 2 || saving}>
            {saving ? 'Posting…' : 'Post entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
