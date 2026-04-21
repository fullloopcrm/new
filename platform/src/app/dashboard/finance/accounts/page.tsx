'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type CoA = { id: string; code: string; name: string; type: string; is_bank_account: boolean }
type BankAccount = {
  id: string
  name: string
  institution: string | null
  type: string | null
  mask: string | null
  coa_id: string | null
  current_balance_cents: number | null
  chart_of_accounts: { code: string; name: string } | null
}

function formatCents(c: number | null): string {
  if (c == null) return '—'
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function BankAccountsPage() {
  const [coas, setCoas] = useState<CoA[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Form
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [type, setType] = useState('checking')
  const [mask, setMask] = useState('')
  const [coaId, setCoaId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [cRes, bRes] = await Promise.all([
      fetch('/api/finance/chart-of-accounts').then(r => r.json()),
      fetch('/api/finance/bank-accounts').then(r => r.json()),
    ])
    setCoas(cRes.accounts || [])
    setAccounts(bRes.bank_accounts || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function seedDefaults() {
    setSeeding(true); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/finance/chart-of-accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_defaults: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMsg(`Seeded ${data.seeded} default accounts`)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setSeeding(false)
  }

  async function create() {
    setErr('')
    if (!name.trim()) { setErr('Name required'); return }
    const res = await fetch('/api/finance/bank-accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, institution, type, mask, coa_id: coaId || null }),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return }
    setShowForm(false); setName(''); setInstitution(''); setMask(''); setCoaId(''); load()
  }

  const bankCoas = coas.filter(c => c.is_bank_account)
  const hasChart = coas.length > 0

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Bank Accounts</h1>
          <p className="text-sm text-slate-500">Add the bank accounts you'll import statements from.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/finance/import" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Import Statement →
          </Link>
          <Link href="/dashboard/finance/transactions" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Transactions →
          </Link>
          <button onClick={() => setShowForm(v => !v)} disabled={!hasChart}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
            {showForm ? 'Cancel' : '+ Add Account'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {!hasChart && !loading && (
        <div className="mb-4 p-5 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-semibold text-amber-900 mb-2">Chart of Accounts not set up</p>
          <p className="text-xs text-amber-800 mb-3">Seed the standard 29-account chart (customize later).</p>
          <button onClick={seedDefaults} disabled={seeding}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
            {seeding ? 'Seeding…' : 'Seed default chart'}
          </button>
        </div>
      )}

      {showForm && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Account name (e.g., Chase Operating)" value={name} onChange={e => setName(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Institution (Chase, Wells, etc.)" value={institution} onChange={e => setInstitution(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={type} onChange={e => setType(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit_card">Credit Card</option>
              <option value="loan">Loan</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Last 4 of account" value={mask} onChange={e => setMask(e.target.value)} maxLength={4} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={coaId} onChange={e => setCoaId(e.target.value)} className="md:col-span-2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">— Link to Chart of Accounts (required to categorize) —</option>
              {bankCoas.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button onClick={create} className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
              Save
            </button>
          </div>
        </section>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No bank accounts yet. {hasChart ? 'Click + Add Account.' : 'Seed the Chart of Accounts first.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Institution</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Mask</th>
                <th className="px-5 py-2 font-medium">Linked CoA</th>
                <th className="px-5 py-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map(a => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-medium">{a.name}</td>
                  <td className="px-5 py-3 text-slate-500">{a.institution || '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{a.type}</td>
                  <td className="px-5 py-3 text-slate-500">{a.mask ? `••${a.mask}` : '—'}</td>
                  <td className="px-5 py-3 text-xs">
                    {a.chart_of_accounts ? (
                      <span className="text-slate-700">{a.chart_of_accounts.code} · {a.chart_of_accounts.name}</span>
                    ) : (
                      <span className="text-amber-600">⚠ not linked</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{formatCents(a.current_balance_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
