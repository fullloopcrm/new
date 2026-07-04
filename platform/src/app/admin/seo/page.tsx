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

type IssueSummary = {
  type: string
  tier: number
  issues: number
  impressions_at_stake: number
  applicant_issues: number
}

type ChangeField = { id: string; before: string | null; after: string | null }
type Proposal = {
  url: string
  rationale: string | null
  title?: ChangeField
  description?: ChangeField
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
  issues: IssueSummary[]
  proposals: Proposal[]
  windowDays: number
}

const ISSUE_LABEL: Record<string, string> = {
  striking_distance: 'Striking distance (page 2 → 1)',
  deep_underperformer: 'Deep underperformer (enrich)',
  low_ctr: 'Low CTR (title/meta)',
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
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    fetch('/api/admin/seo')
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error || r.statusText))))
      .then(setData)
      .catch((e) => setError(String(e)))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function act(p: Proposal, revert: boolean) {
    setBusy(p.url)
    try {
      const res = await fetch('/api/admin/seo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: p.url,
          title: p.title?.after ?? null,
          description: p.description?.after ?? null,
          changeIds: [p.title?.id, p.description?.id].filter(Boolean),
          revert,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

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

      {/* Proposed fixes — review & apply */}
      {data.proposals.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-teal-400">
            Proposed fixes · {data.proposals.length} awaiting review
          </div>
          <div className="flex flex-col gap-3">
            {data.proposals.map((p) => (
              <div key={p.url} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start justify-between gap-4">
                  <a href={p.url} target="_blank" rel="noreferrer" className="truncate font-mono text-xs text-zinc-400 hover:text-teal-400">
                    {p.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                  <button
                    onClick={() => act(p, false)}
                    disabled={busy === p.url}
                    className="shrink-0 rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {busy === p.url ? 'Applying…' : 'Apply'}
                  </button>
                </div>
                {p.title && (
                  <div className="mt-3 text-sm">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Title</div>
                    <div className="text-rose-400/80 line-through decoration-zinc-700">{p.title.before || '(none)'}</div>
                    <div className="text-emerald-300">{p.title.after}</div>
                  </div>
                )}
                {p.description && (
                  <div className="mt-2 text-sm">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Meta</div>
                    <div className="text-rose-400/70 line-through decoration-zinc-700">{p.description.before || '(none)'}</div>
                    <div className="text-emerald-300/90">{p.description.after}</div>
                  </div>
                )}
                {p.rationale && <div className="mt-2 text-xs text-zinc-500">{p.rationale}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity — detected issues */}
      {data.issues.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">
            Opportunity · {n(data.issues.reduce((s, i) => s + i.issues, 0))} pages ·{' '}
            {n(data.issues.reduce((s, i) => s + i.impressions_at_stake, 0))} impressions at stake
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 md:grid-cols-3">
            {data.issues.map((i) => (
              <div key={i.type} className="bg-zinc-950 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-zinc-100">{n(i.issues)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Tier {i.tier}</span>
                </div>
                <div className="mt-1 text-xs font-medium text-zinc-300">{ISSUE_LABEL[i.type] ?? i.type}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {n(i.impressions_at_stake)} impr. at stake
                  {i.applicant_issues > 0 ? <span className="ml-1 text-teal-500">· {n(i.applicant_issues)} jobs</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
