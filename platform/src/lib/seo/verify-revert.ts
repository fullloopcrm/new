// ---------------------------------------------------------------------------
// SIGNAL verify-and-revert — the closing half of the autopilot loop.
//
// For every autopilot-applied change that has aged past the verify window, read
// the page's live position for its target query and compare to the snapshot
// taken at apply time. Clear losers are reverted (the override is switched off,
// so the page falls back to its original copy). Winners/neutral are marked
// verified and kept. Only autopilot's own changes are ever auto-reverted.
//
// Position judges ONE query — the page's top query at proposal time. If that
// query's demand dries up or the rewrite shifted what the page ranks for,
// currentPosition() returns null and the old logic kept the change forever
// ("can't prove harm"). A second, independent signal closes that gap: total
// page-level clicks (all queries, from seo_page_rollup's own 28-day window,
// mirrored here so before/after are apples-to-apples) — a hard drop reverts
// even when the originally-tracked query has gone quiet.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { revertOverride } from './overrides'

const VERIFY_WEEKS = 4 // wait this long before judging (GSC lags + ranking noise)
const LOOKBACK_DAYS = 21 // window of recent metrics to read the current position
const REVERT_THRESHOLD = 3 // positions worse than baseline before we roll back

const TRAFFIC_LOOKBACK_DAYS = 28 // mirrors seo_page_rollup's window, for a fair before/after
const TRAFFIC_DROP_THRESHOLD = 0.5 // revert if current clicks <= 50% of baseline
const MIN_BASELINE_CLICKS = 5 // ignore pages too small for click counts to mean anything

type AppliedChange = {
  id: string
  property: string
  target_url: string
  before_metric: {
    query?: string
    top_query?: string
    position?: number
    best_position?: number
    clicks?: number
    impressions?: number
  } | null
}

function baselinePosition(m: AppliedChange['before_metric']): number | null {
  if (!m) return null
  const p = m.best_position ?? m.position
  return typeof p === 'number' ? p : null
}

function baselineQuery(m: AppliedChange['before_metric']): string | null {
  if (!m) return null
  return m.query ?? m.top_query ?? null
}

function baselineClicks(m: AppliedChange['before_metric']): number | null {
  return typeof m?.clicks === 'number' ? m.clicks : null
}

/** Impression-weighted current position for (page, query) over the lookback. */
async function currentPosition(property: string, url: string, query: string): Promise<number | null> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10)
  const { data } = await supabaseAdmin
    .from('seo_metrics')
    .select('position,impressions')
    .eq('property', property)
    .eq('page', url)
    .eq('query', query)
    .gte('date', since)
  const rows = (data ?? []) as Array<{ position: number; impressions: number }>
  if (!rows.length) return null
  const wsum = rows.reduce((a, r) => a + (r.impressions || 0), 0)
  if (wsum === 0) return rows.reduce((a, r) => a + r.position, 0) / rows.length
  return rows.reduce((a, r) => a + r.position * (r.impressions || 0), 0) / wsum
}

/** Total page-level clicks across every query, over the same window seo_page_rollup uses. */
async function currentPageClicks(property: string, url: string): Promise<number> {
  const since = new Date(Date.now() - TRAFFIC_LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10)
  const { data } = await supabaseAdmin
    .from('seo_metrics')
    .select('clicks')
    .eq('property', property)
    .eq('page', url)
    .gte('date', since)
  return (data ?? []).reduce((sum, r) => sum + (Number((r as { clicks?: number }).clicks) || 0), 0)
}

/** True if the page's total traffic cratered relative to baseline, independent of any single query. */
export function isTrafficRegression(baseline: number | null, current: number): boolean {
  if (baseline == null || baseline < MIN_BASELINE_CLICKS) return false
  return current <= baseline * (1 - TRAFFIC_DROP_THRESHOLD)
}

export type VerifyResult = {
  judged: number
  reverted: number
  verified: number
  skippedNoData: number
  details: string[]
}

export async function runVerifyRevert(): Promise<VerifyResult> {
  const out: VerifyResult = { judged: 0, reverted: 0, verified: 0, skippedNoData: 0, details: [] }

  const cutoff = new Date(Date.now() - VERIFY_WEEKS * 7 * 86_400_000).toISOString()
  const { data } = await supabaseAdmin
    .from('seo_changes')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .select('id,property,target_url,before_metric')
    .eq('applied_by', 'autopilot')
    .eq('status', 'applied')
    .lte('applied_at', cutoff)
    .limit(500)

  const changes = (data ?? []) as AppliedChange[]

  // Group by URL — title + meta for a page are judged and reverted together.
  const byUrl = new Map<string, AppliedChange[]>()
  for (const c of changes) {
    if (!c.target_url) continue
    const arr = byUrl.get(c.target_url) ?? []
    arr.push(c)
    byUrl.set(c.target_url, arr)
  }

  const now = new Date().toISOString()

  const revert = async (url: string, ids: string[], afterMetric: Record<string, unknown>): Promise<void> => {
    await revertOverride(url)
    await supabaseAdmin
      .from('seo_changes')
      .update({ status: 'rolled_back', verified_at: now, after_metric: afterMetric })
      .in('id', ids)
    out.reverted++
  }

  for (const [url, group] of byUrl) {
    const head = group[0]
    const query = baselineQuery(head.before_metric)
    const baseline = baselinePosition(head.before_metric)
    const baseClicks = baselineClicks(head.before_metric)
    const ids = group.map((g) => g.id)

    if (!query || baseline == null) {
      out.skippedNoData++
      continue
    }

    const current = await currentPosition(head.property, url, query)
    out.judged++

    if (current == null) {
      // The tracked query went quiet — position alone can't judge this page
      // anymore. Fall back to total page traffic before defaulting to keep.
      const currentClicks = await currentPageClicks(head.property, url)
      if (isTrafficRegression(baseClicks, currentClicks)) {
        await revert(url, ids, { query, baseline, current: null, baseClicks, currentClicks, verdict: 'reverted_traffic_drop' })
        out.details.push(`REVERT ${url} (traffic) clicks ${baseClicks}→${currentClicks}, "${query}" went quiet`)
        continue
      }
      out.skippedNoData++
      await markVerified(ids, { query, baseline, current: null, baseClicks, currentClicks, verdict: 'no_data_kept' }, now)
      continue
    }

    // Lower position is better. Reverting only on a clear regression.
    if (current > baseline + REVERT_THRESHOLD) {
      await revert(url, ids, { query, baseline, current: Math.round(current * 10) / 10, verdict: 'reverted' })
      out.details.push(`REVERT ${url} "${query}" ${baseline}→${current.toFixed(1)}`)
      continue
    }

    // Position looks fine or neutral — still check for a traffic collapse the
    // single tracked query wouldn't show (e.g. the rewrite tanked CTR on other
    // queries the page used to pull impressions from).
    const currentClicks = await currentPageClicks(head.property, url)
    if (isTrafficRegression(baseClicks, currentClicks)) {
      await revert(url, ids, {
        query,
        baseline,
        current: Math.round(current * 10) / 10,
        baseClicks,
        currentClicks,
        verdict: 'reverted_traffic_drop',
      })
      out.details.push(`REVERT ${url} (traffic) clicks ${baseClicks}→${currentClicks}, position held`)
      continue
    }

    const verdict = current < baseline - 0.5 ? 'improved' : 'held'
    await markVerified(
      ids,
      { query, baseline, current: Math.round(current * 10) / 10, baseClicks, currentClicks, verdict },
      now,
    )
    out.verified++
    out.details.push(`KEEP ${url} "${query}" ${baseline}→${current.toFixed(1)} (${verdict})`)
  }

  return out
}

async function markVerified(
  ids: string[],
  after: Record<string, unknown>,
  now: string,
): Promise<void> {
  await supabaseAdmin
    .from('seo_changes')
    .update({ status: 'verified', verified_at: now, after_metric: after })
    .in('id', ids)
}
