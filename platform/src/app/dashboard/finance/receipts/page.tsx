'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type CoA = { id: string; code: string; name: string; type: string; is_bank_account: boolean; subtype: string | null }

type Extracted = {
  vendor: string | null
  amount_cents: number | null
  date: string | null
  tax_cents: number | null
  subtotal_cents: number | null
  line_items: { description: string; amount_cents: number }[]
  category_hint: string | null
  confidence: number
}

type Match = {
  txn_id: string
  txn_date: string
  txn_description: string
  txn_amount_cents: number
  confidence: number
} | null

type ReceiptResult = {
  path: string
  preview_url: string | null
  extracted: Extracted
  match: Match
}

function formatCents(c: number | null): string {
  if (c == null) return '—'
  return ((c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function ReceiptsPage() {
  const [coas, setCoas] = useState<CoA[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [results, setResults] = useState<ReceiptResult[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [attached, setAttached] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/finance/chart-of-accounts').then(r => r.json()).then(d => setCoas(d.accounts || []))
  }, [])

  const upload = useCallback(async (file: File) => {
    setErr('')
    const fd = new FormData()
    fd.set('file', file)
    const res = await fetch('/api/finance/receipts', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setErr(data.error || 'Upload failed'); return }
    setResults(prev => [data, ...prev])
  }, [])

  async function uploadMany(files: FileList) {
    setBusy(true)
    for (const f of Array.from(files)) await upload(f)
    setBusy(false)
  }

  async function attachMatch(r: ReceiptResult, coaId?: string) {
    if (!r.match) return
    const key = r.path
    const res = await fetch('/api/finance/receipts/attach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank_transaction_id: r.match.txn_id,
        receipt_path: r.path,
        extracted: r.extracted,
        coa_id: coaId || null,
      }),
    })
    if (!res.ok) { alert((await res.json()).error || 'Failed'); return }
    setAttached(prev => { const next = new Set(prev); next.add(key); return next })
  }

  const postable = coas.filter(c => !c.is_bank_account)

  // Pick a sensible default CoA based on category_hint → subtype/name heuristic
  function defaultCoaFor(hint: string | null): CoA | null {
    if (!hint) return null
    const h = hint.toLowerCase()
    const wanted = postable.find(c =>
      c.subtype === h || c.name.toLowerCase().includes(h.replace(/_/g, ' '))
    )
    return wanted || null
  }

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="mt-1 mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Receipts</h1>
          <p className="text-sm text-slate-500">Drop a receipt photo. AI extracts fields + matches it to a bank transaction.</p>
        </div>
        <Link href="/dashboard/finance/transactions" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
          Transactions →
        </Link>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {/* Drop zone */}
      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) uploadMany(e.dataTransfer.files) }}
        className={`block mb-6 p-10 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors ${
          dragOver ? 'border-teal-500 bg-teal-50' : busy ? 'border-slate-300 bg-slate-50' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files?.length) uploadMany(e.target.files) }}
        />
        <p className="text-3xl mb-2">📸</p>
        <p className="text-sm font-medium text-slate-900">
          {busy ? 'Processing…' : dragOver ? 'Drop to upload' : 'Drop receipts here or click to pick files'}
        </p>
        <p className="text-xs text-slate-500 mt-1">JPG · PNG · WEBP · up to 8 MB · multiple OK</p>
      </label>

      {/* Results */}
      {results.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No receipts uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const isAttached = attached.has(r.path)
            const suggested = defaultCoaFor(r.extracted.category_hint)
            const confColor =
              (r.match?.confidence || 0) >= 0.85 ? 'text-green-700 bg-green-50 border-green-200' :
              (r.match?.confidence || 0) >= 0.6 ? 'text-amber-700 bg-amber-50 border-amber-200' :
              'text-slate-600 bg-slate-100 border-slate-200'
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex">
                {r.preview_url && (
                  <div className="w-40 flex-shrink-0 bg-slate-50 flex items-center justify-center p-2">
                    <img src={r.preview_url} alt="receipt" className="max-h-40 max-w-full object-contain" />
                  </div>
                )}
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">{r.extracted.vendor || 'Unknown vendor'}</p>
                    <p className="text-xs text-slate-500">{r.extracted.date || 'no date'}</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">{formatCents(r.extracted.amount_cents)}</p>
                  {r.extracted.category_hint && (
                    <p className="text-xs text-slate-500 mb-2">
                      AI category hint: <span className="text-slate-700 font-medium capitalize">{r.extracted.category_hint.replace(/_/g, ' ')}</span>
                      {suggested && <span className="text-slate-400"> → {suggested.code} · {suggested.name}</span>}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mb-3">Extraction confidence: {Math.round(r.extracted.confidence * 100)}%</p>

                  {r.match ? (
                    <div className={`p-3 rounded border ${confColor} mb-3`}>
                      <p className="text-xs uppercase tracking-wide mb-0.5">Matched bank transaction</p>
                      <p className="text-sm font-medium">{r.match.txn_description}</p>
                      <p className="text-xs">{r.match.txn_date} · {formatCents(r.match.txn_amount_cents)} · {Math.round(r.match.confidence * 100)}% match</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mb-3">No matching bank transaction found within ±5 days and ±$0.50. Kept as standalone.</p>
                  )}

                  {isAttached ? (
                    <p className="text-xs text-green-700 font-medium">✓ Attached</p>
                  ) : r.match ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => attachMatch(r, suggested?.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700"
                      >
                        Attach &amp; Post{suggested ? ` as ${suggested.code}` : ''}
                      </button>
                      <button
                        onClick={() => attachMatch(r)}
                        className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-slate-300 hover:bg-slate-50"
                      >
                        Attach Only
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
