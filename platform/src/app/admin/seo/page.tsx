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
  if (p == null) return 'text-slate-400'
  if (p <= 10) return 'text-emerald-600'
  if (p <= 20) return 'text-amber-600'
  return 'text-rose-600'
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

  if (loading) return <div className="text-sm text-slate-500">Loading fleet…</div>
  if (error) return <div className="text-sm text-rose-600">Couldn’t load SEO data: {error}</div>
  if (!data) return null

  const { properties, totals, windowDays } = data
  const avgCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0

  return (
    <div className="max-w-[1200px]">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
          SIGNAL · Fleet · last {windowDays} days
        </p>
        <h1 className="text-2xl font-heading font-bold text-slate-900">SEO — Portfolio</h1>
        <p className="text-sm text-slate-500">
          Every granted Search Console property, one screen. Search data lags ~2–3 days.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { l: 'Impressions', v: n(totals.impressions) },
          { l: 'Clicks', v: n(totals.clicks) },
          { l: 'Avg CTR', v: pct(avgCtr) },
          { l: 'Applicant impr.', v: n(totals.applicant_impressions), hint: 'labor funnel' },
          { l: 'Properties', v: n(properties.length) },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-slate-200 border-l-4 border-l-teal-500 bg-white p-4">
            <div className="font-mono text-xl font-semibold tabular-nums text-slate-900">{k.v}</div>
            <div className="mt-1 text-xs text-slate-500">
              {k.l}
              {k.hint ? <span className="ml-1 text-teal-600">· {k.hint}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Proposed fixes — review & apply */}
      {data.proposals.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-teal-600">
            Proposed fixes · {data.proposals.length} awaiting review
          </p>
          <div className="flex flex-col gap-3">
            {data.proposals.map((p) => (
              <div key={p.url} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <a href={p.url} target="_blank" rel="noreferrer" className="truncate font-mono text-xs text-slate-500 hover:text-teal-600">
                    {p.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                  <button
                    onClick={() => act(p, false)}
                    disabled={busy === p.url}
                    className="shrink-0 rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {busy === p.url ? 'Applying…' : 'Apply'}
                  </button>
                </div>
                {p.title && (
                  <div className="mt-3 text-sm">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-slate-400">Title</div>
                    <div className="text-slate-400 line-through decoration-slate-300">{p.title.before || '(none)'}</div>
                    <div className="font-medium text-emerald-700">{p.title.after}</div>
                  </div>
                )}
                {p.description && (
                  <div className="mt-2 text-sm">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-slate-400">Meta</div>
                    <div className="text-slate-400 line-through decoration-slate-300">{p.description.before || '(none)'}</div>
                    <div className="text-emerald-700">{p.description.after}</div>
                  </div>
                )}
                {p.rationale && <div className="mt-2 text-xs text-slate-400">{p.rationale}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity — detected issues */}
      {data.issues.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-600">
            Opportunity · {n(data.issues.reduce((s, i) => s + i.issues, 0))} pages ·{' '}
            {n(data.issues.reduce((s, i) => s + i.impressions_at_stake, 0))} impressions at stake
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {data.issues.map((i) => (
              <div key={i.type} className="rounded-lg border border-slate-200 border-l-4 border-l-amber-500 bg-white p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">{n(i.issues)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">Tier {i.tier}</span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-700">{ISSUE_LABEL[i.type] ?? i.type}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {n(i.impressions_at_stake)} impr. at stake
                  {i.applicant_issues > 0 ? <span className="ml-1 text-teal-600">· {n(i.applicant_issues)} jobs</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fleet table */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left font-mono text-[10.5px] uppercase tracking-wide text-slate-400">
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
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {properties.map((r) => (
              <tr key={r.property} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">{r.domain || r.property}</td>
                <td className="p-3 text-right tabular-nums">{n(r.impressions)}</td>
                <td className="p-3 text-right tabular-nums">{n(r.clicks)}</td>
                <td className="p-3 text-right tabular-nums text-slate-400">{pct(r.ctr)}</td>
                <td className={`p-3 text-right font-semibold tabular-nums ${positionColor(r.avg_position)}`}>
                  {r.avg_position ?? '—'}
                </td>
                <td className="p-3 text-right tabular-nums text-teal-600">{n(r.applicant_impressions)}</td>
                <td className="p-3 text-right tabular-nums text-slate-400">{n(r.queries)}</td>
                <td className="p-3 text-right font-mono text-xs text-slate-400">
                  {r.last_ingest_at ? new Date(r.last_ingest_at).toLocaleDateString('en-US') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Green ≤ 10 · amber ≤ 20 · red &gt; 20 average position. “Jobs impr.” = applicant-intent search demand (free labor funnel).
      </p>
    </div>
  )
}
