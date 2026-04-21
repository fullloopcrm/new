'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type Field = {
  id: string
  signer_id: string
  is_mine: boolean
  type: 'signature' | 'initial' | 'date' | 'text' | 'full_name'
  page: number
  x_pct: number
  y_pct: number
  w_pct: number
  h_pct: number
  required: boolean
  label: string | null
  value: string | null
}

type Business = {
  name: string
  domain: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  primary_color: string | null
}

type Payload = {
  document: {
    id: string
    title: string
    message: string | null
    status: string
    sign_order: string
    consent_text: string
    page_count: number
    business: Business
  }
  pdf_url: string
  signer: {
    id: string
    name: string
    email: string | null
    role: string | null
    order_index: number
    status: string
    consent_accepted_at: string | null
    can_act: boolean
  }
  all_signers: { id: string; name: string; order_index: number; status: string; is_me: boolean }[]
  fields: Field[]
}

export default function SignView({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [consent, setConsent] = useState(false)
  const [pages, setPages] = useState<{ dataUrl: string; w: number; h: number }[]>([])

  // Typed values for text/date/name fields, keyed by field id
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Signature modal
  const [sigModal, setSigModal] = useState<{ fieldId: string | null; open: boolean }>({ fieldId: null, open: false })
  const [primarySigDataUrl, setPrimarySigDataUrl] = useState('') // Reused across all signature fields of this signer
  const [initialDataUrl, setInitialDataUrl] = useState('')
  const [typedName, setTypedName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const hasDrawn = useRef(false)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/documents/public/${token}`)
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Not found'); return r.json() })
      .then(payload => {
        setData(payload)
        if (payload.signer?.name) setTypedName(payload.signer.name)
        // Preload text/date defaults
        const values: Record<string, string> = {}
        for (const f of payload.fields as Field[]) {
          if (f.is_mine) {
            if (f.type === 'date' && !f.value) values[f.id] = new Date().toLocaleDateString('en-US')
            else if (f.type === 'full_name' && !f.value) values[f.id] = payload.signer.name
            else if (f.value) values[f.id] = f.value
          }
        }
        setFieldValues(values)
        setLoading(false)
      })
      .catch(e => { setErr(e.message || 'Failed'); setLoading(false) })
  }, [token])

  useEffect(() => { load() }, [load])

  // Render PDF once payload is loaded
  useEffect(() => {
    if (!data?.pdf_url) return
    let cancelled = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const task = pdfjs.getDocument({ url: data.pdf_url })
        const pdf = await task.promise
        const out: { dataUrl: string; w: number; h: number }[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.4 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          out.push({ dataUrl: canvas.toDataURL('image/png'), w: viewport.width, h: viewport.height })
        }
        if (!cancelled) setPages(out)
      } catch (e) {
        setErr('PDF render failed: ' + (e instanceof Error ? e.message : 'unknown'))
      }
    })()
    return () => { cancelled = true }
  }, [data?.pdf_url])

  // Signature canvas setup when opened
  useEffect(() => {
    if (!sigModal.open) return
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
    hasDrawn.current = false
  }, [sigModal.open])

  function canvasPt(e: React.PointerEvent<HTMLCanvasElement>) {
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
    const p = canvasPt(e)
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
    drawing.current = true
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = canvasPt(e)
    ctx.lineTo(p.x, p.y); ctx.stroke()
    hasDrawn.current = true
  }
  function onPointerUp() { drawing.current = false }
  function clearCanvas() {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    hasDrawn.current = false
  }
  function saveSig() {
    if (!hasDrawn.current) { setErr('Please draw a signature'); return }
    const c = canvasRef.current; if (!c) return
    const url = c.toDataURL('image/png')
    if (sigModal.fieldId === '__initial__') setInitialDataUrl(url)
    else setPrimarySigDataUrl(url)
    setSigModal({ fieldId: null, open: false })
  }

  async function acceptConsent() {
    setErr('')
    const res = await fetch(`/api/documents/public/${token}/consent`, { method: 'POST' })
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return }
    load()
  }

  async function submit() {
    if (!primarySigDataUrl) { setErr('Please sign at least one signature field'); return }
    if (!typedName.trim()) { setErr('Type your full legal name'); return }
    // Validate required fields
    if (!data) return
    const missing: string[] = []
    for (const f of data.fields) {
      if (!f.is_mine || !f.required) continue
      if (f.type === 'signature' && !primarySigDataUrl) missing.push('signature')
      else if (f.type === 'initial' && !initialDataUrl && !primarySigDataUrl) missing.push('initial')
      else if ((f.type === 'text' || f.type === 'date' || f.type === 'full_name') && !fieldValues[f.id]) missing.push(f.type)
    }
    if (missing.length > 0) { setErr(`Fill required: ${missing.join(', ')}`); return }

    setSubmitting(true); setErr('')
    // Build field_values payload — signature/initial fields carry PNG data URL, others carry text
    const fieldPayload = data.fields
      .filter(f => f.is_mine)
      .map(f => {
        if (f.type === 'signature') return { field_id: f.id, value: primarySigDataUrl }
        if (f.type === 'initial') return { field_id: f.id, value: initialDataUrl || primarySigDataUrl }
        return { field_id: f.id, value: fieldValues[f.id] || '' }
      })
    try {
      const res = await fetch(`/api/documents/public/${token}/sign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_png: primarySigDataUrl,
          signature_name: typedName,
          field_values: fieldPayload,
        }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error || 'Failed')
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setSubmitting(false)
  }

  async function declineSubmit() {
    setSubmitting(true); setErr('')
    try {
      const res = await fetch(`/api/documents/public/${token}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setDone(true)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  if (err && !data) return <div className="min-h-screen flex items-center justify-center"><div className="p-6 bg-white border border-slate-200 rounded-xl max-w-md text-center"><p className="text-slate-700">{err}</p></div></div>
  if (!data) return null

  const biz = data.document.business
  const primary = biz.primary_color || '#0d9488'
  const consentAccepted = !!data.signer.consent_accepted_at
  const alreadyDone = data.signer.status === 'signed' || data.signer.status === 'declined' || done

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Branded header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {biz.logo_url && <img src={biz.logo_url} alt={biz.name} className="h-8 w-8 rounded" />}
            <div>
              <p className="font-bold text-slate-900">{biz.name}</p>
              <p className="text-[10px] text-slate-500">
                {biz.phone && <span>{biz.phone}</span>}{biz.phone && biz.email && <span> · </span>}{biz.email && <span>{biz.email}</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase">Hi {data.signer.name.split(' ')[0]}</p>
            <p className="text-sm text-slate-900 font-medium truncate max-w-xs">{data.document.title}</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Status banners */}
        {alreadyDone && (
          <div className="mb-4 p-5 rounded-xl bg-green-50 border border-green-200 text-center">
            <p className="text-lg font-semibold text-green-800">
              {data.signer.status === 'declined' || (done && !primarySigDataUrl) ? 'Declined' : 'Signed — thank you'}
            </p>
            <p className="text-sm text-green-700 mt-1">
              {biz.name} has been notified.
            </p>
          </div>
        )}

        {!alreadyDone && !data.signer.can_act && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="font-semibold text-amber-800">Waiting for other signers</p>
            <p className="text-sm text-amber-700 mt-1">This document uses sequential signing. You&apos;ll be able to sign once prior signers complete their portion.</p>
          </div>
        )}

        {/* ESIGN consent gate */}
        {!alreadyDone && data.signer.can_act && !consentAccepted && (
          <div className="mb-4 p-6 rounded-xl bg-white border-2 border-teal-500">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Agreement to sign electronically</h2>
            <p className="text-sm text-slate-700 mb-4 leading-relaxed">{data.document.consent_text}</p>
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 w-4 h-4" />
              <span className="text-sm text-slate-900">I have read and agree to sign this document electronically.</span>
            </label>
            <div className="flex gap-2">
              <button onClick={acceptConsent} disabled={!consent}
                className="px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: primary }}>Agree &amp; Continue</button>
              <button onClick={() => setShowDecline(true)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Decline</button>
            </div>
          </div>
        )}

        {/* Message from sender */}
        {data.document.message && (
          <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 uppercase mb-1">Message from {biz.name}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.document.message}</p>
          </div>
        )}

        {/* Signer progress */}
        <div className="mb-4 p-3 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 flex-wrap">
            {data.all_signers.map(s => (
              <span key={s.id} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                s.is_me ? 'bg-teal-50 text-teal-700 font-semibold' :
                s.status === 'signed' ? 'bg-green-50 text-green-700' :
                s.status === 'declined' ? 'bg-red-50 text-red-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {s.is_me ? '→ ' : ''}{s.name}
                {s.status === 'signed' && <span className="text-green-600">✓</span>}
              </span>
            ))}
          </div>
        </div>

        {/* PDF + fields */}
        <div className="space-y-4">
          {pages.map((p, i) => {
            const pageNum = i + 1
            const pageFields = data.fields.filter(f => f.page === pageNum)
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">Page {pageNum}</div>
                <div className="relative select-none" style={{ aspectRatio: `${p.w} / ${p.h}` }}>
                  <img src={p.dataUrl} alt={`page ${pageNum}`} className="absolute inset-0 w-full h-full" draggable={false} />
                  {pageFields.map(f => {
                    if (!f.is_mine) {
                      // Show as grayed "owned by another signer"
                      return (
                        <div
                          key={f.id}
                          className="absolute border border-dashed border-slate-300 bg-slate-50/80 flex items-center justify-center text-[10px] text-slate-400"
                          style={{
                            left: `${f.x_pct}%`, top: `${f.y_pct}%`,
                            width: `${f.w_pct}%`, height: `${f.h_pct}%`,
                          }}
                        >
                          {f.type}
                        </div>
                      )
                    }

                    // My field
                    const filled =
                      (f.type === 'signature' && !!primarySigDataUrl) ||
                      (f.type === 'initial' && (!!initialDataUrl || !!primarySigDataUrl)) ||
                      (['text', 'date', 'full_name'].includes(f.type) && !!fieldValues[f.id])

                    return (
                      <div
                        key={f.id}
                        className={`absolute border-2 flex items-center justify-center text-xs font-medium transition-colors ${
                          consentAccepted && !alreadyDone
                            ? filled ? 'border-green-400 bg-green-50/80' : 'border-teal-500 bg-teal-50/80 cursor-pointer hover:bg-teal-100'
                            : 'border-slate-300 bg-slate-50/80'
                        }`}
                        style={{
                          left: `${f.x_pct}%`, top: `${f.y_pct}%`,
                          width: `${f.w_pct}%`, height: `${f.h_pct}%`,
                        }}
                        onClick={() => {
                          if (!consentAccepted || alreadyDone) return
                          if (f.type === 'signature') setSigModal({ fieldId: f.id, open: true })
                          else if (f.type === 'initial') setSigModal({ fieldId: '__initial__', open: true })
                        }}
                      >
                        {f.type === 'signature' && (
                          primarySigDataUrl
                            ? <img src={primarySigDataUrl} alt="" className="h-full object-contain" />
                            : <span className="text-teal-700">Sign here</span>
                        )}
                        {f.type === 'initial' && (
                          (initialDataUrl || primarySigDataUrl)
                            ? <img src={initialDataUrl || primarySigDataUrl} alt="" className="h-full object-contain" />
                            : <span className="text-teal-700">Initial</span>
                        )}
                        {f.type === 'date' && (
                          <input
                            value={fieldValues[f.id] || ''}
                            onChange={e => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                            onClick={e => e.stopPropagation()}
                            disabled={!consentAccepted || alreadyDone}
                            className="w-full h-full bg-transparent text-xs px-1 text-center"
                            placeholder="Date"
                          />
                        )}
                        {f.type === 'text' && (
                          <input
                            value={fieldValues[f.id] || ''}
                            onChange={e => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                            onClick={e => e.stopPropagation()}
                            disabled={!consentAccepted || alreadyDone}
                            className="w-full h-full bg-transparent text-xs px-1"
                            placeholder={f.label || 'Text'}
                          />
                        )}
                        {f.type === 'full_name' && (
                          <input
                            value={fieldValues[f.id] || ''}
                            onChange={e => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                            onClick={e => e.stopPropagation()}
                            disabled={!consentAccepted || alreadyDone}
                            className="w-full h-full bg-transparent text-xs px-1"
                            placeholder="Full name"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Finish bar */}
        {!alreadyDone && consentAccepted && data.signer.can_act && (
          <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4 sticky bottom-4 shadow-lg">
            <label className="block text-xs text-slate-500 uppercase mb-1">Type your full legal name</label>
            <input
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
            />
            {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDecline(true)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Decline</button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-6 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: primary }}
              >{submitting ? 'Submitting…' : 'Finish & Submit'}</button>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400 pb-8">
          Powered by Full Loop · Electronically signed documents are legally binding under the ESIGN Act.
        </footer>
      </div>

      {/* Signature modal */}
      {sigModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              {sigModal.fieldId === '__initial__' ? 'Draw your initials' : 'Draw your signature'}
            </h3>
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
            <div className="flex items-center justify-between mb-3">
              <button onClick={clearCanvas} className="text-xs text-slate-500 hover:text-slate-900">Clear</button>
              <p className="text-[10px] text-slate-400">Your signature is applied to every signature field.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSigModal({ fieldId: null, open: false })} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={saveSig} className="px-5 py-2 text-sm font-semibold rounded-lg text-white" style={{ backgroundColor: primary }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline modal */}
      {showDecline && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Decline to sign</h3>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              rows={3}
              placeholder="Optional reason"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDecline(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={declineSubmit} disabled={submitting}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
