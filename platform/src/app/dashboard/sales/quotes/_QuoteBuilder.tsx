'use client'

/**
 * The proposal builder — recipient, details, line items (catalog-fed), tax /
 * discount / deposit, terms. Extracted from the old full-page /quotes/new so it
 * can render inside a modal.
 *
 * Autosave: the moment the proposal is "meaningful" (a title or a named line),
 * it lazily POSTs a draft, then debounce-PATCHes on every later edit. The draft
 * therefore survives closing the modal — Cancel does not discard it.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import HelpTip from '../../_components/HelpTip'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }
type CatalogItem = { id: string; name: string; description: string | null; price_cents: number; per_unit: string; item_type: string; category: string | null; default_duration_hours: number | null }

type LineItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit_price_cents: number
  optional: boolean
  selected: boolean
  /** Estimated hours for this line, seeded from the catalog item's Est.
   * hrs at add-time. Summed across accepted lines to prefill the Schedule
   * panel's Proposal Budgeted Hours. */
  duration_hours?: number
}

function blankLine(): LineItem {
  return { id: `li_${Math.random().toString(36).slice(2, 10)}`, name: '', description: '', quantity: 1, unit_price_cents: 0, optional: false, selected: true }
}
function centsToDollars(cents: number): string { return (cents / 100).toFixed(2) }
function dollarsToCents(str: string): number { const n = parseFloat(String(str).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
function formatCents(cents: number): string { return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface QuoteBuilderProps {
  dealId: string | null
  clientIdInit: string | null
  onCancel: () => void
  /** Called after Save & Send with the persisted quote id. */
  onSaved: (quoteId: string) => void
}

export default function QuoteBuilder({ dealId, clientIdInit, onCancel, onSaved }: QuoteBuilderProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState<string>(clientIdInit || '')
  const [catalog, setCatalog] = useState<CatalogItem[]>([])

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [jobNotes, setJobNotes] = useState('')

  const [items, setItems] = useState<LineItem[]>([blankLine()])
  const [taxPct, setTaxPct] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [depositType, setDepositType] = useState<'none' | 'flat' | 'percent'>('none')
  const [depositValue, setDepositValue] = useState('')

  // Recurring service? 'none' = one-off. A cadence makes the sale spin up a
  // recurring_schedules series on close instead of a single booking/job.
  const [recurringType, setRecurringType] = useState<'none' | 'weekly' | 'biweekly' | 'triweekly' | 'monthly_date'>('none')
  const [recurringStart, setRecurringStart] = useState('')
  const [recurringTime, setRecurringTime] = useState('09:00')
  const [recurringHours, setRecurringHours] = useState('')

  // When accepted, route to Bookings (service) or the Job board (project).
  const [fulfillment, setFulfillment] = useState<'project' | 'booking'>('project')

  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [validUntilDays, setValidUntilDays] = useState('30')

  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Autosave bookkeeping.
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const quoteIdRef = useRef<string | null>(null)
  quoteIdRef.current = quoteId

  useEffect(() => {
    fetch('/api/clients?limit=500').then(r => r.json())
      .then(data => setClients(Array.isArray(data) ? data : data.clients || [])).catch(() => {})
    fetch('/api/catalog').then(r => r.json())
      .then(data => setCatalog((data?.items || []).filter((i: { active?: boolean }) => i.active !== false))).catch(() => {})
    // Prefill tax / valid-days / deposit / terms from the tenant's Sales &
    // Proposals defaults. Functional guards ensure we never overwrite a value
    // the operator has already changed (e.g. if settings resolves late).
    fetch('/api/settings').then(r => r.json()).then(data => {
      const cfg = (data?.tenant?.selena_config || {}) as Record<string, unknown>
      if (cfg.tax_rate != null) setTaxPct(prev => (prev === '0' ? String(cfg.tax_rate) : prev))
      if (cfg.proposal_valid_days != null) setValidUntilDays(prev => (prev === '30' ? String(cfg.proposal_valid_days) : prev))
      if (cfg.proposal_terms) setTerms(prev => (prev === '' ? String(cfg.proposal_terms) : prev))
      const dtype = ['percent', 'flat'].includes(cfg.proposal_deposit_type as string) ? (cfg.proposal_deposit_type as 'percent' | 'flat') : 'none'
      if (dtype !== 'none') {
        setDepositType(prev => (prev === 'none' ? dtype : prev))
        if (cfg.proposal_deposit_value != null) setDepositValue(prev => (prev === '' ? String(cfg.proposal_deposit_value) : prev))
      }
    }).catch(() => {})
  }, [])

  // Prefill from the originating deal (client + a starter title).
  useEffect(() => {
    if (!dealId) return
    fetch(`/api/deals/${dealId}`).then(r => r.json()).then(data => {
      const deal = data?.deal
      if (!deal) return
      if (deal.client_id) setClientId(deal.client_id)
      if (deal.title) setTitle(prev => prev || deal.title)
    }).catch(() => {})
  }, [dealId])

  // When client picked, prefill contact fields (only empties).
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

  function addFromCatalog(itemId: string) {
    const it = catalog.find(c => c.id === itemId)
    if (!it) return
    setItems(prev => [
      ...prev.filter(li => li.name.trim() || li.unit_price_cents),
      { ...blankLine(), name: it.name, description: it.description || '', unit_price_cents: it.price_cents, duration_hours: it.default_duration_hours ?? undefined },
    ])
    // Preset the proposal-level description from the catalog item's own
    // description -- but only while it's still untouched. Once the operator
    // has typed or a prior catalog pick has already set it, further catalog
    // adds must not clobber it; job-specific detail belongs in Job Notes
    // instead, which never touches this field.
    if (it.description) setDescription(prev => (prev.trim() === '' ? it.description as string : prev))
  }
  function updateItem(id: string, patch: Partial<LineItem>) { setItems(prev => prev.map(li => (li.id === id ? { ...li, ...patch } : li))) }
  function addItem() { setItems(prev => [...prev, blankLine()]) }
  function removeItem(id: string) { setItems(prev => prev.filter(li => li.id !== id)) }

  const subtotalCents = items.filter(li => !li.optional || li.selected).reduce((acc, li) => acc + Math.round(li.quantity * li.unit_price_cents), 0)
  const taxRateBps = Math.round(parseFloat(taxPct || '0') * 100)
  const discountCents = dollarsToCents(discount)
  const taxable = Math.max(0, subtotalCents - discountCents)
  const taxCents = Math.round((taxable * taxRateBps) / 10000)
  const totalCents = taxable + taxCents

  const depositValueForApi =
    depositType === 'flat' ? dollarsToCents(depositValue)
    : depositType === 'percent' ? Math.round(parseFloat(depositValue || '0') * 100)
    : 0
  const depositCents =
    depositType === 'flat' ? Math.min(depositValueForApi, totalCents)
    : depositType === 'percent' ? Math.round((totalCents * depositValueForApi) / 10000)
    : 0

  // The write body — identical shape for create (POST) and update (PATCH).
  const body = useMemo(() => {
    const validUntil = validUntilDays ? new Date(Date.now() + parseInt(validUntilDays) * 86400000).toISOString().slice(0, 10) : null
    return {
      client_id: clientId || null,
      deal_id: dealId || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      service_address: serviceAddress || null,
      title,
      description: description || null,
      job_notes: jobNotes || null,
      line_items: items.filter(li => li.name.trim()).map(li => ({
        id: li.id, name: li.name, description: li.description || undefined,
        quantity: li.quantity, unit_price_cents: li.unit_price_cents,
        optional: li.optional, selected: li.optional ? li.selected : true,
        duration_hours: li.duration_hours,
      })),
      tax_rate_bps: taxRateBps,
      discount_cents: discountCents,
      deposit_type: depositType,
      deposit_value: depositValueForApi,
      recurring_type: recurringType === 'none' ? null : recurringType,
      recurring_start_date: recurringType === 'none' ? null : recurringStart || null,
      recurring_preferred_time: recurringType === 'none' ? null : recurringTime || null,
      recurring_duration_hours: recurringType === 'none' ? null : recurringHours ? Number(recurringHours) : null,
      fulfillment_type: recurringType !== 'none' ? 'booking' : fulfillment,
      terms: terms || null,
      notes: notes || null,
      valid_until: validUntil,
    }
  }, [clientId, dealId, contactName, contactEmail, contactPhone, serviceAddress, title, description, jobNotes, items, taxRateBps, discountCents, depositType, depositValueForApi, recurringType, recurringStart, recurringTime, recurringHours, fulfillment, terms, notes, validUntilDays])

  const meaningful = title.trim().length > 0 || items.some(li => li.name.trim().length > 0)

  /** Persist the current body — create the draft on first call, PATCH after.
   * silent:true keeps drafts off the deal pipeline + activity log until sent. */
  async function persist(payload: typeof body): Promise<string | null> {
    const id = quoteIdRef.current
    const wire = JSON.stringify({ ...payload, silent: true })
    const res = id
      ? await fetch(`/api/quotes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: wire })
      : await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: wire })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Save failed')
    const newId = (data.quote?.id as string) || id
    if (newId && newId !== quoteIdRef.current) { quoteIdRef.current = newId; setQuoteId(newId) }
    return newId
  }

  /** Debounced autosave. Coalesces edits that land during an in-flight save. */
  async function runAutosave() {
    if (savingRef.current) { pendingRef.current = true; return }
    savingRef.current = true
    setSaveState('saving')
    try {
      await persist(body)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    } finally {
      savingRef.current = false
      if (pendingRef.current) { pendingRef.current = false; void runAutosave() }
    }
  }

  const bodyJson = JSON.stringify(body)
  useEffect(() => {
    if (!meaningful || sending) return
    const t = setTimeout(() => { void runAutosave() }, 1200)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyJson])

  async function saveAndSend() {
    setError('')
    if (!title.trim()) { setError('Title required'); return }
    if (items.filter(li => li.name.trim()).length === 0) { setError('At least one line item'); return }
    setSending(true)
    try {
      const id = await persist(body)
      if (!id) throw new Error('Could not save proposal')
      await fetch(`/api/quotes/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ via: 'both' }) })
      onSaved(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
      setSending(false)
    }
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving…'
    : saveState === 'saved' ? 'Draft saved'
    : saveState === 'error' ? 'Save failed — retrying on next edit'
    : quoteId ? 'Draft' : 'Not saved yet'

  return (
    <div>
      {error && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {/* Recipient */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Recipient</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Existing client (optional)</label>
        <select value={clientId} onChange={e => setClientId(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4">
          <option value="">— Standalone (no client yet) —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>)}
        </select>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Name" value={contactName} onChange={e => setContactName(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Service address" value={serviceAddress} onChange={e => setServiceAddress(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      {/* Details */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Quote Details</h2>
        <input placeholder="Quote title (e.g., Kitchen deep clean · 4 hours)" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
        <textarea placeholder="Description — auto-fills from the catalog item's own description when you add one from catalog below; edit freely" value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
        <label className="block text-xs text-slate-500 uppercase mb-1">Job Notes (shown to client, below the description)</label>
        <textarea placeholder="Anything specific to this job — access instructions, special requests, exceptions to the standard scope above" value={jobNotes} onChange={e => setJobNotes(e.target.value)} rows={3}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </section>

      {/* Line items */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-slate-900">Line Items</h2>
          <div className="flex items-center gap-2">
            {catalog.length > 0 && (
              <select value="" onChange={e => { if (e.target.value) { addFromCatalog(e.target.value); e.target.value = '' } }}
                className="text-xs px-2 py-1 bg-white border border-slate-300 rounded text-slate-700">
                <option value="">+ From catalog…</option>
                {catalog.map(c => <option key={c.id} value={c.id}>{c.name} — {formatCents(c.price_cents)}/{c.per_unit}</option>)}
              </select>
            )}
            <button onClick={addItem} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700">+ Add line</button>
          </div>
        </div>

        <datalist id="sku-catalog">
          {catalog.map(c => <option key={c.id} value={c.name}>{`${formatCents(c.price_cents)} / ${c.per_unit}${c.category ? ` · ${c.category}` : ''}`}</option>)}
        </datalist>

        <div className="space-y-2">
          {items.map((li, idx) => (
            <div key={li.id} className="grid grid-cols-12 gap-2 items-start bg-slate-50 rounded-lg p-3">
              <div className="col-span-5">
                <input placeholder="Item name — type to search catalog" list="sku-catalog" value={li.name}
                  onChange={e => {
                    const v = e.target.value
                    const match = catalog.find(c => c.name.toLowerCase() === v.trim().toLowerCase())
                    if (match) updateItem(li.id, { name: match.name, unit_price_cents: match.price_cents, description: li.description || match.description || '' })
                    else updateItem(li.id, { name: v })
                  }}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm mb-1" />
                <input placeholder="Description (optional)" value={li.description} onChange={e => updateItem(li.id, { description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600" />
              </div>
              <div className="col-span-2">
                <input type="number" step="0.25" min="0" value={li.quantity} onChange={e => updateItem(li.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-right" />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">qty</p>
              </div>
              <div className="col-span-2">
                <input type="text" value={centsToDollars(li.unit_price_cents)} onChange={e => updateItem(li.id, { unit_price_cents: dollarsToCents(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-right" />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">unit $</p>
              </div>
              <div className="col-span-2 text-right pt-1.5 text-sm font-medium text-slate-900">{formatCents(Math.round(li.quantity * li.unit_price_cents))}</div>
              <div className="col-span-1 flex flex-col gap-1 items-end">
                <button onClick={() => removeItem(li.id)} disabled={items.length === 1} className="text-red-400 hover:text-red-600 text-sm disabled:opacity-30" aria-label={`Remove line ${idx + 1}`}>×</button>
                <label className="text-[10px] text-slate-500 flex items-center gap-1">
                  <input type="checkbox" checked={li.optional} onChange={e => updateItem(li.id, { optional: e.target.checked })} className="w-3 h-3" />opt
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Tax + discount + totals */}
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Tax % <HelpTip text="Applied to taxable line items only. Prefilled from Settings → Sales; change it per proposal." /></label>
            <input type="text" value={taxPct} onChange={e => setTaxPct(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="8.875" />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Discount ($) <HelpTip text="A flat dollar amount taken off the subtotal before tax." /></label>
            <input type="text" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Valid for (days) <HelpTip text="How long the customer has to accept before the proposal expires." /></label>
            <input type="number" value={validUntilDays} onChange={e => setValidUntilDays(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Deposit <HelpTip text="An upfront amount the customer pays to accept — a % of the total or a flat $. If set, the deal waits at Pending until it's paid, then closes to Sold." /></label>
            <div className="flex gap-2">
              <select value={depositType} onChange={e => setDepositType(e.target.value as 'none' | 'flat' | 'percent')} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="none">No deposit</option>
                <option value="percent">% of total</option>
                <option value="flat">Flat $</option>
              </select>
              {depositType !== 'none' && (
                <input type="text" value={depositValue} onChange={e => setDepositValue(e.target.value)} placeholder={depositType === 'percent' ? '25' : '500'}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              )}
            </div>
            <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Recurring service <HelpTip text="For repeat visits (weekly cleaning, monthly pest, etc.). On accept this auto-sets the recurring schedule instead of a one-off — the price above is per visit." /></label>
            <select value={recurringType} onChange={e => setRecurringType(e.target.value as typeof recurringType)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="none">One-time (no repeat)</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="triweekly">Every 3 weeks</option>
              <option value="monthly_date">Monthly</option>
            </select>
            {recurringType !== 'none' && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">First visit</label>
                  <input type="date" value={recurringStart} onChange={e => setRecurringStart(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Time</label>
                  <input type="time" value={recurringTime} onChange={e => setRecurringTime(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Hours/visit</label>
                  <input type="text" inputMode="decimal" value={recurringHours} onChange={e => setRecurringHours(e.target.value.replace(/[^\d.]/g, ''))} placeholder="3" className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-sm" />
                </div>
              </div>
            )}
            {recurringType === 'none' && (
              <>
                <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">When accepted <HelpTip text="Project → lands on the Job board (multi-session work like a remodel). Service booking → lands in Bookings (a scheduled visit)." /></label>
                <select value={fulfillment} onChange={e => setFulfillment(e.target.value as 'project' | 'booking')} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="project">Project — goes to the Job board</option>
                  <option value="booking">Service booking — goes to Bookings</option>
                </select>
              </>
            )}
          </div>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCents(subtotalCents)}</span></div>
            {discountCents > 0 && <div className="flex justify-between text-slate-600"><span>Discount</span><span>−{formatCents(discountCents)}</span></div>}
            {taxRateBps > 0 && <div className="flex justify-between text-slate-600"><span>Tax ({taxPct}%)</span><span>{formatCents(taxCents)}</span></div>}
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-base"><span>Total</span><span>{formatCents(totalCents)}</span></div>
            {depositCents > 0 && <div className="flex justify-between text-teal-700 font-medium pt-1"><span>Deposit due now</span><span>{formatCents(depositCents)}</span></div>}
          </div>
        </div>
      </section>

      {/* Terms + notes */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Terms &amp; Notes</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Terms &amp; Conditions</label>
        <textarea placeholder="Payment terms, warranty, cancellation policy, etc." value={terms} onChange={e => setTerms(e.target.value)} rows={3}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
        <label className="block text-xs text-slate-500 uppercase mb-1">Internal Notes (not shown to client)</label>
        <textarea placeholder="Visible only in admin." value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </section>

      <div className="flex flex-wrap items-center gap-3 justify-end sticky bottom-0 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <span className={`text-xs mr-auto ${saveState === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
          {saveState === 'saving' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse mr-1.5 align-middle" />}
          {saveLabel}
        </span>
        <button onClick={onCancel} disabled={sending} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50">Cancel</button>
        <button onClick={saveAndSend} disabled={sending} className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
          {sending ? 'Sending…' : 'Save & Send'}
        </button>
      </div>
    </div>
  )
}
