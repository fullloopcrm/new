'use client'

import { useEffect, useState } from 'react'
import { BacklinksPanel } from './backlinks-panel'

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
  grade: string | null
  score: number | null
  at_goal: number
  on_page1: number
  targets: number
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

type CompetitorRow = {
  competitor_domain: string
  is_directory: boolean
  properties_hit: number
  keywords_ahead: number
  avg_position: number | null
  best_position: number | null
}

type GapRow = {
  property: string
  target_url: string | null
  value: number
  detail: {
    query?: string
    our_position?: number
    top_competitor_domain?: string
    top_competitor_title?: string
    top_competitor_position?: number
    competitors_above?: number
    impressions?: number
  }
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
  competitors: CompetitorRow[]
  competitorGaps: GapRow[]
  notIndexed: NotIndexedRow[]
  enrichments: EnrichmentRow[]
  windowDays: number
}

type EnrichmentRow = {
  id: string
  target_url: string | null
  after_value: string | null
  rationale: string | null
}

type NotIndexedRow = {
  property: string
  target_url: string | null
  detail: { coverage_state?: string | null; canonical_mismatch?: boolean }
}

const ISSUE_LABEL: Record<string, string> = {
  striking_distance: 'Striking distance (page 2 → 1)',
  deep_underperformer: 'Deep underperformer (enrich)',
  low_ctr: 'Low CTR (title/meta)',
  competitor_gap: 'Competitor outranking you',
  not_indexed: 'Not indexed by Google',
}

const n = (v: number) => (v ?? 0).toLocaleString('en-US')
const pct = (v: number) => `${((v ?? 0) * 100).toFixed(1)}%`

// Decode HTML entities from fetched page titles/metas (e.g. &amp; -> &).
const decode = (s: string | null | undefined) =>
  (s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')

function positionColor(p: number | null): string {
  if (p == null) return 'text-slate-400'
  if (p <= 10) return 'text-emerald-600'
  if (p <= 20) return 'text-amber-600'
  return 'text-rose-600'
}

// Grade badge — the at-a-glance health signal for the fleet.
function gradeBadge(g: string | null): string {
  switch (g) {
    case 'A': return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
    case 'B': return 'bg-lime-100 text-lime-700 ring-lime-200'
    case 'C': return 'bg-amber-100 text-amber-700 ring-amber-200'
    case 'D': return 'bg-orange-100 text-orange-700 ring-orange-200'
    case 'F': return 'bg-rose-100 text-rose-700 ring-rose-200'
    default: return 'bg-slate-100 text-slate-400 ring-slate-200'
  }
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
                    <div className="text-slate-400 line-through decoration-slate-300">{decode(p.title.before) || '(none)'}</div>
                    <div className="font-medium text-emerald-700">{decode(p.title.after)}</div>
                  </div>
                )}
                {p.description && (
                  <div className="mt-2 text-sm">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-slate-400">Meta</div>
                    <div className="text-slate-400 line-through decoration-slate-300">{decode(p.description.before) || '(none)'}</div>
                    <div className="text-emerald-700">{decode(p.description.after)}</div>
                  </div>
                )}
                {p.rationale && <div className="mt-2 text-xs text-slate-400">{p.rationale}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <BacklinksPanel />

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

      {/* Competitors — who's outranking us on money keywords */}
      {(data.competitors.length > 0 || data.competitorGaps.length > 0) && (
        <div className="mt-8">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-600">
            Competitors · {n(data.competitorGaps.length)} winnable gaps
          </p>

          {data.competitors.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left font-mono text-[10.5px] uppercase tracking-wide text-slate-400">
                    <th className="p-3 font-semibold">Competitor domain</th>
                    <th className="p-3 text-right font-semibold">Keywords ahead</th>
                    <th className="p-3 text-right font-semibold">Sites hit</th>
                    <th className="p-3 text-right font-semibold">Avg pos.</th>
                    <th className="p-3 text-right font-semibold">Best pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {data.competitors.map((c) => (
                    <tr key={c.competitor_domain} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{c.competitor_domain}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-indigo-600">{n(c.keywords_ahead)}</td>
                      <td className="p-3 text-right tabular-nums text-slate-400">{n(c.properties_hit)}</td>
                      <td className="p-3 text-right tabular-nums">{c.avg_position ?? '—'}</td>
                      <td className="p-3 text-right tabular-nums">{c.best_position ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.competitorGaps.length > 0 && (
            <div className="flex flex-col gap-2">
              {data.competitorGaps.map((g, i) => (
                <div
                  key={`${g.property}-${g.detail.query}-${i}`}
                  className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">“{g.detail.query}”</div>
                      {g.target_url && (
                        <a
                          href={g.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-mono text-xs text-slate-500 hover:text-indigo-600"
                        >
                          {g.target_url.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs text-slate-400">you: #{g.detail.our_position ?? '—'}</div>
                      <div className="font-mono text-[10px] uppercase tracking-wide text-slate-300">
                        {n(g.detail.impressions ?? 0)} impr.
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    Beaten by{' '}
                    <span className="font-medium text-indigo-700">{g.detail.top_competitor_domain}</span>
                    {g.detail.top_competitor_position ? ` (#${g.detail.top_competitor_position})` : ''}
                    {g.detail.competitors_above && g.detail.competitors_above > 1
                      ? ` · ${g.detail.competitors_above} above you`
                      : ''}
                  </div>
                  {g.detail.top_competitor_title && (
                    <div className="mt-1 truncate font-mono text-[11px] text-slate-400">
                      their title: {g.detail.top_competitor_title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content enrichment drafts — deep-underperformer pages, human review */}
      {data.enrichments.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-600">
            Content drafts · {n(data.enrichments.length)} awaiting review · grounded in tenant facts, not yet applied
          </p>
          <div className="flex flex-col gap-3">
            {data.enrichments.map((e) => (
              <details key={e.id} className="rounded-xl border border-violet-200 bg-white p-4">
                <summary className="cursor-pointer list-none">
                  <span className="font-mono text-xs text-slate-500 hover:text-violet-600">
                    {(e.target_url ?? '').replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                  {e.rationale ? <span className="ml-2 text-xs text-slate-400">— {e.rationale}</span> : null}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                  {decode(e.after_value)}
                </pre>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Technical — pages Google isn't indexing (rank nowhere until fixed) */}
      {data.notIndexed.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-rose-600">
            Indexing · {n(data.notIndexed.length)} pages not indexed by Google
          </p>
          <div className="overflow-x-auto rounded-xl border border-rose-200">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-rose-50 text-left font-mono text-[10.5px] uppercase tracking-wide text-rose-400">
                  <th className="p-3 font-semibold">URL</th>
                  <th className="p-3 font-semibold">Google coverage state</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 text-slate-600">
                {data.notIndexed.map((r, i) => (
                  <tr key={`${r.target_url}-${i}`} className="hover:bg-rose-50/40">
                    <td className="p-3">
                      {r.target_url ? (
                        <a
                          href={r.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-slate-600 hover:text-rose-600"
                        >
                          {r.target_url.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <span className="text-rose-700">{r.detail?.coverage_state ?? 'unknown'}</span>
                      {r.detail?.canonical_mismatch ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          canonical mismatch
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fleet table */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left font-mono text-[10.5px] uppercase tracking-wide text-slate-400">
              <th className="p-3 font-semibold">Property</th>
              <th className="p-3 text-center font-semibold">Grade</th>
              <th className="p-3 text-right font-semibold">At goal</th>
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
                <td className="p-3 text-center">
                  <span
                    className={`inline-flex min-w-[2.1rem] items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset tabular-nums ${gradeBadge(r.grade)}`}
                    title={r.score != null ? `score ${r.score}/100` : 'no data'}
                  >
                    {r.grade ?? '—'}
                  </span>
                </td>
                <td className="p-3 text-right tabular-nums text-slate-500">
                  {r.targets > 0 ? (
                    <span>
                      <span className="font-semibold text-slate-700">{n(r.at_goal)}</span>
                      <span className="text-slate-400">/{n(r.targets)}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
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
        Grade = demand-weighted rank on money keywords (goal = top 3); sorted worst-first. “At goal” = money keywords ranking top 3. “Jobs impr.” = applicant-intent search demand (free labor funnel).
      </p>
    </div>
  )
}
