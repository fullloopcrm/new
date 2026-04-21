'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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

type Business = {
  name: string
  slug: string
  domain: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  primary_color: string | null
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
  accepted_at: string | null
  declined_at: string | null
  signature_name: string | null
  business: Business
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function QuoteView({ token }: { token: string }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Accept flow
  const [showAccept, setShowAccept] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [declined, setDeclined] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const hasDrawn = useRef(false)

  useEffect(() => {
    fetch(`/api/quotes/public/${token}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || 'Not found')
        return r.json()
      })
      .then(data => { setQuote(data.quote); setLoading(false) })
      .catch(e => { setErr(e.message || 'Failed'); setLoading(false) })
  }, [token])

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    hasDrawn.current = false
  }, [])

  useEffect(() => {
    if (!showAccept) return
    // Set up canvas scaled for retina
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * dpr
    c.height = rect.height * dpr
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [showAccept])

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const c = canvasRef.current
    if (!c) return
    c.setPointerCapture(e.pointerId)
    const ctx = c.getContext('2d')
    if (!ctx) return
    const p = canvasPoint(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    isDrawing.current = true
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = canvasPoint(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    hasDrawn.current = true
  }
  function onPointerUp() { isDrawing.current = false }

  async function submitAccept() {
    if (!hasDrawn.current) { setErr('Please sign in the box'); return }
    if (!signatureName.trim()) { setErr('Please type your name'); return }
    const c = canvasRef.current
    if (!c) return
    const dataUrl = c.toDataURL('image/png')
    setSubmitting(true); setErr('')
    try {
      const res = await fetch(`/api/quotes/public/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_png: dataUrl, signature_name: signatureName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAccepted(true)
      setShowAccept(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to accept')
    }
    setSubmitting(false)
  }

  async function submitDecline() {
    setSubmitting(true); setErr('')
    try {
      const res = await fetch(`/api/quotes/public/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setDeclined(true)
      setShowDecline(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  if (err && !quote) return <div className="min-h-screen flex items-center justify-center"><div className="p-6 bg-white border border-slate-200 rounded-xl max-w-md text-center"><p className="text-slate-700">{err}</p></div></div>
  if (!quote) return null

  const biz = quote.business
  const primary = biz.primary_color || '#0d9488'
  const isFinalized = accepted || declined || ['accepted', 'declined', 'converted', 'expired'].includes(quote.status)

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
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
            <p className="text-xs text-slate-400 uppercase tracking-wide">Quote</p>
            <p className="font-mono text-slate-900 font-semibold">{quote.quote_number}</p>
          </div>
        </header>

        {/* Status banners */}
        {(accepted || quote.status === 'accepted' || quote.status === 'converted') && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="font-semibold text-green-800">Quote accepted</p>
            {quote.signature_name && <p className="text-sm text-green-700">Signed by {quote.signature_name}</p>}
            <p className="text-xs text-green-700 mt-1">Thanks — you&apos;ll be contacted shortly to schedule.</p>
          </div>
        )}
        {(declined || quote.status === 'declined') && (
          <div className="mb-4 p-4 rounded-xl bg-slate-100 border border-slate-200">
            <p className="font-semibold text-slate-700">Quote declined</p>
            <p className="text-xs text-slate-500 mt-1">No further action needed.</p>
          </div>
        )}
        {quote.status === 'expired' && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="font-semibold text-amber-800">This quote has expired</p>
            <p className="text-xs text-amber-700 mt-1">Contact {biz.name} to request a new quote.</p>
          </div>
        )}

        {/* Main card */}
        <main className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-6 border-b border-slate-200" style={{ borderTopColor: primary }}>
            <h1 className="text-2xl font-bold text-slate-900">{quote.title || 'Quote'}</h1>
            {quote.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{quote.description}</p>}
          </div>

          {/* Recipient block */}
          <div className="px-6 py-4 bg-slate-50 text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Prepared for</p>
              <p className="font-medium">{quote.contact_name || '—'}</p>
              {quote.contact_email && <p className="text-xs text-slate-500">{quote.contact_email}</p>}
              {quote.contact_phone && <p className="text-xs text-slate-500">{quote.contact_phone}</p>}
            </div>
            {quote.service_address && (
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Service address</p>
                <p>{quote.service_address}</p>
              </div>
            )}
          </div>

          {/* Line items */}
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
              {(quote.line_items || []).map(li => (
                <tr key={li.id} className={li.optional && !li.selected ? 'text-slate-400' : ''}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">
                      {li.name}
                      {li.optional && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-100 rounded uppercase">optional</span>}
                    </p>
                    {li.description && <p className="text-xs text-slate-500 mt-0.5">{li.description}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">{li.quantity}</td>
                  <td className="px-6 py-3 text-right">{formatCents(li.unit_price_cents)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCents(li.subtotal_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-6 py-2 text-right text-slate-600">Subtotal</td>
                <td className="px-6 py-2 text-right">{formatCents(quote.subtotal_cents)}</td>
              </tr>
              {quote.discount_cents > 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-2 text-right text-slate-600">Discount</td>
                  <td className="px-6 py-2 text-right">−{formatCents(quote.discount_cents)}</td>
                </tr>
              )}
              {quote.tax_cents > 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-2 text-right text-slate-600">Tax</td>
                  <td className="px-6 py-2 text-right">{formatCents(quote.tax_cents)}</td>
                </tr>
              )}
              <tr className="font-bold text-slate-900 border-t border-slate-200">
                <td colSpan={3} className="px-6 py-3 text-right text-base">Total</td>
                <td className="px-6 py-3 text-right text-xl" style={{ color: primary }}>{formatCents(quote.total_cents)}</td>
              </tr>
            </tfoot>
          </table>

          {quote.terms && (
            <div className="px-6 py-5 border-t border-slate-200 bg-white">
              <h3 className="font-semibold text-slate-900 mb-2 text-xs uppercase tracking-wide">Terms &amp; Conditions</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{quote.terms}</p>
            </div>
          )}

          {quote.valid_until && !isFinalized && (
            <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-center">
              <p className="text-sm text-amber-800">
                Valid until <strong>{new Date(quote.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!isFinalized && (
            <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => setShowDecline(true)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              >Decline</button>
              <button
                onClick={() => setShowAccept(true)}
                className="px-6 py-2.5 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: primary }}
              >Accept &amp; Sign</button>
            </div>
          )}
        </main>

        <footer className="mt-6 text-center text-xs text-slate-400">
          Powered by Full Loop
        </footer>
      </div>

      {/* Accept modal */}
      {showAccept && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Sign to accept</h3>
            <p className="text-xs text-slate-500 mb-4">Type your name and sign below. By accepting you agree to the terms and authorize {biz.name} to proceed.</p>

            <label className="block text-xs text-slate-500 uppercase mb-1">Your name</label>
            <input
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
            />

            <label className="block text-xs text-slate-500 uppercase mb-1">Signature</label>
            <div className="border border-slate-300 rounded-lg bg-white overflow-hidden mb-2">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="w-full h-36 touch-none cursor-crosshair"
                style={{ display: 'block' }}
              />
            </div>
            <div className="flex justify-between items-center mb-4">
              <button onClick={clearCanvas} className="text-xs text-slate-500 hover:text-slate-900">Clear</button>
              <p className="text-[10px] text-slate-400">Sign with finger, stylus, or mouse</p>
            </div>

            {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAccept(false); setErr('') }}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100"
              >Cancel</button>
              <button
                onClick={submitAccept}
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >{submitting ? 'Submitting…' : 'Accept'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Decline modal */}
      {showDecline && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Decline quote</h3>
            <p className="text-xs text-slate-500 mb-4">Help us improve — a short note would mean a lot.</p>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              rows={3}
              placeholder="Optional reason"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
            />
            {err && <p className="text-xs text-red-600 mb-3">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDecline(false); setErr('') }}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100"
              >Cancel</button>
              <button
                onClick={submitDecline}
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white disabled:opacity-60"
              >{submitting ? 'Submitting…' : 'Decline'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
