'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Recurring = {
  id: string
  label: string
  category: string | null
  amount_cents: number
  frequency: string
  start_date: string
  end_date: string | null
  next_due_date: string | null
  notes: string | null
  active: boolean
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']

export default function RecurringExpensesPage() {
  const [rows, setRows] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('software')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/recurring-expenses').then(r => r.json()).then(d => {
      setRows(d.recurring_expenses || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!label.trim() || !amount) { setErr('Label + amount required'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/recurring-expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          category,
          amount_cents: Math.round(parseFloat(amount) * 100),
          frequency,
          start_date: startDate,
          next_due_date: startDate,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setLabel(''); setAmount(''); setShowForm(false)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Remove this recurring expense?')) return
    await fetch(`/api/recurring-expenses/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Recurring Expenses</h1>
          <p className="text-sm text-slate-500">Fixed costs (rent, insurance, software) — used by the cash flow forecast.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
          {showForm ? 'Cancel' : '+ Add Recurring'}
        </button>
      </div>

      {showForm && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Label (e.g., Rent, Insurance)" value={label} onChange={e => setLabel(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {['rent', 'insurance', 'software', 'utilities', 'payroll_fees', 'fuel', 'marketing', 'other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input placeholder="Amount ($)" value={amount} onChange={e => setAmount(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={frequency} onChange={e => setFrequency(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
          <div className="flex justify-end">
            <button onClick={create} disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </section>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No recurring expenses yet. Click <em>+ Add Recurring</em> to start modeling cash flow.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Label</th>
                <th className="px-5 py-2 font-medium">Category</th>
                <th className="px-5 py-2 font-medium">Frequency</th>
                <th className="px-5 py-2 font-medium text-right">Amount</th>
                <th className="px-5 py-2 font-medium">Next due</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-medium">{r.label}</td>
                  <td className="px-5 py-3 text-slate-500">{r.category || '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{r.frequency}</td>
                  <td className="px-5 py-3 text-right font-medium">{formatCents(r.amount_cents)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
