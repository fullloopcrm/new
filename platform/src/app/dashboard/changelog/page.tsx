'use client'

import { useEffect, useState } from 'react'

type Entry = {
  id: string
  title: string
  body: string
  created_at: string
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/changelog')
      .then((r) => r.json())
      .then((data) => { setEntries(data.entries || []); setLoading(false) })
  }, [])

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">What&apos;s New</h2>
      <p className="text-slate-400 text-sm mb-8">Updates and improvements to Full Loop CRM.</p>

      <div className="max-w-2xl space-y-6">
        {entries.map((e) => (
          <div key={e.id} className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">NEW</span>
              <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{e.title}</h3>
            <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{e.body}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No updates yet. Check back soon.
          </div>
        )}
      </div>
    </div>
  )
}
