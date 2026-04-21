'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type BankTxn = { id: string; txn_date: string; description: string; amount_cents: number; bank_account_id: string }
type Invoice = { id: string; invoice_number: string; total_cents: number; amount_paid_cents: number; due_date: string | null; contact_name: string | null; clients: { name: string } | null }
type Booking = { id: string; start_time: string; price: number | null; payment_status: string | null; clients: { name: string } | null }
type Expense = { id: string; date: string; category: string; amount: number; description: string | null; vendor_name: string | null }
type Suggestion = { target_type: string; target_id: string; confidence: number; label: string } | null

function formatCents(c: number): string {
  const abs = Math.abs(c || 0) / 100
  const s = abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  return c < 0 ? `−${s}` : s
}

export default function ReconcilePage() {
  const [txns, setTxns] = useState<BankTxn[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({})
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/finance/reconcile-candidates')
    const data = await res.json()
    setTxns(data.bank_transactions || [])
    setInvoices(data.invoices || [])
    setBookings(data.bookings || [])
    setExpenses(data.expenses || [])
    setSuggestions(data.suggestions || {})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function match(txnId: string, targetType: string, targetId: string) {
    setErr(''); setMsg('')
    const res = await fetch(`/api/finance/bank-transactions/${txnId}/match`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Match failed'); return }
    setMsg('Matched')
    load()
  }

  function onDragStart(e: React.DragEvent, txnId: string) {
    setDragId(txnId)
    e.dataTransfer.setData('text/plain', txnId)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragEnd() { setDragId(null) }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  function onDrop(e: React.DragEvent, targetType: string, targetId: string) {
    e.preventDefault()
    const txnId = dragId || e.dataTransfer.getData('text/plain')
    if (!txnId) return
    match(txnId, targetType, targetId)
    setDragId(null)
  }

  const inflows = txns.filter(t => t.amount_cents > 0)
  const outflows = txns.filter(t => t.amount_cents < 0)

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="mt-1 mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Reconcile</h1>
          <p className="text-sm text-slate-500">Drag a bank transaction onto an invoice, booking, or expense to match it.</p>
        </div>
        <Link href="/dashboard/finance/transactions" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
          Back to Transactions
        </Link>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: pending bank txns */}
          <div>
            <h2 className="font-heading font-semibold text-slate-900 text-sm mb-2">Pending Bank ({txns.length})</h2>

            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
              <h3 className="px-4 py-2 bg-green-50 text-green-700 text-xs font-semibold uppercase">Inflows ({inflows.length})</h3>
              {inflows.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">No pending inflows</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {inflows.map(t => {
                    const sug = suggestions[t.id]
                    return (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={e => onDragStart(e, t.id)}
                        onDragEnd={onDragEnd}
                        className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-move hover:bg-slate-50 ${dragId === t.id ? 'opacity-50' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                          <p className="text-xs text-slate-500">{t.txn_date}</p>
                          {sug && (
                            <button
                              onClick={() => match(t.id, sug.target_type, sug.target_id)}
                              className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 hover:opacity-80"
                            >
                              ✓ Match to {sug.label} ({Math.round(sug.confidence * 100)}%)
                            </button>
                          )}
                        </div>
                        <p className="text-sm font-bold text-green-700 flex-shrink-0">{formatCents(t.amount_cents)}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <h3 className="px-4 py-2 bg-red-50 text-red-700 text-xs font-semibold uppercase">Outflows ({outflows.length})</h3>
              {outflows.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">No pending outflows</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {outflows.map(t => {
                    const sug = suggestions[t.id]
                    return (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={e => onDragStart(e, t.id)}
                        onDragEnd={onDragEnd}
                        className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-move hover:bg-slate-50 ${dragId === t.id ? 'opacity-50' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                          <p className="text-xs text-slate-500">{t.txn_date}</p>
                          {sug && (
                            <button
                              onClick={() => match(t.id, sug.target_type, sug.target_id)}
                              className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 hover:opacity-80"
                            >
                              ✓ Match to {sug.label} ({Math.round(sug.confidence * 100)}%)
                            </button>
                          )}
                        </div>
                        <p className="text-sm font-bold text-red-700 flex-shrink-0">{formatCents(t.amount_cents)}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right: drop targets */}
          <div className="space-y-3">
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <h3 className="px-4 py-2 bg-slate-50 text-slate-700 text-xs font-semibold uppercase">Open Invoices ({invoices.length})</h3>
              {invoices.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">No open invoices</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {invoices.map(inv => {
                    const balance = inv.total_cents - (inv.amount_paid_cents || 0)
                    return (
                      <li
                        key={inv.id}
                        onDragOver={onDragOver}
                        onDrop={e => onDrop(e, 'invoice', inv.id)}
                        className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-teal-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{inv.invoice_number}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {inv.clients?.name || inv.contact_name}{inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-amber-700">{formatCents(balance)}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <h3 className="px-4 py-2 bg-slate-50 text-slate-700 text-xs font-semibold uppercase">Unpaid Completed Bookings ({bookings.length})</h3>
              {bookings.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">All completed bookings settled</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bookings.map(b => (
                    <li
                      key={b.id}
                      onDragOver={onDragOver}
                      onDrop={e => onDrop(e, 'booking', b.id)}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-teal-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{b.clients?.name || 'Client'}</p>
                        <p className="text-xs text-slate-500">{new Date(b.start_time).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-semibold text-amber-700">{formatCents(Math.round((Number(b.price) || 0) * 100))}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <h3 className="px-4 py-2 bg-slate-50 text-slate-700 text-xs font-semibold uppercase">Unmatched Expenses ({expenses.length})</h3>
              {expenses.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">No unmatched expenses</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {expenses.map(e => (
                    <li
                      key={e.id}
                      onDragOver={onDragOver}
                      onDrop={ev => onDrop(ev, 'expense', e.id)}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-teal-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{e.vendor_name || e.description || e.category}</p>
                        <p className="text-xs text-slate-500">{e.date} · {e.category}</p>
                      </div>
                      <p className="text-sm font-semibold text-red-700">−{formatCents(Math.round((Number(e.amount) || 0)))}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
