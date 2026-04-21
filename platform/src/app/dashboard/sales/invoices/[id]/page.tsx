'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type LineItem = {
  id: string
  name: string
  description?: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

type Invoice = {
  id: string
  invoice_number: string
  status: string
  title: string | null
  description: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  service_address: string | null
  line_items: LineItem[]
  subtotal_cents: number
  tax_rate_bps: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  amount_paid_cents: number
  terms: string | null
  notes: string | null
  due_date: string | null
  issued_at: string | null
  paid_at: string | null
  public_token: string | null
  sent_at: string | null
  sent_via: string | null
  view_count: number
  quote_id: string | null
  booking_id: string | null
  clients: { id: string; name: string } | null
  created_at: string
}

type Activity = {
  id: string
  event_type: string
  detail: Record<string, unknown> | null
  created_at: string
}

type Payment = {
  id: string
  amount_cents: number
  tip_cents: number | null
  method: string | null
  status: string | null
  reference_id: string | null
  sender_name: string | null
  received_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-600',
  viewed: 'bg-violet-50 text-violet-600',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
  void: 'bg-slate-100 text-slate-400',
  refunded: 'bg-slate-100 text-slate-400',
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [showRecord, setShowRecord] = useState(false)
  const [recordAmount, setRecordAmount] = useState('')
  const [recordMethod, setRecordMethod] = useState('zelle')
  const [recordReference, setRecordReference] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(data => {
        setInvoice(data.invoice)
        setActivity(data.activity || [])
        setPayments(data.payments || [])
        if (data.invoice?.public_token) {
          setPublicUrl(`${window.location.origin}/invoice/${data.invoice.public_token}`)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function doAction(label: string, fn: () => Promise<void>) {
    setBusy(label); setErr(''); setMsg('')
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }

  const send = (via: 'email' | 'sms' | 'both') => doAction(`send-${via}`, async () => {
    const res = await fetch(`/api/invoices/${id}/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Send failed')
    setMsg(`Sent via ${data.via}`)
    load()
  })

  const recordPayment = () => doAction('record', async () => {
    const res = await fetch(`/api/invoices/${id}/record-payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_cents: Math.round(parseFloat(recordAmount) * 100),
        method: recordMethod,
        reference_id: recordReference || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    setMsg(`Payment recorded — balance ${formatCents(data.balance_cents)}`)
    setShowRecord(false)
    setRecordAmount(''); setRecordReference('')
    load()
  })

  const voidInv = () => doAction('void', async () => {
    const reason = prompt('Void reason (optional):') || ''
    const res = await fetch(`/api/invoices/${id}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error((await res.json()).error || 'Failed')
    setMsg('Invoice voided'); load()
  })

  const delDraft = () => doAction('delete', async () => {
    if (!confirm('Delete this draft invoice?')) return
    const res = await fetch(`/api/invoices/${id}?hard=1`, { method: 'DELETE' })
    if (!res.ok) throw new Error((await res.json()).error || 'Failed')
    router.push('/dashboard/sales/invoices')
  })

  const copyLink = () => navigator.clipboard.writeText(publicUrl).then(() => setMsg('Link copied'))

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!invoice) return <div className="p-8 text-slate-500 text-sm">Not found.</div>

  const balance = invoice.total_cents - (invoice.amount_paid_cents || 0)
  const canSend = !['void', 'refunded'].includes(invoice.status)
  const canRecord = !['paid', 'void', 'refunded'].includes(invoice.status)
  const canVoid = !['paid', 'void', 'refunded'].includes(invoice.status) && invoice.status !== 'draft'
  const canDelete = invoice.status === 'draft' && (invoice.amount_paid_cents || 0) === 0

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/dashboard/sales/invoices" className="text-xs text-slate-500 hover:underline">← Invoices</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[invoice.status] || 'bg-slate-100 text-slate-500'}`}>{invoice.status}</span>
          </div>
          <p className="text-slate-600 mt-1">{invoice.title || '—'}</p>
          {invoice.quote_id && (
            <Link href={`/dashboard/sales/quotes/${invoice.quote_id}`} className="text-xs text-teal-600 hover:underline">
              From quote →
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">{formatCents(invoice.total_cents)}</p>
          {invoice.amount_paid_cents > 0 && (
            <p className="text-xs text-green-600">Paid {formatCents(invoice.amount_paid_cents)}</p>
          )}
          {balance > 0 && invoice.status !== 'draft' && (
            <p className="text-sm font-semibold text-amber-700">Balance {formatCents(balance)}</p>
          )}
          {invoice.due_date && (
            <p className="text-xs text-slate-400">Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          )}
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-5">
        {canSend && (
          <>
            <button onClick={() => send('both')} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
              {busy === 'send-both' ? 'Sending…' : invoice.sent_at ? 'Re-send (SMS+Email)' : 'Send (SMS+Email)'}
            </button>
            <button onClick={() => send('email')} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">Email only</button>
            <button onClick={() => send('sms')} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">SMS only</button>
          </>
        )}
        {canRecord && (
          <button onClick={() => { setShowRecord(true); setRecordAmount((balance / 100).toFixed(2)) }}
            className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700">
            Record Payment
          </button>
        )}
        {publicUrl && (
          <button onClick={copyLink} className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">
            Copy public link
          </button>
        )}
        {canDelete && (
          <button onClick={delDraft} disabled={!!busy}
            className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 ml-auto">
            Delete draft
          </button>
        )}
        {canVoid && (
          <button onClick={voidInv} disabled={!!busy}
            className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 ml-auto">
            Void
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {invoice.description && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.description}</p>
            </section>
          )}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Rate</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(invoice.line_items || []).map(li => (
                  <tr key={li.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{li.name}</p>
                      {li.description && <p className="text-xs text-slate-500 mt-0.5">{li.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">{li.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCents(li.unit_price_cents)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(li.subtotal_cents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Subtotal</td>
                  <td className="px-4 py-2 text-right">{formatCents(invoice.subtotal_cents)}</td>
                </tr>
                {invoice.discount_cents > 0 && (
                  <tr><td colSpan={3} className="px-4 py-2 text-right text-slate-600">Discount</td><td className="px-4 py-2 text-right">−{formatCents(invoice.discount_cents)}</td></tr>
                )}
                {invoice.tax_cents > 0 && (
                  <tr><td colSpan={3} className="px-4 py-2 text-right text-slate-600">Tax ({(invoice.tax_rate_bps / 100).toFixed(3)}%)</td><td className="px-4 py-2 text-right">{formatCents(invoice.tax_cents)}</td></tr>
                )}
                <tr className="font-bold text-slate-900 border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right">{formatCents(invoice.total_cents)}</td>
                </tr>
                {invoice.amount_paid_cents > 0 && (
                  <tr className="text-green-700">
                    <td colSpan={3} className="px-4 py-2 text-right">Paid</td>
                    <td className="px-4 py-2 text-right">−{formatCents(invoice.amount_paid_cents)}</td>
                  </tr>
                )}
                {balance !== invoice.total_cents && (
                  <tr className="font-bold text-amber-700 border-t border-slate-200">
                    <td colSpan={3} className="px-4 py-3 text-right">Balance</td>
                    <td className="px-4 py-3 text-right">{formatCents(balance)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </section>

          {/* Payments list */}
          {payments.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 mb-3 text-sm">Payments</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td className="py-2">
                        <p className="text-slate-900 font-medium">{formatCents(p.amount_cents)}</p>
                        <p className="text-xs text-slate-500">
                          {p.method} · {p.status}{p.reference_id ? ` · ${p.reference_id}` : ''}
                        </p>
                      </td>
                      <td className="py-2 text-right text-xs text-slate-500">
                        {p.received_at ? new Date(p.received_at).toLocaleString() : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {invoice.terms && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 mb-2 text-sm">Terms</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.terms}</p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 mb-3 text-sm">Bill To</h3>
            {invoice.clients && (
              <Link href={`/dashboard/clients/${invoice.clients.id}`} className="block text-teal-600 text-sm font-medium hover:underline mb-2">
                {invoice.clients.name}
              </Link>
            )}
            <p className="text-sm text-slate-700">{invoice.contact_name || '—'}</p>
            {invoice.contact_email && <p className="text-xs text-slate-500 mt-1">{invoice.contact_email}</p>}
            {invoice.contact_phone && <p className="text-xs text-slate-500">{invoice.contact_phone}</p>}
            {invoice.service_address && <p className="text-xs text-slate-500 mt-2">{invoice.service_address}</p>}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 mb-3 text-sm">Timeline</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-400">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map(a => (
                  <li key={a.id} className="text-xs">
                    <p className="text-slate-700 font-medium">{a.event_type}</p>
                    <p className="text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {invoice.view_count > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-700">{invoice.view_count} view{invoice.view_count === 1 ? '' : 's'}</p>
            </section>
          )}

          {invoice.notes && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-amber-900 mb-2 text-xs uppercase">Internal Notes</h3>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{invoice.notes}</p>
            </section>
          )}
        </div>
      </div>

      {/* Record payment modal */}
      {showRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Record Payment</h3>
            <label className="block text-xs text-slate-500 uppercase mb-1">Amount</label>
            <input type="text" value={recordAmount} onChange={e => setRecordAmount(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
            <label className="block text-xs text-slate-500 uppercase mb-1">Method</label>
            <select value={recordMethod} onChange={e => setRecordMethod(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="stripe">Stripe (manual)</option>
              <option value="other">Other</option>
            </select>
            <label className="block text-xs text-slate-500 uppercase mb-1">Reference (optional)</label>
            <input type="text" value={recordReference} onChange={e => setRecordReference(e.target.value)}
              placeholder="Check #, txn ID, confirmation #"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRecord(false)}
                className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={recordPayment} disabled={busy === 'record'}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                {busy === 'record' ? 'Saving…' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
