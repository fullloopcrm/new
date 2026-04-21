'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewDocumentPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [signOrder, setSignOrder] = useState<'parallel' | 'sequential'>('parallel')
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  async function upload() {
    if (!file) { setErr('Pick a PDF'); return }
    if (!title.trim()) { setErr('Title required'); return }
    setUploading(true); setErr('')
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('title', title)
      fd.set('message', message)
      fd.set('sign_order', signOrder)
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      router.push(`/dashboard/sales/documents/${data.document.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/sales/documents" className="text-xs text-slate-500 hover:underline">← Documents</Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1 mb-6">New Document</h1>

      {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <label className="block text-xs text-slate-500 uppercase mb-1">PDF file *</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 mb-4"
        />
        {file && (
          <p className="text-xs text-slate-500 mb-4">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}

        <label className="block text-xs text-slate-500 uppercase mb-1 mt-3">Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Service Agreement 2026"
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
        />

        <label className="block text-xs text-slate-500 uppercase mb-1">Message to signers (optional)</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Short note — shown in the invite email/SMS."
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
        />

        <label className="block text-xs text-slate-500 uppercase mb-1">Signing order</label>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            onClick={() => setSignOrder('parallel')}
            className={`px-3 py-1.5 rounded ${signOrder === 'parallel' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >Parallel</button>
          <button
            onClick={() => setSignOrder('sequential')}
            className={`px-3 py-1.5 rounded ${signOrder === 'sequential' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >Sequential</button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {signOrder === 'parallel'
            ? 'All signers receive their link at the same time and sign independently.'
            : 'Only the next signer in line receives a link after the previous one completes.'}
        </p>
      </section>

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/sales/documents" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</Link>
        <button
          onClick={upload}
          disabled={uploading || !file || !title.trim()}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
        >{uploading ? 'Uploading…' : 'Continue to Editor →'}</button>
      </div>
    </div>
  )
}
