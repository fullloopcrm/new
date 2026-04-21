'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Signer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  order_index: number
  status: string
  signed_at: string | null
}

type Field = {
  id: string
  signer_id: string
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

type Doc = {
  id: string
  title: string
  message: string | null
  status: string
  sign_order: string
  page_count: number | null
  consent_text: string
  original_sha256: string | null
  signed_sha256: string | null
  sent_at: string | null
  completed_at: string | null
}

type Activity = {
  id: string
  event_type: string
  detail: Record<string, unknown> | null
  created_at: string
}

const SIGNER_COLORS = [
  { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700', solid: 'bg-teal-500' },
  { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-700', solid: 'bg-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', solid: 'bg-amber-500' },
  { bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700', solid: 'bg-pink-500' },
  { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', solid: 'bg-sky-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', solid: 'bg-emerald-500' },
]

const FIELD_TYPES = [
  { key: 'signature', label: 'Signature', icon: '✒️' },
  { key: 'initial', label: 'Initial', icon: '✓' },
  { key: 'date', label: 'Date', icon: '📅' },
  { key: 'text', label: 'Text', icon: 'T' },
  { key: 'full_name', label: 'Name', icon: '👤' },
] as const

function signerColor(idx: number) { return SIGNER_COLORS[idx % SIGNER_COLORS.length] }

export default function DocumentEditor({ id }: { id: string }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [signers, setSigners] = useState<Signer[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pageSizes, setPageSizes] = useState<{ w: number; h: number }[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [publicUrls, setPublicUrls] = useState<Record<string, string>>({})

  // Active signer/field type for placing new fields
  const [activeSignerId, setActiveSignerId] = useState<string>('')
  const [activeFieldType, setActiveFieldType] = useState<Field['type']>('signature')

  // New signer form
  const [newSignerOpen, setNewSignerOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState('')

  const editable = doc?.status === 'draft'

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(data => {
        setDoc(data.document)
        setSigners(data.signers || [])
        setFields(data.fields || [])
        setActivity(data.activity || [])
        setPdfUrl(data.original_pdf_url)
        if (!activeSignerId && (data.signers || []).length > 0) setActiveSignerId(data.signers[0].id)
        // Build public URL map for signer per-link copy
        const urls: Record<string, string> = {}
        for (const s of (data.signers || []) as { id: string; public_token?: string }[]) {
          if (s.public_token) urls[s.id] = `${window.location.origin}/sign/${s.public_token}`
        }
        setPublicUrls(urls)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Signer ops ──
  async function addSigner() {
    if (!newName.trim()) { setErr('Name required'); return }
    setBusy('addsigner'); setErr('')
    try {
      const res = await fetch(`/api/documents/${id}/signers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail || null, phone: newPhone || null, role: newRole || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewRole(''); setNewSignerOpen(false)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }

  async function removeSigner(signerId: string) {
    if (!confirm('Remove this signer and all their fields?')) return
    await fetch(`/api/documents/${id}/signers/${signerId}`, { method: 'DELETE' })
    load()
  }

  // ── Field placement on page click ──
  async function placeFieldAt(page: number, xPct: number, yPct: number) {
    if (!editable) { setErr('Document is no longer editable'); return }
    if (!activeSignerId) { setErr('Add a signer first'); return }
    const defaults = {
      signature: { w: 28, h: 7 },
      initial: { w: 10, h: 5 },
      date: { w: 14, h: 4 },
      text: { w: 20, h: 4 },
      full_name: { w: 22, h: 4 },
    }[activeFieldType]

    const res = await fetch(`/api/documents/${id}/fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_id: activeSignerId,
        type: activeFieldType,
        page,
        x_pct: Math.max(0, Math.min(100 - defaults.w, xPct - defaults.w / 2)),
        y_pct: Math.max(0, Math.min(100 - defaults.h, yPct - defaults.h / 2)),
        w_pct: defaults.w,
        h_pct: defaults.h,
      }),
    })
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || 'Failed to place'); return }
    load()
  }

  async function removeField(fieldId: string) {
    const all = fields.filter(f => f.id !== fieldId)
    setFields(all)
    await fetch(`/api/documents/${id}/fields`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: all }),
    })
    load()
  }

  // ── Send ──
  async function sendDoc() {
    if (!confirm('Send this document to signers? After sending, you cannot edit without voiding.')) return
    setBusy('send'); setErr(''); setMsg('')
    try {
      const res = await fetch(`/api/documents/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setMsg(`Sent. SHA-256 locked: ${data.sha256?.slice(0, 12)}…`)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }

  async function voidDoc() {
    const reason = prompt('Void reason (optional):') || ''
    setBusy('void'); setErr('')
    try {
      const res = await fetch(`/api/documents/${id}/void`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setMsg('Voided'); load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }

  async function duplicateDoc() {
    setBusy('dup')
    try {
      const res = await fetch(`/api/documents/${id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push(`/dashboard/sales/documents/${data.document.id}`)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft permanently?')) return
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return }
    router.push('/dashboard/sales/documents')
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!doc) return <div className="p-8 text-slate-500 text-sm">Not found.</div>

  const activeSignerIdx = signers.findIndex(s => s.id === activeSignerId)
  const activeColor = signerColor(activeSignerIdx < 0 ? 0 : activeSignerIdx)

  return (
    <div className="max-w-[1600px] mx-auto">
      <Link href="/dashboard/sales/documents" className="text-xs text-slate-500 hover:underline">← Documents</Link>

      <div className="mt-1 mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{doc.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              doc.status === 'completed' ? 'bg-green-50 text-green-700' :
              doc.status === 'declined' ? 'bg-red-50 text-red-600' :
              doc.status === 'voided' ? 'bg-slate-100 text-slate-400' :
              doc.status === 'draft' ? 'bg-slate-100 text-slate-600' :
              'bg-blue-50 text-blue-600'
            }`}>{doc.status.replace('_', ' ')}</span>
            <span className="text-xs text-slate-500">{doc.sign_order} · {doc.page_count || '?'} page{doc.page_count === 1 ? '' : 's'}</span>
          </div>
          {doc.original_sha256 && (
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">SHA-256 {doc.original_sha256.slice(0, 32)}…</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {editable && (
            <button
              onClick={sendDoc}
              disabled={!!busy || fields.length === 0 || signers.length === 0}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >{busy === 'send' ? 'Sending…' : 'Send for Signatures'}</button>
          )}
          {!editable && doc.status !== 'completed' && doc.status !== 'voided' && (
            <button onClick={voidDoc} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">
              Void
            </button>
          )}
          {!editable && (
            <button onClick={duplicateDoc} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50">
              Duplicate
            </button>
          )}
          {editable && (
            <button onClick={deleteDraft} className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-red-200 text-red-600 hover:bg-red-50">
              Delete
            </button>
          )}
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <div className="grid grid-cols-12 gap-4">
        {/* Left sidebar — signers */}
        <aside className="col-span-3 space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-slate-900 text-sm">Signers ({signers.length})</h3>
              {editable && (
                <button onClick={() => setNewSignerOpen(v => !v)} className="text-xs text-teal-600 hover:underline">
                  {newSignerOpen ? 'Cancel' : '+ Add'}
                </button>
              )}
            </div>

            {newSignerOpen && editable && (
              <div className="space-y-2 mb-3 p-3 bg-slate-50 rounded-lg">
                <input placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm" />
                <input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm" />
                <input placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm" />
                <input placeholder="Role (optional)" value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm" />
                <button onClick={addSigner} disabled={busy === 'addsigner' || !newName.trim()}
                  className="w-full px-2 py-1 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                  Add signer
                </button>
              </div>
            )}

            <ul className="space-y-2">
              {signers.map((s, i) => {
                const c = signerColor(i)
                const isActive = s.id === activeSignerId
                const fieldCount = fields.filter(f => f.signer_id === s.id).length
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSignerId(s.id)}
                      className={`w-full text-left p-2 rounded-lg border-2 transition-colors ${
                        isActive ? `${c.border} ${c.bg}` : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.solid}`} />
                        <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{fieldCount}</span>
                      </div>
                      {s.email && <p className="text-xs text-slate-500 truncate">{s.email}</p>}
                      {s.role && <p className="text-xs text-slate-400">{s.role}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          s.status === 'signed' ? 'bg-green-50 text-green-700' :
                          s.status === 'declined' ? 'bg-red-50 text-red-600' :
                          s.status === 'viewed' ? 'bg-violet-50 text-violet-700' :
                          s.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{s.status}</span>
                        {publicUrls[s.id] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(publicUrls[s.id]); setMsg('Signer link copied') }}
                            className="text-[10px] text-teal-600 hover:underline"
                          >copy link</button>
                        )}
                      </div>
                    </button>
                    {editable && (
                      <button onClick={() => removeSigner(s.id)} className="text-[10px] text-red-500 hover:text-red-700 ml-2 mt-0.5">
                        remove
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Activity */}
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Timeline</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-400">No activity</p>
            ) : (
              <ul className="space-y-2">
                {activity.slice(0, 20).map(a => (
                  <li key={a.id} className="text-xs">
                    <p className="text-slate-700 font-medium">{a.event_type.replace('_', ' ')}</p>
                    <p className="text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* Center — PDF preview with field overlay */}
        <main className="col-span-6">
          {editable && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3 flex items-center gap-2 sticky top-2 z-10 shadow-sm">
              <span className="text-xs text-slate-500">Place:</span>
              {FIELD_TYPES.map(ft => (
                <button
                  key={ft.key}
                  onClick={() => setActiveFieldType(ft.key)}
                  disabled={!activeSignerId}
                  className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                    activeFieldType === ft.key ? `${activeColor.solid} text-white` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  } disabled:opacity-50`}
                >
                  <span>{ft.icon}</span>
                  <span>{ft.label}</span>
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-500">
                {activeSignerId ? `Click the PDF to place` : 'Add a signer first'}
              </span>
            </div>
          )}

          <PdfPreview
            pdfUrl={pdfUrl}
            fields={fields}
            signers={signers}
            editable={!!editable}
            onPlace={(p, x, y) => placeFieldAt(p, x, y)}
            onRemoveField={removeField}
            onPageSizes={setPageSizes}
          />
        </main>

        {/* Right — document settings */}
        <aside className="col-span-3 space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Document</h3>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">Signers</dt><dd className="text-slate-900">{signers.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Fields</dt><dd className="text-slate-900">{fields.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pages</dt><dd className="text-slate-900">{doc.page_count || '?'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Order</dt><dd className="text-slate-900">{doc.sign_order}</dd></div>
              {doc.sent_at && <div className="flex justify-between"><dt className="text-slate-500">Sent</dt><dd className="text-slate-900">{new Date(doc.sent_at).toLocaleDateString()}</dd></div>}
              {doc.completed_at && <div className="flex justify-between"><dt className="text-slate-500">Completed</dt><dd className="text-slate-900">{new Date(doc.completed_at).toLocaleDateString()}</dd></div>}
            </dl>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-2">ESIGN Consent</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{doc.consent_text}</p>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-2">Integrity</h3>
            <p className="text-[10px] text-slate-500 uppercase mb-1">Original SHA-256</p>
            <p className="text-[10px] text-slate-700 font-mono break-all mb-2">{doc.original_sha256 || <em className="text-slate-400 not-italic">computed on send</em>}</p>
            {doc.signed_sha256 && (
              <>
                <p className="text-[10px] text-slate-500 uppercase mb-1">Final SHA-256</p>
                <p className="text-[10px] text-slate-700 font-mono break-all">{doc.signed_sha256}</p>
              </>
            )}
          </section>
        </aside>
      </div>
      {/* pageSizes is currently measured but unused — kept in state so a future scale/zoom widget can compute at ratio */}
      <input type="hidden" data-pages={pageSizes.length} />
    </div>
  )
}

/**
 * PDF preview component — renders each PDF page as an img via pdfjs, and
 * overlays a clickable div that reports click coordinates as 0-100 pct.
 */
function PdfPreview({
  pdfUrl, fields, signers, editable, onPlace, onRemoveField, onPageSizes,
}: {
  pdfUrl: string | null
  fields: Field[]
  signers: Signer[]
  editable: boolean
  onPlace: (page: number, xPct: number, yPct: number) => void
  onRemoveField: (id: string) => void
  onPageSizes: (sizes: { w: number; h: number }[]) => void
}) {
  const [pages, setPages] = useState<{ dataUrl: string; w: number; h: number }[]>([])
  const [renderErr, setRenderErr] = useState('')
  const renderedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pdfUrl || renderedRef.current === pdfUrl) return
    renderedRef.current = pdfUrl
    let cancelled = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const task = pdfjs.getDocument({ url: pdfUrl })
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
        if (!cancelled) {
          setPages(out)
          onPageSizes(out.map(p => ({ w: p.w, h: p.h })))
        }
      } catch (e) {
        setRenderErr(e instanceof Error ? e.message : 'PDF render failed')
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl])

  function onClickPage(e: React.MouseEvent<HTMLDivElement>, page: number) {
    if (!editable) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    onPlace(page, xPct, yPct)
  }

  if (renderErr) return <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">PDF render failed: {renderErr}</div>
  if (pages.length === 0) return <div className="p-8 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">Rendering PDF…</div>

  return (
    <div className="space-y-4">
      {pages.map((p, i) => {
        const pageNum = i + 1
        const pageFields = fields.filter(f => f.page === pageNum)
        return (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">Page {pageNum}</div>
            <div
              onClick={(e) => onClickPage(e, pageNum)}
              className={`relative select-none ${editable ? 'cursor-crosshair' : ''}`}
              style={{ aspectRatio: `${p.w} / ${p.h}` }}
            >
              <img src={p.dataUrl} alt={`page ${pageNum}`} className="absolute inset-0 w-full h-full" draggable={false} />
              {pageFields.map(f => {
                const idx = signers.findIndex(s => s.id === f.signer_id)
                const c = signerColor(idx < 0 ? 0 : idx)
                return (
                  <div
                    key={f.id}
                    onClick={(e) => { e.stopPropagation(); if (editable) onRemoveField(f.id) }}
                    className={`absolute border-2 ${c.border} ${c.bg} flex items-center justify-center text-xs ${c.text} font-medium ${editable ? 'hover:opacity-70 cursor-pointer' : ''}`}
                    style={{
                      left: `${f.x_pct}%`,
                      top: `${f.y_pct}%`,
                      width: `${f.w_pct}%`,
                      height: `${f.h_pct}%`,
                    }}
                    title={editable ? 'Click to remove' : `${f.type} · ${signers[idx]?.name || 'unknown'}`}
                  >
                    {f.type}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
