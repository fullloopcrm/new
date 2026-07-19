'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ProjectRow {
  id: string
  title: string
  status: string
  client_name: string | null
  created_at: string
  ends_on: string | null
  pct_complete: number
  session_count: number
  contracted: number
  paid: number
  due: number
  overdue: number
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

function money(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => (r.ok ? r.json() : { jobs: [] }))
      .then((d) => setProjects(d.jobs || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  const active = projects.filter((p) => p.status === 'in_progress').length
  const upcoming = projects.filter((p) => p.status === 'scheduled').length
  const completed = projects.filter((p) => p.status === 'completed').length

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
      <p className="text-sm text-slate-500 mt-1">
        Multi-booking jobs — a sales-converted deal that spans more than one visit.
      </p>

      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Projects</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Active</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Upcoming</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{upcoming}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Completed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{completed}</p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-16">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-700">No projects yet</p>
            <p className="mt-1 text-xs text-slate-500">
              A project appears here once a sales deal converts into a job with more than one booking.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/jobs/${p.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">{p.title}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || 'bg-slate-100 text-slate-600'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.client_name || 'No client'} · {p.session_count} booking{p.session_count === 1 ? '' : 's'}
                    {p.ends_on ? ` · ends ${new Date(p.ends_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="w-24">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-teal-600" style={{ width: `${p.pct_complete}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{p.pct_complete}% complete</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{money(p.contracted)}</p>
                    {p.overdue > 0 ? (
                      <p className="text-[10px] text-red-600">{money(p.overdue)} overdue</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">{money(p.paid)} paid</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
