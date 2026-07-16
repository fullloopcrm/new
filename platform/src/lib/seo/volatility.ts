// ---------------------------------------------------------------------------
// seomgr — fleet-wide SERP volatility / algorithm-rollout monitor.
//
// Approved scope (Jeff, 2026-07-16): monitor + alert ONLY. No automatic
// schema/content changes here — this only tells a human a rollout probably
// happened so they can decide what, if anything, to act on.
//
// Why fleet-wide, not per-page: any single page's ranking swings day to day
// from ordinary noise — that's what verify-revert's REVERT_THRESHOLD already
// accounts for. A real Google algorithm update reads differently: MANY
// properties move together, same direction, same day. That correlation
// across independently-owned-content properties is the actual signal — one
// bad page is noise, a fifth of the fleet moving 3+ positions on the same day
// is not. Built entirely on data already being collected (seo_metrics from
// the existing GSC ingest) — no new paid API/vendor decision made here.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'

const RECENT_DAYS = 2 // "today" window — GSC data lags ~2-3 days
const BASELINE_DAYS = 7 // prior window compared against
const BASELINE_GAP_DAYS = 3 // gap between recent and baseline windows (avoid overlap with GSC lag)
const PER_PROPERTY_THRESHOLD = 2 // position swing worth counting as "moved"
const MIN_FLEET_FRACTION = 0.3 // 30% of measured properties moving = correlated, not noise
const MIN_ABSOLUTE_MOVED = 3 // guard against a false positive on a small fleet

export type PropertyDelta = {
  property: string
  domain: string | null
  recentPosition: number
  baselinePosition: number
  delta: number // negative = improved (lower is better), positive = worsened
}

export type VolatilityVerdict = {
  detected: boolean
  measured: number
  moved: number
  fraction: number
  directionality: 'worsened' | 'improved' | 'mixed' | null
}

/**
 * Pure classifier: given each property's position delta, decide whether the
 * fleet shows correlated movement (a probable rollout) vs. isolated noise.
 */
export function classifyVolatility(deltas: PropertyDelta[]): VolatilityVerdict {
  const measured = deltas.length
  const moved = deltas.filter((d) => Math.abs(d.delta) >= PER_PROPERTY_THRESHOLD)
  const fraction = measured > 0 ? moved.length / measured : 0

  let directionality: VolatilityVerdict['directionality'] = null
  if (moved.length > 0) {
    const worsened = moved.filter((d) => d.delta > 0).length
    const improved = moved.length - worsened
    if (worsened > 0 && improved === 0) directionality = 'worsened'
    else if (improved > 0 && worsened === 0) directionality = 'improved'
    else directionality = 'mixed'
  }

  // Confirmed live 2026-07-16: a real run against this fleet (most properties
  // rank deep, 20-90 — inherently noisier day to day than page-1 rankings)
  // hit the count+fraction bar with 'mixed' directionality on the very first
  // try — i.e. ordinary noise, not a rollout. A real algorithm update pushes
  // the fleet the SAME way; 'mixed' is exactly the noise signature this
  // metric was meant to exclude, so require a real skew, not just volume.
  const detected = moved.length >= MIN_ABSOLUTE_MOVED && fraction >= MIN_FLEET_FRACTION && directionality !== 'mixed' && directionality !== null
  return { detected, measured, moved: moved.length, fraction, directionality }
}

async function avgPosition(property: string, startDate: string, endDate: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('seo_metrics')
    .select('position,impressions')
    .eq('property', property)
    .gte('date', startDate)
    .lte('date', endDate)
  const rows = (data ?? []) as Array<{ position: number; impressions: number }>
  if (!rows.length) return null
  const wsum = rows.reduce((a, r) => a + (r.impressions || 0), 0)
  if (wsum === 0) return rows.reduce((a, r) => a + r.position, 0) / rows.length
  return rows.reduce((a, r) => a + r.position * (r.impressions || 0), 0) / wsum
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)

export async function computeFleetDeltas(): Promise<PropertyDelta[]> {
  const { data: props } = await supabaseAdmin.from('seo_properties').select('property,domain').eq('enabled', true)

  const now = Date.now()
  const recentEnd = ymd(new Date(now - BASELINE_GAP_DAYS * 86_400_000))
  const recentStart = ymd(new Date(now - (BASELINE_GAP_DAYS + RECENT_DAYS) * 86_400_000))
  const baselineEnd = ymd(new Date(now - (BASELINE_GAP_DAYS + RECENT_DAYS) * 86_400_000))
  const baselineStart = ymd(new Date(now - (BASELINE_GAP_DAYS + RECENT_DAYS + BASELINE_DAYS) * 86_400_000))

  const deltas: PropertyDelta[] = []
  for (const p of (props ?? []) as Array<{ property: string; domain: string | null }>) {
    const [recent, baseline] = await Promise.all([
      avgPosition(p.property, recentStart, recentEnd),
      avgPosition(p.property, baselineStart, baselineEnd),
    ])
    if (recent == null || baseline == null) continue
    deltas.push({
      property: p.property,
      domain: p.domain,
      recentPosition: Math.round(recent * 10) / 10,
      baselinePosition: Math.round(baseline * 10) / 10,
      delta: Math.round((recent - baseline) * 10) / 10,
    })
  }
  return deltas
}

export type VolatilityReport = VolatilityVerdict & { deltas: PropertyDelta[] }

export async function checkFleetVolatility(): Promise<VolatilityReport> {
  const deltas = await computeFleetDeltas()
  const verdict = classifyVolatility(deltas)
  return { ...verdict, deltas }
}
