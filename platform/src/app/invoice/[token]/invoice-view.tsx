'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type LineItem = {
  id: string
  name: string
  description?: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

type Business = {
  name: string
  slug: string
  domain: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  primary_color: string | null
}

type Invoice = {
  id: string
  invoice_number: string
  status: string
  title: string | null
  description: string | null
  contact_name: string | null
  contact_email: string | null
  service_address: string | null
  line_items: LineItem[]
  subtotal_cents: number
  tax_rate_bps: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  amount_paid_cents: number
  terms: string | null
  due_date: string | null
  issued_at: string | null
  paid_at: string | null
  public_token: string | null
  business: Business
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function InvoiceView({ token }: { token: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [paying, setPaying] = useState(false)
  const search = useSearchParams()
  const justPaid = search.get('paid') === '1'
  const justCancelled = search.get('cancelled') === '1'

  useEffect(() => {
    fetch(`/api/invoices/public/${token}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || 'Not found')
        return r.json()
      })
      .then(data => { setInvoice(data.invoice); setLoading(false) })
      .catch(e => { setErr(e.message || 'Failed'); setLoading(false) })
  }, [token])

  async function payNow() {
    setPaying(true); setErr('')
    try {
      const res = await fetch(`/api/invoices/public/${token}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
      setPaying(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  if (err && !invoice) return <div className="min-h-screen flex items-center justify-center"><div className="p-6 bg-white border border-slate-200 rounded-xl max-w-md text-center"><p className="text-slate-700">{err}</p></div></div>
  if (!invoice) return null

  const biz = invoice.business
  const primary = biz.primary_color || '#0d9488'
  const balance = invoice.total_cents - (invoice.amount_paid_cents || 0)
  const isPaid = invoice.status === 'paid' || balance <= 0

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="bg-white border border-slate-200 rounded-xl p-6 mb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {biz.logo_url && <img src={biz.logo_url} alt={biz.name} className="h-10 w-10 rounded" />}
            <div>
              <p className="font-bold text-slate-900 text-lg">{biz.name}</p>
              <p className="text-xs text-slate-500">
                {biz.phone && <span>{biz.phone}</span>}
                {biz.phone && biz.email && <span> · </span>}
                {biz.email && <span>{biz.email}</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Invoice</p>
            <p className="font-mono text-slate-900 font-semibold">{invoice.invoice_number}</p>
          </div>
        </header>

        {isPaid && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="font-semibold text-green-800">Invoice paid — thank you</p>
            {invoice.paid_at && <p className="text-xs text-green-700 mt-1">Paid on {new Date(invoice.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
          </div>
        )}
        {justPaid && !isPaid && (
          <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="font-semibold text-blue-800">Payment processing</p>
            <p className="text-xs text-blue-700 mt-1">Your payment is confirming. Refresh this page in a moment.</p>
          </div>
        )}
        {justCancelled && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="font-semibold text-amber-800">Payment cancelled</p>
            <p className="text-xs text-amber-700 mt-1">No charge was made. You can try again below.</p>
          </div>
        )}
        {invoice.status === 'overdue' && !isPaid && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="font-semibold text-red-800">This invoice is overdue</p>
            {invoice.due_date && <p className="text-xs text-red-700 mt-1">Was due {new Date(invoice.due_date).toLocaleDateString()}</p>}
          </div>
        )}

        <main className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-6 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">{invoice.title || 'Invoice'}</h1>
            {invoice.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{invoice.description}</p>}
          </div>

          <div className="px-6 py-4 bg-slate-50 text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Bill to</p>
              <p className="font-medium">{invoice.contact_name || '—'}</p>
              {invoice.contact_email && <p className="text-xs text-slate-500">{invoice.contact_email}</p>}
            </div>
            <div>
              {invoice.issued_at && <><p className="text-xs text-slate-400 uppercase mb-1">Issued</p><p>{new Date(invoice.issued_at).toLocaleDateString()}</p></>}
              {invoice.due_date && <><p className="text-xs text-slate-400 uppercase mb-1 mt-2">Due</p><p>{new Date(invoice.due_date).toLocaleDateString()}</p></>}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-2 font-medium">Item</th>
                <th className="px-6 py-2 font-medium text-right">Qty</th>
                <th className="px-6 py-2 font-medium text-right">Rate</th>
                <th className="px-6 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.line_items || []).map(li => (
                <tr key={li.id}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{li.name}</p>
                    {li.description && <p className="text-xs text-slate-500 mt-0.5">{li.description}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">{li.quantity}</td>
                  <td className="px-6 py-3 text-right">{formatCents(li.unit_price_cents)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCents(li.subtotal_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr><td colSpan={3} className="px-6 py-2 text-right text-slate-600">Subtotal</td><td className="px-6 py-2 text-right">{formatCents(invoice.subtotal_cents)}</td></tr>
              {invoice.discount_cents > 0 && <tr><td colSpan={3} className="px-6 py-2 text-right text-slate-600">Discount</td><td className="px-6 py-2 text-right">−{formatCents(invoice.discount_cents)}</td></tr>}
              {invoice.tax_cents > 0 && <tr><td colSpan={3} className="px-6 py-2 text-right text-slate-600">Tax</td><td className="px-6 py-2 text-right">{formatCents(invoice.tax_cents)}</td></tr>}
              <tr className="font-bold text-slate-900 border-t border-slate-200">
                <td colSpan={3} className="px-6 py-3 text-right text-base">Total</td>
                <td className="px-6 py-3 text-right text-xl">{formatCents(invoice.total_cents)}</td>
              </tr>
              {invoice.amount_paid_cents > 0 && (
                <tr className="text-green-700"><td colSpan={3} className="px-6 py-2 text-right">Paid</td><td className="px-6 py-2 text-right">−{formatCents(invoice.amount_paid_cents)}</td></tr>
              )}
              {balance > 0 && (
                <tr className="font-bold text-slate-900 border-t border-slate-200">
                  <td colSpan={3} className="px-6 py-3 text-right">Balance Due</td>
                  <td className="px-6 py-3 text-right text-xl" style={{ color: primary }}>{formatCents(balance)}</td>
                </tr>
              )}
            </tfoot>
          </table>

          {invoice.terms && (
            <div className="px-6 py-5 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2 text-xs uppercase tracking-wide">Terms</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{invoice.terms}</p>
            </div>
          )}

          {balance > 0 && !isPaid && (
            <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-col items-center gap-3">
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button
                onClick={payNow}
                disabled={paying}
                className="w-full md:w-auto px-8 py-3 text-base font-semibold rounded-lg text-white disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >{paying ? 'Loading…' : `Pay ${formatCents(balance)} now`}</button>
              <p className="text-[11px] text-slate-400">Secure payment powered by Stripe</p>
            </div>
          )}
        </main>

        <footer className="mt-6 text-center text-xs text-slate-400">
          Powered by Full Loop · Questions? Contact {biz.name}
        </footer>
      </div>
    </div>
  )
}
