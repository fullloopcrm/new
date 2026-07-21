// ---------------------------------------------------------------------------
// SIGNAL verify-and-revert — the closing half of the autopilot loop.
//
// For every autopilot-applied change that has aged past the verify window, read
// the page's live position for its target query and compare to the snapshot
// taken at apply time. Clear losers are reverted (the override is switched off,
// so the page falls back to its original copy). Winners/neutral are marked
// verified and kept. Only autopilot's own changes are ever auto-reverted.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { revertOverride } from './overrides'

const VERIFY_WEEKS = 4 // wait this long before judging (GSC lags + ranking noise)
const LOOKBACK_DAYS = 21 // window of recent metrics to read the current position
const REVERT_THRESHOLD = 3 // positions worse than baseline before we roll back

type AppliedChange = {
  id: string
  property: string
  target_url: string
  before_metric: { query?: string; top_query?: string; position?: number; best_position?: number } | null
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

  for (const [url, group] of byUrl) {
    const head = group[0]
    const query = baselineQuery(head.before_metric)
    const baseline = baselinePosition(head.before_metric)
    const ids = group.map((g) => g.id)

    if (!query || baseline == null) {
      out.skippedNoData++
      continue
    }

    const current = await currentPosition(head.property, url, query)
    out.judged++

    if (current == null) {
      // No recent data for this query on this page — can't prove harm, keep it.
      out.skippedNoData++
      await markVerified(ids, { query, baseline, current: null, verdict: 'no_data_kept' }, now)
      continue
    }

    // Lower position is better. Reverting only on a clear regression.
    if (current > baseline + REVERT_THRESHOLD) {
      await revertOverride(url)
      await supabaseAdmin
        .from('seo_changes')
        .update({
          status: 'rolled_back',
          verified_at: now,
          after_metric: { query, baseline, current: Math.round(current * 10) / 10, verdict: 'reverted' },
        })
        .in('id', ids)
      out.reverted++
      out.details.push(`REVERT ${url} "${query}" ${baseline}→${current.toFixed(1)}`)
    } else {
      const verdict = current < baseline - 0.5 ? 'improved' : 'held'
      await markVerified(ids, { query, baseline, current: Math.round(current * 10) / 10, verdict }, now)
      out.verified++
      out.details.push(`KEEP ${url} "${query}" ${baseline}→${current.toFixed(1)} (${verdict})`)
    }
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
