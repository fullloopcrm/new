'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type JobRow = {
  id: string
  title: string
  status: string
  client_name: string | null
  created_at: string
  contracted: number
  paid: number
  due: number
  overdue: number
}
type Totals = { contracted: number; paid: number; due: number; overdue: number }

function money(c: number) { return ((c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) }

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-600', cancelled: 'bg-slate-100 text-slate-500',
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone || 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [totals, setTotals] = useState<Totals>({ contracted: 0, paid: 0, due: 0, overdue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(d => {
      setJobs(d.jobs || []); setTotals(d.totals || totals); setLoading(false)
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-bold text-slate-900 mb-1">Production</h1>
      <p className="text-slate-600 text-sm mb-5">Projects and their money — contracted, collected, and outstanding.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Contracted" value={money(totals.contracted)} />
        <Stat label="Collected" value={money(totals.paid)} tone="text-green-600" />
        <Stat label="Due" value={money(totals.due)} tone="text-amber-600" />
        <Stat label="Overdue" value={money(totals.overdue)} tone="text-red-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Job</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Contracted</th>
              <th className="px-4 py-2 font-medium text-right">Collected</th>
              <th className="px-4 py-2 font-medium text-right">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map(j => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/jobs/${j.id}`} className="font-medium text-slate-900 hover:underline">{j.title}</Link>
                  {j.client_name && <p className="text-xs text-slate-500">{j.client_name}</p>}
                </td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded font-medium ${STATUS_STYLE[j.status] || 'bg-slate-100'}`}>{j.status}</span></td>
                <td className="px-4 py-3 text-right text-slate-700">{money(j.contracted)}</td>
                <td className="px-4 py-3 text-right text-green-600">{money(j.paid)}</td>
                <td className={`px-4 py-3 text-right font-medium ${j.overdue > 0 ? 'text-red-600' : 'text-amber-600'}`}>{money(j.due)}</td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No jobs yet. Convert an accepted quote to a project job.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
