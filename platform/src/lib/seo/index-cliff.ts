// ---------------------------------------------------------------------------
// SIGNAL — index-cliff detection.
//
// "Index cliff" = a property's organic impressions collapse over a short
// window (accidental noindex, robots.txt block, canonical mistake, mass
// de-indexing, or the site just going down — see seo-health for the
// dedicated uptime check that catches that last case directly). This is one
// of the most severe SEO failure modes because it can crater a tenant's
// organic lead flow within days, and unlike a single down-check ping, GSC
// impressions data is the only signal that catches "site's up but Google
// stopped sending it traffic."
//
// Compares total impressions in the most recent ingested window against a
// prior baseline window of equal length, per property. Summed in JS from raw
// seo_metrics rows, fetched per-property and paginated.
//
// Three real bugs found and fixed via live verification against prod
// (2026-07-31) before this shipped — do not "simplify" this back to a
// single platform-wide `.select().limit(n)` call, all three come back:
//   1. This project has PostgREST aggregate functions disabled
//      (`.select('impressions.sum()')` -> PGRST123 "Use of aggregate
//      functions is not allowed") -- there is no server-side SUM available,
//      so summing has to happen in JS.
//   2. Supabase silently caps every REST response at 1000 rows regardless
//      of `.limit(n)` for n > 1000 -- confirmed live: a 7-day window has
//      ~68k rows platform-wide across 20 properties, but a single
//      `.limit(500000)` call returned exactly 1000 rows (whatever order
//      Postgres happened to return first), massively undercounting or
//      missing most properties (e.g. stretchny.com read as 0 recent
//      impressions when its real impressions were 100-200+/day).
//   3. Paginating platform-wide with `.range()` but no explicit `.order()`
//      is non-deterministic across separate requests (Postgres gives no row
//      -order guarantee without one) -- confirmed live: repeated identical
//      calls returned different, overlapping/incomplete row sets, still
//      undercounting (stretchny.com's true 899 baseline impressions came
//      back as 440). Adding `.order('id')` platform-wide fixed correctness
//      but then the ORDER BY itself timed out at real scale (no index
//      supports "order by id, filtered by date, across all properties").
//      Fix: query per-property instead of platform-wide. seo_metrics has a
//      composite (property, date) index — `.eq('property', p)` pins the
//      leading column, so `.order('date')` on top of that IS
//      index-supported and reliably fast (confirmed live: stretchny.com's
//      899 baseline matched a raw SQL SUM exactly; wepayyoujunkremoval.com,
//      the platform's largest property, paginated 14,700 rows across 15
//      pages with zero timeouts). Per-property fetches run concurrently
//      (Promise.all across properties) so wall-clock time is bounded by the
//      single largest property's page count, not the sum of all of them.
//
// Self-healing like seo-health's site_down check: clears prior index_cliff
// issues and re-writes only what's currently cliffed, so a property that
// recovers stops showing as an issue automatically.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'

const PAGE_SIZE = 1000
// Safety cap per property so a query that somehow never returns a short
// page can't loop forever -- 50 pages is 50k rows, well beyond any single
// property's real weekly volume (the platform's largest property, verified
// live, needed 15 pages for a 7-day window).
const MAX_PAGES_PER_PROPERTY = 50

/** Pages through one property's seo_metrics date-range query. Index-backed (property,date) — reliable at scale, unlike an unfiltered platform-wide scan. */
async function fetchImpressionsForProperty(property: string, startDate: string, endDate: string): Promise<number> {
  let total = 0
  for (let page = 0; page < MAX_PAGES_PER_PROPERTY; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await supabaseAdmin
      .from('seo_metrics')
      .select('impressions')
      .eq('property', property)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`seo_metrics fetch failed for ${property}: ${error.message}`)
    const rows = (data as { impressions: number | null }[] | null) || []
    total += rows.reduce((sum, r) => sum + (r.impressions || 0), 0)
    if (rows.length < PAGE_SIZE) break
  }
  return total
}

const RECENT_WINDOW_DAYS = 7
const BASELINE_WINDOW_DAYS = 7
// Ignore properties with too little baseline traffic to avoid noisy
// false-positive "cliffs" on a property that only ever had a handful of
// impressions (e.g. 3 -> 0 is a 100% drop but not a real signal).
const MIN_BASELINE_IMPRESSIONS = 50
// A drop this severe or worse trips the alert. 0.6 (60%) errs toward real
// signal over noise -- normal week-to-week GSC variance for an established
// property is well under this for total impressions.
const CLIFF_DROP_THRESHOLD = 0.6
// Above this, severity escalates from 'high' to 'critical' (matches
// site_down's severity so seo-alerts treats a near-total collapse the same
// way it treats a fully down site).
const CRITICAL_DROP_THRESHOLD = 0.85

export type IndexCliffResult = {
  property: string
  domain: string
  tenant_id: string | null
  baselineImpressions: number
  recentImpressions: number
  dropPct: number
}

type PropertyMeta = { property: string; domain: string | null; tenant_id: string | null }

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Pure read + compute -- no writes. Safe to call for diagnostics/dry runs. */
export async function detectIndexCliffs(): Promise<{ checked: number; cliffs: IndexCliffResult[] }> {
  // Anchor windows off (now - 2 days), not "today" -- GSC data lags ~2-3
  // days behind real time, the same assumption ingestAllProperties() already
  // makes for its own pull window (see ingest.ts). Anchoring on "today"
  // would make the most recent window always look artificially empty (a
  // false 100% cliff on every property). A live-queried MAX(date) was tried
  // first and found to time out in prod for the same reason as bug #3 above
  // (no index supports an unfiltered `ORDER BY date DESC` at this scale) --
  // this fixed anchor avoids that query entirely.
  const latest = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const recentStart = new Date(latest)
  recentStart.setUTCDate(recentStart.getUTCDate() - (RECENT_WINDOW_DAYS - 1))
  const baselineEnd = new Date(recentStart)
  baselineEnd.setUTCDate(baselineEnd.getUTCDate() - 1)
  const baselineStart = new Date(baselineEnd)
  baselineStart.setUTCDate(baselineStart.getUTCDate() - (BASELINE_WINDOW_DAYS - 1))

  const recentStartStr = ymd(recentStart)
  const latestStr = ymd(latest)
  const baselineStartStr = ymd(baselineStart)
  const baselineEndStr = ymd(baselineEnd)

  const { data: propertiesData, error: propertiesError } = await supabaseAdmin
    .from('seo_properties')
    .select('property, domain, tenant_id')
  if (propertiesError) throw new Error(propertiesError.message)
  const properties = (propertiesData as PropertyMeta[] | null) || []

  const perProperty = await Promise.all(
    properties.map(async (meta) => {
      const [recentImpressions, baselineImpressions] = await Promise.all([
        fetchImpressionsForProperty(meta.property, recentStartStr, latestStr),
        fetchImpressionsForProperty(meta.property, baselineStartStr, baselineEndStr),
      ])
      return { meta, recentImpressions, baselineImpressions }
    })
  )

  const cliffs: IndexCliffResult[] = []
  let checked = 0
  for (const { meta, recentImpressions, baselineImpressions } of perProperty) {
    if (baselineImpressions < MIN_BASELINE_IMPRESSIONS) continue
    checked++
    const dropPct = (baselineImpressions - recentImpressions) / baselineImpressions
    if (dropPct >= CLIFF_DROP_THRESHOLD) {
      cliffs.push({
        property: meta.property,
        domain: meta.domain || meta.property,
        tenant_id: meta.tenant_id ?? null,
        baselineImpressions,
        recentImpressions,
        dropPct,
      })
    }
  }

  return { checked, cliffs }
}

/** Detect + persist. Clears prior index_cliff issues, re-opens current ones. */
export async function runIndexCliffCheck(): Promise<{ checked: number; cliffs: IndexCliffResult[] }> {
  const result = await detectIndexCliffs()

  await supabaseAdmin.from('seo_issues').delete().eq('type', 'index_cliff')
  if (result.cliffs.length) {
    await supabaseAdmin.from('seo_issues').insert(
      result.cliffs.map((c) => ({
        property: c.property,
        tenant_id: c.tenant_id,
        type: 'index_cliff',
        severity: c.dropPct >= CRITICAL_DROP_THRESHOLD ? 'critical' : 'high',
        tier: 0,
        status: 'open',
        target_url: `https://${c.domain}/`,
        detail: {
          baseline_impressions: c.baselineImpressions,
          recent_impressions: c.recentImpressions,
          drop_pct: Math.round(c.dropPct * 100),
          window_days: RECENT_WINDOW_DAYS,
        },
      }))
    )
  }

  return result
}
