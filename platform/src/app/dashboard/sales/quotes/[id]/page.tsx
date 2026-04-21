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
  optional?: boolean
  selected?: boolean
}

type Quote = {
  id: string
  quote_number: string
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
  terms: string | null
  notes: string | null
  valid_until: string | null
  public_token: string | null
  sent_at: string | null
  sent_via: string | null
  first_viewed_at: string | null
  last_viewed_at: string | null
  view_count: number
  accepted_at: string | null
  declined_at: string | null
  declined_reason: string | null
  signature_name: string | null
  signature_png: string | null
  converted_booking_id: string | null
  converted_at: string | null
  clients: { id: string; name: string; email: string | null; phone: string | null } | null
  created_at: string
}

type Activity = {
  id: string
  event_type: string
  detail: Record<string, unknown> | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-600',
  viewed: 'bg-violet-50 text-violet-600',
  accepted: 'bg-green-50 text-green-600',
  declined: 'bg-red-50 text-red-600',
  expired: 'bg-amber-50 text-amber-600',
  converted: 'bg-teal-50 text-teal-700',
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [quote, setQuote] = useState<Quote | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [publicUrl, setPublicUrl] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/quotes/${id}`)
      .then(r => r.json())
      .then(data => {
        setQuote(data.quote)
        setActivity(data.activity || [])
        if (data.quote?.public_token) {
          setPublicUrl(`${window.location.origin}/quote/${data.quote.public_token}`)
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

  const sendQuote = (via: 'email' | 'sms' | 'both') => doAction(`send-${via}`, async () => {
    const res = await fetch(`/api/quotes/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Send failed')
    setMsg(`Sent via ${data.via}`)
    load()
  })

  const convert = () => doAction('convert', async () => {
    const res = await fetch(`/api/quotes/${id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Convert failed')
    router.push(`/dashboard/bookings?highlight=${data.booking_id}`)
  })

  const del = () => doAction('delete', async () => {
    if (!confirm('Delete this quote? This cannot be undone.')) return
    const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Delete failed')
    }
    router.push('/dashboard/sales/quotes')
  })

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => setMsg('Link copied'))
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!quote) return <div className="p-8 text-slate-500 text-sm">Not found.</div>

  const canSend = ['draft', 'sent', 'viewed'].includes(quote.status)
  const canConvert = quote.status === 'accepted' && !quote.converted_booking_id

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/dashboard/sales/quotes" className="text-xs text-slate-500 hover:underline">← Quotes</Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{quote.quote_number}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[quote.status] || 'bg-slate-100 text-slate-500'}`}>{quote.status}</span>
          </div>
          <p className="text-slate-600 mt-1">{quote.title || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">{formatCents(quote.total_cents)}</p>
          {quote.valid_until && (
            <p className="text-xs text-slate-400">Valid until {new Date(quote.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          )}
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-5">
        {canSend && (
          <>
            <button onClick={() => sendQuote('both')} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
              {busy === 'send-both' ? 'Sending…' : quote.sent_at ? 'Re-send (SMS+Email)' : 'Send (SMS+Email)'}
            </button>
            <button onClick={() => sendQuote('email')} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">Email only</button>
            <button onClick={() => sendQuote('sms')} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">SMS only</button>
          </>
        )}
        {canConvert && (
          <button onClick={convert} disabled={!!busy}
            className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {busy === 'convert' ? 'Converting…' : 'Convert to Booking'}
          </button>
        )}
        {quote.converted_booking_id && (
          <Link href={`/dashboard/bookings?highlight=${quote.converted_booking_id}`}
            className="px-3 py-1.5 text-xs font-medium rounded bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
            View Booking →
          </Link>
        )}
        {publicUrl && (
          <button onClick={copyLink}
            className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">
            Copy public link
          </button>
        )}
        {['draft'].includes(quote.status) && (
          <button onClick={del} disabled={!!busy}
            className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 ml-auto">
            Delete
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main */}
        <div className="md:col-span-2 space-y-4">
          {quote.description && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.description}</p>
            </section>
          )}

          {/* Line items */}
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
                {(quote.line_items || []).map(li => (
                  <tr key={li.id} className={li.optional && !li.selected ? 'text-slate-400' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{li.name}{li.optional && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-100 rounded uppercase">optional</span>}</p>
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
                  <td className="px-4 py-2 text-right">{formatCents(quote.subtotal_cents)}</td>
                </tr>
                {quote.discount_cents > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Discount</td>
                    <td className="px-4 py-2 text-right">−{formatCents(quote.discount_cents)}</td>
                  </tr>
                )}
                {quote.tax_cents > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Tax ({(quote.tax_rate_bps / 100).toFixed(3)}%)</td>
                    <td className="px-4 py-2 text-right">{formatCents(quote.tax_cents)}</td>
                  </tr>
                )}
                <tr className="font-bold text-slate-900 border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right">{formatCents(quote.total_cents)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {quote.terms && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 mb-2 text-sm">Terms &amp; Conditions</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.terms}</p>
            </section>
          )}

          {quote.signature_png && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 mb-2 text-sm">Signature</h3>
              <p className="text-xs text-slate-500 mb-2">Signed by <strong>{quote.signature_name}</strong> on {quote.accepted_at ? new Date(quote.accepted_at).toLocaleString() : '—'}</p>
              <img src={quote.signature_png} alt="Signature" className="max-h-24 bg-white border border-slate-200 rounded" />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 mb-3 text-sm">Recipient</h3>
            {quote.clients && (
              <Link href={`/dashboard/clients/${quote.clients.id}`} className="block text-teal-600 text-sm font-medium hover:underline mb-2">
                {quote.clients.name}
              </Link>
            )}
            <p className="text-sm text-slate-700">{quote.contact_name || '—'}</p>
            {quote.contact_email && <p className="text-xs text-slate-500 mt-1">{quote.contact_email}</p>}
            {quote.contact_phone && <p className="text-xs text-slate-500">{quote.contact_phone}</p>}
            {quote.service_address && <p className="text-xs text-slate-500 mt-2">{quote.service_address}</p>}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 mb-3 text-sm">Timeline</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-400">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map(a => (
                  <li key={a.id} className="text-xs">
                    <p className="text-slate-700">
                      <span className="font-medium">{a.event_type}</span>
                      {a.detail && typeof a.detail === 'object' && Object.keys(a.detail).length > 0 && (
                        <span className="text-slate-400"> · {Object.entries(a.detail).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v).slice(0, 30)}`).join(', ')}</span>
                      )}
                    </p>
                    <p className="text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {quote.view_count > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 mb-3 text-sm">Views</h3>
              <p className="text-sm text-slate-700">{quote.view_count} view{quote.view_count === 1 ? '' : 's'}</p>
              {quote.first_viewed_at && <p className="text-xs text-slate-500">First: {new Date(quote.first_viewed_at).toLocaleString()}</p>}
              {quote.last_viewed_at && <p className="text-xs text-slate-500">Last: {new Date(quote.last_viewed_at).toLocaleString()}</p>}
            </section>
          )}

          {quote.notes && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-amber-900 mb-2 text-xs uppercase">Internal Notes</h3>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{quote.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
