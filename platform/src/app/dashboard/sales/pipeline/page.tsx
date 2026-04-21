'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PIPELINE_STAGES, OPEN_STAGES } from '@/lib/pipeline'

type Deal = {
  id: string
  title: string | null
  stage: string
  value_cents: number | null
  probability: number | null
  expected_close_date: string | null
  source: string | null
  notes: string | null
  follow_up_at: string | null
  follow_up_note: string | null
  stage_changed_at: string | null
  last_activity_at: string | null
  created_at: string
  clients: { id: string; name: string; email: string | null; phone: string | null } | null
}

type StageTotal = { stage: string; label: string; count: number; totalCents: number; weightedCents: number }
type ForecastBucket = { label: string; deals: number; totalValueCents: number; weightedValueCents: number }

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function daysAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export default function PipelinePage() {
  const [data, setData] = useState<{
    byStage: Record<string, Deal[]>
    stageTotals: StageTotal[]
    forecast: ForecastBucket[]
    overdueFollowUps: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'forecast'>('kanban')
  const [dragging, setDragging] = useState<{ dealId: string; fromStage: string } | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/pipeline')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function moveToStage(dealId: string, stage: string) {
    setErr('')
    // Optimistic update
    setData(prev => {
      if (!prev) return prev
      const next = { ...prev, byStage: { ...prev.byStage } }
      for (const k of Object.keys(next.byStage)) {
        next.byStage[k] = next.byStage[k].filter(d => d.id !== dealId)
      }
      const allDeals = Object.values(prev.byStage).flat()
      const deal = allDeals.find(d => d.id === dealId)
      if (deal) next.byStage[stage] = [{ ...deal, stage }, ...(next.byStage[stage] || [])]
      return next
    })

    const res = await fetch(`/api/deals/${dealId}/stage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErr(data.error || 'Move failed')
      load() // revert
    } else {
      load()
    }
  }

  function onDragStart(e: React.DragEvent, dealId: string, fromStage: string) {
    setDragging({ dealId, fromStage })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dealId)
  }
  function onDragEnd() { setDragging(null) }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  function onDrop(e: React.DragEvent, toStage: string) {
    e.preventDefault()
    if (!dragging || dragging.fromStage === toStage) { setDragging(null); return }
    moveToStage(dragging.dealId, toStage)
    setDragging(null)
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!data) return <div className="p-8 text-slate-500 text-sm">Failed to load pipeline.</div>

  const openPipelineCents = data.stageTotals
    .filter(t => OPEN_STAGES.includes(t.stage as (typeof OPEN_STAGES)[number]))
    .reduce((a, t) => a + t.totalCents, 0)
  const weightedOpenCents = data.stageTotals
    .filter(t => OPEN_STAGES.includes(t.stage as (typeof OPEN_STAGES)[number]))
    .reduce((a, t) => a + t.weightedCents, 0)
  const wonThisMonthCents = data.stageTotals.find(t => t.stage === 'won')?.totalCents || 0

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">Pipeline</h1>
          <p className="text-sm text-slate-500">Drag deals across stages. Forecast updates in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 rounded ${view === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >Kanban</button>
            <button
              onClick={() => setView('forecast')}
              className={`px-3 py-1.5 rounded ${view === 'forecast' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >Forecast</button>
          </div>
          <Link
            href="/dashboard/sales/pipeline/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
          >+ New Deal</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase">Open pipeline</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCents(openPipelineCents)}</p>
        </div>
        <div className="bg-white border border-teal-200 rounded-lg p-3">
          <p className="text-xs text-teal-600 uppercase">Weighted</p>
          <p className="text-xl font-bold text-teal-700 mt-1">{formatCents(weightedOpenCents)}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 uppercase">Won (active tab)</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCents(wonThisMonthCents)}</p>
        </div>
        <div className={`bg-white border rounded-lg p-3 ${data.overdueFollowUps > 0 ? 'border-red-200' : 'border-slate-200'}`}>
          <p className="text-xs uppercase text-slate-500">Overdue follow-ups</p>
          <p className={`text-xl font-bold mt-1 ${data.overdueFollowUps > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {data.overdueFollowUps}
          </p>
        </div>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {view === 'kanban' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map(stage => {
            const dealsInStage = data.byStage[stage.value] || []
            const total = dealsInStage.reduce((a, d) => a + (d.value_cents || 0), 0)
            return (
              <div
                key={stage.value}
                onDragOver={onDragOver}
                onDrop={e => onDrop(e, stage.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden min-h-[200px] flex flex-col"
              >
                <div className="px-3 py-2 border-b border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-xs font-semibold px-2 py-0.5 rounded ${stage.color}`}>{stage.label}</h3>
                    <span className="text-xs text-slate-400">{dealsInStage.length}</span>
                  </div>
                  <p className="text-xs text-slate-500">{formatCents(total)}</p>
                </div>
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {dealsInStage.map(deal => (
                    <Link
                      key={deal.id}
                      href={`/dashboard/sales/pipeline/${deal.id}`}
                      draggable
                      onDragStart={e => onDragStart(e, deal.id, stage.value)}
                      onDragEnd={onDragEnd}
                      className="block bg-white border border-slate-200 rounded-lg p-2.5 hover:shadow-md hover:border-teal-300 transition-all cursor-move"
                    >
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {deal.title || deal.clients?.name || 'Untitled Deal'}
                      </p>
                      {deal.clients && deal.title && (
                        <p className="text-xs text-slate-500 truncate">{deal.clients.name}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-sm font-semibold text-slate-700">
                          {deal.value_cents ? formatCents(deal.value_cents) : '—'}
                        </p>
                        {deal.probability != null && (
                          <p className="text-xs text-slate-400">{deal.probability}%</p>
                        )}
                      </div>
                      {deal.follow_up_at && (
                        <p className={`text-xs mt-1 ${new Date(deal.follow_up_at) < new Date() ? 'text-red-600' : 'text-slate-500'}`}>
                          ↻ {new Date(deal.follow_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                      {deal.stage_changed_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">in stage {daysAgo(deal.stage_changed_at)}</p>
                      )}
                    </Link>
                  ))}
                  {dealsInStage.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Drop deals here</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Month</th>
                <th className="px-5 py-2 font-medium text-right">Deals</th>
                <th className="px-5 py-2 font-medium text-right">Total</th>
                <th className="px-5 py-2 font-medium text-right">Weighted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.forecast.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{b.label}</td>
                  <td className="px-5 py-3 text-right">{b.deals}</td>
                  <td className="px-5 py-3 text-right">{formatCents(b.totalValueCents)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-teal-700">{formatCents(b.weightedValueCents)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">{data.forecast.reduce((a, b) => a + b.deals, 0)}</td>
                <td className="px-5 py-3 text-right">{formatCents(data.forecast.reduce((a, b) => a + b.totalValueCents, 0))}</td>
                <td className="px-5 py-3 text-right text-teal-700">{formatCents(data.forecast.reduce((a, b) => a + b.weightedValueCents, 0))}</td>
              </tr>
            </tbody>
          </table>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Weighted = sum of (deal value × probability). Only open-stage deals with an expected close date are included.
          </div>
        </div>
      )}
    </div>
  )
}
