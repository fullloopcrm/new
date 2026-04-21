'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }

type LineItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit_price_cents: number
}

function blankLine(): LineItem {
  return {
    id: `li_${Math.random().toString(36).slice(2, 10)}`,
    name: '', description: '', quantity: 1, unit_price_cents: 0,
  }
}

function centsToDollars(cents: number): string { return (cents / 100).toFixed(2) }
function dollarsToCents(str: string): number {
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function NewInvoicePage() {
  const router = useRouter()
  const search = useSearchParams()
  const fromBookingId = search.get('from_booking_id') || ''
  const fromQuoteId = search.get('from_quote_id') || ''

  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<LineItem[]>([blankLine()])
  const [taxPct, setTaxPct] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [terms, setTerms] = useState('Payment due on receipt unless otherwise agreed.')
  const [notes, setNotes] = useState('')
  const [dueDays, setDueDays] = useState('14')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clients?limit=500')
      .then(r => r.json())
      .then(data => setClients(Array.isArray(data) ? data : data.clients || []))
      .catch(() => {})
  }, [])

  // Prefill from booking or quote
  useEffect(() => {
    if (!fromBookingId && !fromQuoteId) return
    const run = async () => {
      try {
        if (fromQuoteId) {
          const res = await fetch(`/api/quotes/${fromQuoteId}`)
          const data = await res.json()
          const q = data.quote
          if (!q) return
          setTitle(q.title || '')
          setDescription(q.description || '')
          setContactName(q.contact_name || '')
          setContactEmail(q.contact_email || '')
          setContactPhone(q.contact_phone || '')
          setServiceAddress(q.service_address || '')
          setClientId(q.client_id || '')
          setTerms(q.terms || 'Payment due on receipt unless otherwise agreed.')
          setTaxPct(((q.tax_rate_bps || 0) / 100).toString())
          setDiscount(centsToDollars(q.discount_cents || 0))
          if (Array.isArray(q.line_items) && q.line_items.length) {
            setItems(q.line_items.map((li: LineItem & { subtotal_cents?: number }) => ({
              id: li.id || `li_${Math.random().toString(36).slice(2, 8)}`,
              name: li.name || '',
              description: li.description || '',
              quantity: li.quantity || 1,
              unit_price_cents: li.unit_price_cents || 0,
            })))
          }
        } else if (fromBookingId) {
          const res = await fetch(`/api/bookings?id=${fromBookingId}`)
          const data = await res.json()
          const b = Array.isArray(data.bookings) ? data.bookings[0] : null
          if (!b) return
          setClientId(b.client_id || '')
          setContactName(b.clients?.name || '')
          setContactEmail(b.clients?.email || '')
          setContactPhone(b.clients?.phone || '')
          setServiceAddress(b.clients?.address || b.address || '')
          setTitle(`Service on ${new Date(b.start_time).toLocaleDateString('en-US')}`)
          const hrs = Number(b.actual_hours) || 1
          const price = Number(b.price) || 0
          setItems([{
            id: `li_${Date.now()}`,
            name: 'Service',
            description: b.notes || '',
            quantity: hrs,
            unit_price_cents: hrs ? Math.round((price / hrs) * 100) : Math.round(price * 100),
          }])
        }
      } catch { /* ignore */ }
    }
    run()
  }, [fromBookingId, fromQuoteId])

  useEffect(() => {
    if (!clientId) return
    const c = clients.find(x => x.id === clientId)
    if (c) {
      if (!contactName) setContactName(c.name || '')
      if (!contactEmail && c.email) setContactEmail(c.email)
      if (!contactPhone && c.phone) setContactPhone(c.phone)
      if (!serviceAddress && c.address) setServiceAddress(c.address)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, clients])

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems(prev => prev.map(li => (li.id === id ? { ...li, ...patch } : li)))
  }
  function addItem() { setItems(prev => [...prev, blankLine()]) }
  function removeItem(id: string) { setItems(prev => prev.filter(li => li.id !== id)) }

  const subtotalCents = items.reduce((acc, li) => acc + Math.round(li.quantity * li.unit_price_cents), 0)
  const taxRateBps = Math.round(parseFloat(taxPct || '0') * 100)
  const discountCents = dollarsToCents(discount)
  const taxable = Math.max(0, subtotalCents - discountCents)
  const taxCents = Math.round((taxable * taxRateBps) / 10000)
  const totalCents = taxable + taxCents

  async function save(sendAfter: boolean) {
    setError('')
    if (!title.trim()) { setError('Title required'); return }
    if (items.filter(li => li.name.trim()).length === 0) { setError('At least one line item'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId || null,
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          service_address: serviceAddress || null,
          title,
          description: description || null,
          line_items: items.filter(li => li.name.trim()),
          tax_rate_bps: taxRateBps,
          discount_cents: discountCents,
          terms: terms || null,
          notes: notes || null,
          due_days: dueDays ? parseInt(dueDays) : null,
          from_quote_id: fromQuoteId || null,
          from_booking_id: fromBookingId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (sendAfter) {
        await fetch(`/api/invoices/${data.invoice.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ via: 'both' }),
        })
      }
      router.push(`/dashboard/sales/invoices/${data.invoice.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard/sales/invoices" className="text-xs text-slate-500 hover:underline">← Invoices</Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1 mb-6">New Invoice</h1>

      {error && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Bill To</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Existing client</label>
        <select
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
        >
          <option value="">— Standalone (no client yet) —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>)}
        </select>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Name" value={contactName} onChange={e => setContactName(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Service address" value={serviceAddress} onChange={e => setServiceAddress(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Invoice Details</h2>
        <input
          placeholder="Invoice title (e.g., March cleaning service)"
          value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <textarea
          placeholder="Description (optional)"
          value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-slate-900">Line Items</h2>
          <button onClick={addItem} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">+ Add line</button>
        </div>
        <div className="space-y-2">
          {items.map((li, idx) => (
            <div key={li.id} className="grid grid-cols-12 gap-2 items-start bg-slate-50 rounded-lg p-3">
              <div className="col-span-5">
                <input
                  placeholder="Item name"
                  value={li.name}
                  onChange={e => updateItem(li.id, { name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm mb-1"
                />
                <input
                  placeholder="Description (optional)"
                  value={li.description}
                  onChange={e => updateItem(li.id, { description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number" step="0.25" min="0" value={li.quantity}
                  onChange={e => updateItem(li.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-right"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text" value={centsToDollars(li.unit_price_cents)}
                  onChange={e => updateItem(li.id, { unit_price_cents: dollarsToCents(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-right"
                />
              </div>
              <div className="col-span-2 text-right pt-1.5 text-sm font-medium text-slate-900">
                {formatCents(Math.round(li.quantity * li.unit_price_cents))}
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeItem(li.id)}
                  disabled={items.length === 1}
                  className="text-red-400 hover:text-red-600 text-sm disabled:opacity-30"
                  aria-label={`Remove line ${idx + 1}`}
                >×</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Tax %</label>
            <input type="text" value={taxPct} onChange={e => setTaxPct(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="8.875" />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Discount ($)</label>
            <input type="text" value={discount} onChange={e => setDiscount(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Due in (days)</label>
            <input type="number" value={dueDays} onChange={e => setDueDays(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span><span>{formatCents(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span><span>−{formatCents(discountCents)}</span>
              </div>
            )}
            {taxRateBps > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax ({taxPct}%)</span><span>{formatCents(taxCents)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-base">
              <span>Total</span><span>{formatCents(totalCents)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Terms &amp; Notes</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Terms (shown to client)</label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
        <label className="block text-xs text-slate-500 uppercase mb-1">Internal notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </section>

      <div className="flex flex-wrap gap-2 justify-end sticky bottom-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <Link href="/dashboard/sales/invoices" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</Link>
        <button onClick={() => save(false)} disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
          Save Draft
        </button>
        <button onClick={() => save(true)} disabled={saving}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save & Send'}
        </button>
      </div>
    </div>
  )
}
