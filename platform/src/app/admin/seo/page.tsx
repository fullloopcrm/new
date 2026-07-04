'use client'

import { useEffect, useState } from 'react'

type Row = {
  property: string
  domain: string | null
  label: string | null
  tenant_id: string | null
  last_ingest_at: string | null
  impressions: number
  clicks: number
  avg_position: number | null
  ctr: number
  applicant_impressions: number
  applicant_clicks: number
  queries: number
  last_date: string | null
}

type Payload = {
  properties: Row[]
  totals: {
    impressions: number
    clicks: number
    applicant_impressions: number
    applicant_clicks: number
    queries: number
  }
  windowDays: number
}

const n = (v: number) => (v ?? 0).toLocaleString('en-US')
const pct = (v: number) => `${((v ?? 0) * 100).toFixed(1)}%`

function positionColor(p: number | null): string {
  if (p == null) return 'text-zinc-500'
  if (p <= 10) return 'text-emerald-400'
  if (p <= 20) return 'text-amber-400'
  return 'text-rose-400'
}

export default function AdminSeoPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/seo')
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error || r.statusText))))
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-zinc-400">Loading fleet…</div>
  if (error) return <div className="p-8 text-rose-400">Couldn’t load SEO data: {error}</div>
  if (!data) return null

  const { properties, totals, windowDays } = data
  const avgCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.22em] text-teal-400">
        SIGNAL · Fleet · last {windowDays} days
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-100">SEO — Portfolio</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Every granted Search Console property, one screen. Search data lags ~2–3 days.
      </p>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 md:grid-cols-5">
        {[
          { l: 'Impressions', v: n(totals.impressions) },
          { l: 'Clicks', v: n(totals.clicks) },
          { l: 'Avg CTR', v: pct(avgCtr) },
          { l: 'Applicant impressions', v: n(totals.applicant_impressions), hint: 'labor funnel' },
          { l: 'Properties', v: n(properties.length) },
        ].map((k) => (
          <div key={k.l} className="bg-zinc-950 p-4">
            <div className="font-mono text-xl font-semibold tabular-nums text-zinc-100">{k.v}</div>
            <div className="mt-1 text-xs text-zinc-500">
              {k.l}
              {k.hint ? <span className="ml-1 text-teal-500">· {k.hint}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Fleet table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-900 text-left font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">
              <th className="p-3 font-semibold">Property</th>
              <th className="p-3 text-right font-semibold">Impr.</th>
              <th className="p-3 text-right font-semibold">Clicks</th>
              <th className="p-3 text-right font-semibold">CTR</th>
              <th className="p-3 text-right font-semibold">Avg pos.</th>
              <th className="p-3 text-right font-semibold">Jobs impr.</th>
              <th className="p-3 text-right font-semibold">Queries</th>
              <th className="p-3 text-right font-semibold">Ingested</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {properties.map((r) => (
              <tr key={r.property} className="bg-zinc-950 hover:bg-zinc-900/60">
                <td className="p-3 font-medium text-zinc-100">{r.domain || r.property}</td>
                <td className="p-3 text-right tabular-nums">{n(r.impressions)}</td>
                <td className="p-3 text-right tabular-nums">{n(r.clicks)}</td>
                <td className="p-3 text-right tabular-nums text-zinc-400">{pct(r.ctr)}</td>
                <td className={`p-3 text-right font-semibold tabular-nums ${positionColor(r.avg_position)}`}>
                  {r.avg_position ?? '—'}
                </td>
                <td className="p-3 text-right tabular-nums text-teal-400/90">{n(r.applicant_impressions)}</td>
                <td className="p-3 text-right tabular-nums text-zinc-400">{n(r.queries)}</td>
                <td className="p-3 text-right font-mono text-xs text-zinc-500">
                  {r.last_ingest_at ? new Date(r.last_ingest_at).toLocaleDateString('en-US') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Green ≤ 10 · amber ≤ 20 · red &gt; 20 average position. “Jobs impr.” = applicant-intent search demand (free labor funnel).
      </p>
    </div>
  )
}
