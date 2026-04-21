'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }

type LineItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit_price_cents: number
  optional: boolean
  selected: boolean
}

function blankLine(): LineItem {
  return {
    id: `li_${Math.random().toString(36).slice(2, 10)}`,
    name: '',
    description: '',
    quantity: 1,
    unit_price_cents: 0,
    optional: false,
    selected: true,
  }
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

function dollarsToCents(str: string): number {
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function NewQuotePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState<string>('')

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [items, setItems] = useState<LineItem[]>([blankLine()])
  const [taxPct, setTaxPct] = useState('0')
  const [discount, setDiscount] = useState('0')

  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [validUntilDays, setValidUntilDays] = useState('30')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clients?limit=500')
      .then(r => r.json())
      .then(data => setClients(Array.isArray(data) ? data : data.clients || []))
      .catch(() => {})
  }, [])

  // When client picked, prefill contact fields
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

  const subtotalCents = items
    .filter(li => !li.optional || li.selected)
    .reduce((acc, li) => acc + Math.round(li.quantity * li.unit_price_cents), 0)
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
      const validUntil = validUntilDays
        ? new Date(Date.now() + parseInt(validUntilDays) * 86400000).toISOString().slice(0, 10)
        : null

      const res = await fetch('/api/quotes', {
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
          line_items: items
            .filter(li => li.name.trim())
            .map(li => ({
              id: li.id,
              name: li.name,
              description: li.description || undefined,
              quantity: li.quantity,
              unit_price_cents: li.unit_price_cents,
              optional: li.optional,
              selected: li.optional ? li.selected : true,
            })),
          tax_rate_bps: taxRateBps,
          discount_cents: discountCents,
          terms: terms || null,
          notes: notes || null,
          valid_until: validUntil,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      if (sendAfter) {
        await fetch(`/api/quotes/${data.quote.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ via: 'both' }),
        })
      }
      router.push(`/dashboard/sales/quotes/${data.quote.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard/sales/quotes" className="text-xs text-slate-500 hover:underline">← Quotes</Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1 mb-6">New Quote</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Client + contact */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Recipient</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Existing client (optional)</label>
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

      {/* Title + description */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Quote Details</h2>
        <input
          placeholder="Quote title (e.g., Kitchen deep clean · 4 hours)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <textarea
          placeholder="Description (optional) — scope of work, assumptions, exclusions"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </section>

      {/* Line items */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-slate-900">Line Items</h2>
          <button
            onClick={addItem}
            className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
          >+ Add line</button>
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
                  type="number" step="0.25" min="0"
                  value={li.quantity}
                  onChange={e => updateItem(li.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-right"
                />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">qty</p>
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={centsToDollars(li.unit_price_cents)}
                  onChange={e => updateItem(li.id, { unit_price_cents: dollarsToCents(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-right"
                />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">unit $</p>
              </div>
              <div className="col-span-2 text-right pt-1.5 text-sm font-medium text-slate-900">
                {formatCents(Math.round(li.quantity * li.unit_price_cents))}
              </div>
              <div className="col-span-1 flex flex-col gap-1 items-end">
                <button
                  onClick={() => removeItem(li.id)}
                  disabled={items.length === 1}
                  className="text-red-400 hover:text-red-600 text-sm disabled:opacity-30"
                  aria-label={`Remove line ${idx + 1}`}
                >×</button>
                <label className="text-[10px] text-slate-500 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={li.optional}
                    onChange={e => updateItem(li.id, { optional: e.target.checked })}
                    className="w-3 h-3"
                  />
                  opt
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Tax + discount + totals */}
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Tax %</label>
            <input
              type="text"
              value={taxPct}
              onChange={e => setTaxPct(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="8.875"
            />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Discount ($)</label>
            <input
              type="text"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Valid for (days)</label>
            <input
              type="number"
              value={validUntilDays}
              onChange={e => setValidUntilDays(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
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

      {/* Terms + notes */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Terms &amp; Notes</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Terms &amp; Conditions</label>
        <textarea
          placeholder="Payment terms, warranty, cancellation policy, etc."
          value={terms}
          onChange={e => setTerms(e.target.value)}
          rows={3}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <label className="block text-xs text-slate-500 uppercase mb-1">Internal Notes (not shown to client)</label>
        <textarea
          placeholder="Visible only in admin."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </section>

      <div className="flex flex-wrap gap-2 justify-end sticky bottom-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <Link
          href="/dashboard/sales/quotes"
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
        >Cancel</Link>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >Save Draft</button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
        >{saving ? 'Saving…' : 'Save & Send'}</button>
      </div>
    </div>
  )
}
