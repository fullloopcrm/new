'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Update = {
  id: string
  title: string
  body: string
  type: string
  priority: string
  created_at: string
}

function postedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// Persistent platform-updates banner. Always shows the latest published update
// (it does NOT dismiss) with the day/time it was posted, a link to the full
// "what's coming" detail page, and a link to the full updates log.
export default function AnnouncementBanner() {
  const [latest, setLatest] = useState<Update | null>(null)

  useEffect(() => {
    fetch('/api/changelog')
      .then((r) => r.json())
      .then((data) => setLatest((data.entries || [])[0] || null))
      .catch(() => {})
  }, [])

  if (!latest) return null

  const urgent = latest.priority === 'urgent'
  const maint = latest.type === 'maintenance'
  const tone = urgent
    ? 'bg-red-500/10 border-red-500/30 text-red-700'
    : maint
      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-800'
      : 'bg-blue-500/10 border-blue-500/30 text-blue-800'

  return (
    <div className={`rounded-lg border px-4 py-3 mb-5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/50">
          {urgent ? 'Important' : maint ? 'Maintenance' : 'Update'}
        </span>
        <span className="text-sm font-semibold">{latest.title}</span>
        <span className="text-xs opacity-70">{postedAt(latest.created_at)}</span>
        <span className="flex-1" />
        <Link href={`/dashboard/changelog/${latest.id}`} className="text-xs font-semibold underline underline-offset-2 hover:opacity-80">
          What&apos;s coming &rarr;
        </Link>
        <Link href="/dashboard/changelog" className="text-xs opacity-70 underline underline-offset-2 hover:opacity-100">
          All updates
        </Link>
      </div>
    </div>
  )
}
