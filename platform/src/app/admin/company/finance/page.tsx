'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatCurrency, StatCard, Panel, EmptyState } from '../../finance/finance-ui'
import {
  REVENUE_CATEGORIES,
  CATEGORY_LABEL,
  categoriesForType,
  type FinanceType,
  type FinanceCategory,
} from '@/lib/company-finance'

interface Transaction {
  id: string
  type: FinanceType
  category: FinanceCategory
  amount_cents: number
  occurred_on: string
  description: string | null
  tenant_id: string | null
  tenants: { name: string } | null
  source: string
}

interface Summary {
  totalRevenueCents: number
  totalExpenseCents: number
  netCents: number
  thisMonthRevenueCents: number
  thisMonthExpenseCents: number
  thisMonthNetCents: number
}

interface Tenant {
  id: string
  name: string
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function CompanyFinancePage() {
  useEffect(() => { document.title = 'Company Finance | FullLoop Admin' }, [])

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<FinanceType>('revenue')
  const [category, setCategory] = useState<FinanceCategory>(REVENUE_CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [tenantId, setTenantId] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/company/finance')
    const data = await res.json().catch(() => ({ transactions: [], summary: null }))
    setTransactions(data.transactions || [])
    setSummary(data.summary || null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    fetch('/api/admin/tenants')
      .then((r) => (r.ok ? r.json() : { tenants: [] }))
      .then((d) => setTenants((d.tenants || []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))))
      .catch(() => setTenants([]))
  }, [load])

  function switchType(next: FinanceType) {
    setType(next)
    setCategory(categoriesForType(next)[0])
    if (next === 'expense') setTenantId('')
  }

  async function createTransaction() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!amount || Number.isNaN(cents) || cents <= 0 || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/company/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          amount_cents: cents,
          occurred_on: occurredOn,
          description: description.trim() || null,
          tenant_id: type === 'revenue' ? tenantId || null : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      setAmount('')
      setDescription('')
      setTenantId('')
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm('Delete this entry?')) return
    await fetch(`/api/admin/company/finance/${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading || !summary) return <p className="text-slate-500">Loading...</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 font-heading text-2xl font-bold">Company Finance</h1>
          <p className="text-sm text-slate-500">What Full Loop actually collects and spends running the platform — not tenant revenue.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          {showForm ? 'Cancel' : '+ Log entry'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="This Month Net" value={formatCurrency(summary.thisMonthNetCents / 100)} tone={summary.thisMonthNetCents >= 0 ? 'good' : 'bad'} />
        <StatCard label="This Month Revenue" value={formatCurrency(summary.thisMonthRevenueCents / 100)} />
        <StatCard label="This Month Expense" value={formatCurrency(summary.thisMonthExpenseCents / 100)} />
        <StatCard label="All-Time Net" value={formatCurrency(summary.netCents / 100)} tone={summary.netCents >= 0 ? 'good' : 'bad'} />
      </div>

      {showForm && (
        <Panel title="Log a transaction">
          <div className="p-5 space-y-3">
            <div className="flex gap-2">
              {(['revenue', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchType(t)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${
                    type === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FinanceCategory)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {categoriesForType(type).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Amount</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Date</span>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              {type === 'revenue' && (
                <label className="block">
                  <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Tenant (optional)</span>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. August Anthropic bill"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="button"
              onClick={createTransaction}
              disabled={!amount || saving}
              className="px-4 py-2 bg-teal-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </Panel>
      )}

      <Panel title="Ledger">
        {transactions.length === 0 ? (
          <EmptyState>No entries yet — log your first revenue or expense above.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Category</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Description</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Amount</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-slate-700">{t.occurred_on}</td>
                    <td className="px-5 py-3 text-sm text-slate-900">
                      {CATEGORY_LABEL[t.category]}
                      {t.tenants?.name && <span className="text-xs text-gray-400"> · {t.tenants.name}</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{t.description || '—'}</td>
                    <td className={`px-5 py-3 text-sm text-right font-medium ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'revenue' ? '+' : '-'}{formatCurrency(t.amount_cents / 100)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" onClick={() => deleteTransaction(t.id)} className="text-xs text-red-400 hover:text-red-600">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
