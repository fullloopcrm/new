'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type CoA = { id: string; code: string; name: string; type: string; is_bank_account: boolean }
type BankAccount = { id: string; name: string; mask: string | null }
type Txn = {
  id: string
  txn_date: string
  description: string
  amount_cents: number
  status: string
  coa_id: string | null
  memo: string | null
  bank_accounts: BankAccount | null
  chart_of_accounts: { id: string; code: string; name: string } | null
}

function formatCents(c: number): string {
  const sign = c < 0 ? '−' : ''
  return `${sign}${(Math.abs(c) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
}

const TABS = [
  { value: 'pending', label: 'To Review' },
  { value: 'posted', label: 'Posted' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'all', label: 'All' },
]

export default function BankTransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [coas, setCoas] = useState<CoA[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [bulkCoa, setBulkCoa] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, cRes] = await Promise.all([
      fetch(`/api/finance/bank-transactions?${tab === 'all' ? '' : `status=${tab}`}&limit=500`).then(r => r.json()),
      fetch('/api/finance/chart-of-accounts').then(r => r.json()),
    ])
    setTxns(tRes.transactions || [])
    setCoas(cRes.accounts || [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function categorize(id: string, coa_id: string) {
    setBusy(id)
    const res = await fetch(`/api/finance/bank-transactions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coa_id }),
    })
    if (!res.ok) alert((await res.json()).error || 'Failed')
    setBusy(null); load()
  }

  async function ignore(id: string) {
    setBusy(id)
    await fetch(`/api/finance/bank-transactions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ignored' }),
    })
    setBusy(null); load()
  }

  const postable = coas.filter(c => !c.is_bank_account)

  return (
    <div>
      <Link href="/dashboard/finance/accounts" className="text-xs text-slate-500 hover:underline">← Bank Accounts</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Bank Transactions</h1>
          <p className="text-sm text-slate-500">Review and categorize imported transactions.</p>
        </div>
        <Link href="/dashboard/finance/import" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
          + Import More
        </Link>
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No transactions.{' '}
            <Link href="/dashboard/finance/import" className="text-teal-600 hover:underline">Import a statement →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.status === 'posted' ? 'text-slate-500' : ''}`}>
                  <td className="px-4 py-3 text-xs">{t.txn_date}</td>
                  <td className="px-4 py-3">
                    <p className={`${t.status === 'posted' ? 'text-slate-500' : 'text-slate-900'} font-medium`}>{t.description}</p>
                    {t.memo && <p className="text-xs text-slate-400">{t.memo}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {t.bank_accounts?.name}{t.bank_accounts?.mask ? ` ••${t.bank_accounts.mask}` : ''}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.amount_cents < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatCents(t.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'posted' ? (
                      <span className="text-xs text-slate-500">{t.chart_of_accounts?.code} · {t.chart_of_accounts?.name}</span>
                    ) : (
                      <select
                        value=""
                        disabled={busy === t.id}
                        onChange={e => e.target.value && categorize(t.id, e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs max-w-xs"
                      >
                        <option value="">— categorize —</option>
                        {postable.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'pending' && (
                      <button onClick={() => ignore(t.id)} disabled={busy === t.id}
                        className="text-xs text-slate-400 hover:text-slate-700">ignore</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {txns.filter(t => t.status === 'pending').length} to review · {txns.filter(t => t.status === 'posted').length} posted · {txns.filter(t => t.status === 'ignored').length} ignored
      </p>
      {/* Bulk toolbar placeholder (not wired yet) */}
      <input type="hidden" value={bulkCoa} onChange={e => setBulkCoa(e.target.value)} />
    </div>
  )
}
