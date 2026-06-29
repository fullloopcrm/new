'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Entry = {
  id: string
  title: string
  body: string
  type: string
  priority: string
  created_at: string
}

function postedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function UpdateDetailPage() {
  const params = useParams<{ id: string }>()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    fetch(`/api/changelog/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setEntry(data.entry))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params?.id])

  if (loading) return <p className="text-slate-400">Loading...</p>

  if (notFound || !entry) {
    return (
      <div className="max-w-2xl">
        <Link href="/dashboard/changelog" className="text-sm text-blue-600 underline underline-offset-2">&larr; All updates</Link>
        <p className="text-slate-400 mt-6">This update doesn&apos;t exist or is no longer published.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/changelog" className="text-sm text-blue-600 underline underline-offset-2">&larr; All updates</Link>
      <div className="mt-5 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-700">
          {entry.priority === 'urgent' ? 'Important' : entry.type === 'maintenance' ? 'Maintenance' : 'Update'}
        </span>
        <span className="text-xs text-slate-400">{postedAt(entry.created_at)}</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mt-3 mb-4">{entry.title}</h1>
      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{entry.body}</p>
    </div>
  )
}
