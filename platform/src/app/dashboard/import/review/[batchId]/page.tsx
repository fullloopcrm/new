'use client'

/**
 * Import batch review — the operator sees what an upload WILL do (matched / new /
 * duplicate / unmatched / rejected) before anything touches live tables, then
 * Commits, and can Undo the whole batch if it was wrong.
 */
import { use, useCallback, useEffect, useState } from 'react'

type MatchStatus = 'new' | 'matched' | 'duplicate' | 'unmatched' | 'rejected'
interface Row { id: string; row_index: number; mapped: Record<string, unknown>; raw: Record<string, unknown>; match_status: MatchStatus; match_detail?: string; target_table?: string; target_id: string | null }
interface Review {
  batch: { id: string; kind: string; status: string; source_filename: string | null; total_rows: number; committed_rows: number; created_at: string }
  counts: Record<MatchStatus, number>
  rows: Row[]
}

const STATUS_STYLE: Record<MatchStatus, string> = {
  new: 'bg-green-50 text-green-700', matched: 'bg-teal-50 text-teal-700',
  duplicate: 'bg-amber-50 text-amber-700', unmatched: 'bg-orange-50 text-orange-700',
  rejected: 'bg-red-50 text-red-600',
}
const WILL_WRITE: MatchStatus[] = ['new', 'matched']

export default function BatchReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params)
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/dashboard/import/batch/${batchId}`, { credentials: 'include' })
    if (!r.ok) { setErr(`Failed to load (HTTP ${r.status})`); setLoading(false); return }
    setReview((await r.json()).review); setLoading(false)
  }, [batchId])
  useEffect(() => { load() }, [load])

  const act = async (action: 'commit' | 'undo') => {
    setBusy(true); setErr(''); setMsg('')
    const r = await fetch(`/api/dashboard/import/batch/${batchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action }),
    })
    const d = await r.json()
    setBusy(false)
    if (!r.ok) { setErr(d.error || 'Action failed'); return }
    setReview(d.review)
    setMsg(action === 'commit' ? `Committed ${d.result?.committed ?? 0} rows.` : `Undone — ${d.result?.removed ?? 0} rows removed.`)
  }

  if (loading) return <p className="p-8 text-slate-500">Loading batch…</p>
  if (err && !review) return <p className="p-8 text-red-600">{err}</p>
  if (!review) return null

  const willWrite = WILL_WRITE.reduce((n, s) => n + (review.counts[s] || 0), 0)
  const staged = review.batch.status === 'staged'
  const committed = review.batch.status === 'committed'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900">Review import</h1>
      <p className="mb-6 text-sm text-slate-500">
        {review.batch.kind} · {review.batch.source_filename || 'upload'} · {review.batch.total_rows} rows · status: <strong>{review.batch.status}</strong>
      </p>

      {/* Bucket summary */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(review.counts) as MatchStatus[]).map((s) => (
          <span key={s} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${STATUS_STYLE[s]}`}>
            {review.counts[s]} {s}
          </span>
        ))}
      </div>

      {msg && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}
      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}

      {/* Actions */}
      <div className="mb-6 flex items-center gap-3">
        {staged && (
          <button onClick={() => act('commit')} disabled={busy || willWrite === 0}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-cta font-bold text-white hover:bg-teal-500 disabled:opacity-40">
            {busy ? 'Committing…' : `Commit ${willWrite} rows`}
          </button>
        )}
        {committed && (
          <button onClick={() => act('undo')} disabled={busy}
            className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-cta font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">
            {busy ? 'Undoing…' : `Undo batch (${review.batch.committed_rows})`}
          </button>
        )}
        {staged && <span className="text-xs text-slate-400">Only <strong>new</strong>/<strong>matched</strong> rows are written. Others are held.</span>}
      </div>

      {/* Rows */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Note</th></tr>
          </thead>
          <tbody>
            {review.rows.slice(0, 300).map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-400">{r.row_index + 1}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.match_status]}`}>{r.match_status}</span></td>
                <td className="px-3 py-2 text-slate-700">{Object.values(r.mapped || {}).filter(Boolean).slice(0, 4).map(String).join(' · ') || Object.values(r.raw || {}).filter(Boolean).slice(0, 3).map(String).join(' · ')}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.match_detail || (r.target_id ? 'written' : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {review.rows.length > 300 && <p className="px-3 py-2 text-xs text-slate-400">Showing first 300 of {review.rows.length}.</p>}
      </div>
    </div>
  )
}
