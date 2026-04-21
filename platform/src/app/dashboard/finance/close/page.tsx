'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type Period = {
  id: string
  entity_id: string | null
  year: number
  month: number
  status: 'open' | 'in_review' | 'locked' | 'reopened'
  checklist: Record<string, boolean>
  locked_at: string | null
  notes: string | null
  entities: { name: string } | null
}

const CHECKLIST_ITEMS = [
  { key: 'bank_recon', label: 'All bank transactions reviewed or categorized' },
  { key: 'ar_review', label: 'AR aging reviewed — follow-ups sent' },
  { key: 'ap_review', label: 'Bills / payables accounted for' },
  { key: 'payroll_posted', label: 'Payroll for the month posted' },
  { key: 'tax_liabilities', label: 'Sales tax calculated and queued' },
  { key: 'reports_reviewed', label: 'P&L reviewed; variances explained' },
]

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-slate-100 text-slate-600',
  in_review: 'bg-amber-50 text-amber-700',
  locked: 'bg-green-50 text-green-700',
  reopened: 'bg-blue-50 text-blue-700',
}

function monthLabel(y: number, m: number) {
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function currentYearMonth() {
  const d = new Date()
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

export default function FinanceClosePage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/finance/periods').then(r => r.json()).then(d => {
      setPeriods(d.periods || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function ensurePeriod(year: number, month: number): Promise<Period | null> {
    const existing = periods.find(p => p.year === year && p.month === month && !p.entity_id)
    if (existing) return existing
    const res = await fetch('/api/finance/periods', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return null }
    const data = await res.json()
    load()
    return data.period
  }

  async function toggleCheck(period: Period, key: string) {
    const next = { ...period.checklist, [key]: !period.checklist?.[key] }
    await fetch(`/api/finance/periods/${period.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: next }),
    })
    load()
  }

  async function setStatus(period: Period, status: string) {
    setErr(''); setMsg('')
    const body: Record<string, string> = { status }
    if (status === 'reopened') {
      const reason = prompt('Reason for reopening:') || ''
      body.reopened_reason = reason
    }
    const res = await fetch(`/api/finance/periods/${period.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return }
    setMsg(status === 'locked' ? `${monthLabel(period.year, period.month)} locked` : 'Updated')
    load()
  }

  const { year, month } = currentYearMonth()
  const lastMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="mt-1 mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Monthly Close</h1>
          <p className="text-sm text-slate-500">Checklist-driven close. Locking blocks all journal entries in that month for this tenant.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => ensurePeriod(lastMonth.year, lastMonth.month)}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
            Start closing {monthLabel(lastMonth.year, lastMonth.month)}
          </button>
          <Link href="/dashboard/finance/audit" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Audit Log →
          </Link>
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : periods.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">No close periods yet. Click &quot;Start closing&quot; above.</div>
      ) : (
        <div className="space-y-3">
          {periods.map(p => {
            const checkedCount = CHECKLIST_ITEMS.filter(i => p.checklist?.[i.key]).length
            const open = expanded === p.id
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                     onClick={() => setExpanded(open ? null : p.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[p.status] || 'bg-slate-100'}`}>{p.status.replace('_', ' ')}</span>
                    <h3 className="font-heading font-semibold text-slate-900">
                      {monthLabel(p.year, p.month)}{p.entities?.name ? ` · ${p.entities.name}` : ''}
                    </h3>
                    <span className="text-xs text-slate-500">{checkedCount}/{CHECKLIST_ITEMS.length} checked</span>
                  </div>
                  <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
                </div>
                {open && (
                  <div className="px-5 py-4 border-t border-slate-200 space-y-3">
                    {CHECKLIST_ITEMS.map(item => (
                      <label key={item.key} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!p.checklist?.[item.key]}
                          disabled={p.status === 'locked'}
                          onChange={() => toggleCheck(p, item.key)}
                          className="mt-0.5"
                        />
                        <span className={p.checklist?.[item.key] ? 'text-slate-400 line-through' : 'text-slate-700'}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                    <div className="pt-3 border-t border-slate-200 flex gap-2">
                      {p.status !== 'locked' ? (
                        <>
                          <button
                            onClick={() => setStatus(p, 'in_review')}
                            disabled={p.status === 'in_review'}
                            className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >Mark In Review</button>
                          <button
                            onClick={() => setStatus(p, 'locked')}
                            disabled={checkedCount < CHECKLIST_ITEMS.length}
                            className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >Lock Period</button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-green-700">✓ Locked {p.locked_at ? new Date(p.locked_at).toLocaleDateString() : ''}</span>
                          <button
                            onClick={() => setStatus(p, 'reopened')}
                            className="ml-auto px-3 py-1.5 text-xs font-medium rounded bg-white border border-amber-300 text-amber-700 hover:bg-amber-50"
                          >Reopen</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
