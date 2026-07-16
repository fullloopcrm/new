// ---------------------------------------------------------------------------
// SIGNAL indexation-cliff detection (SEOMGR-NEXT-SESSION.md step 3).
//
// seo-technical already pulls each property's sitemaps weekly and upserts
// Google's own reported indexed count into seo_sitemaps.contents — but that
// row is overwritten in place, so a collapse (e.g. homeservicesbusinesscrm.com
// going 19k -> 1,005 indexed pages) leaves no trace to compare against. This
// module snapshots the summed indexed count per property per day into
// seo_index_snapshots, then compares the latest snapshot against a trailing
// baseline and opens/clears an 'index_cliff' seo_issues row on a real drop.
//
// tier is always 0 (matches site_down in health.ts) — both are fleet-eye
// issues meant to page a human, not feed the deterministic auto-fix queue.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import type { SitemapEntry } from './gsc'

const BASELINE_WINDOW_DAYS = 30
const MIN_BASELINE_FOR_ALERT = 25 // skip brand-new/tiny properties — not enough signal to call a "cliff"

const CRITICAL_DROP_PCT = 0.7
const HIGH_DROP_PCT = 0.4
const MEDIUM_DROP_PCT = 0.2

type SitemapContentEntry = { type?: string; submitted?: string | number; indexed?: string | number }

export type IndexCounts = { indexed: number; submitted: number }

export type Property = { property: string; tenant_id: string | null }

export type CliffResult = {
  flagged: boolean
  severity?: 'critical' | 'high' | 'medium'
  dropPct?: number
  baselineIndexed?: number
  currentIndexed?: number
}

/** Sum Google's per-sitemap `contents[].indexed`/`submitted` across all of a property's sitemaps. */
export function sumIndexedFromSitemapEntries(entries: SitemapEntry[]): IndexCounts {
  let indexed = 0
  let submitted = 0
  for (const entry of entries) {
    const contents = (entry.contents ?? []) as SitemapContentEntry[]
    for (const c of contents) {
      indexed += Number(c.indexed ?? 0) || 0
      submitted += Number(c.submitted ?? 0) || 0
    }
  }
  return { indexed, submitted }
}

/** Same sum, but from what's already persisted in seo_sitemaps (no fresh GSC call). */
export function sumIndexedFromStoredContents(rows: Array<{ contents: unknown }>): IndexCounts {
  return sumIndexedFromSitemapEntries(rows.map((r) => ({ contents: (r.contents ?? []) as unknown[] })))
}

/** Upsert today's snapshot for a property (idempotent — safe to re-run same day). */
export async function captureIndexSnapshot(prop: Property, counts: IndexCounts): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabaseAdmin.from('seo_index_snapshots').upsert(
    {
      property: prop.property,
      tenant_id: prop.tenant_id,
      indexed_count: counts.indexed,
      submitted_count: counts.submitted,
      snapshot_date: today,
    },
    { onConflict: 'property,snapshot_date' },
  )
  if (error) throw new Error(`captureIndexSnapshot ${prop.property}: ${error.message}`)
}

function severityForDrop(dropPct: number): 'critical' | 'high' | 'medium' | null {
  if (dropPct >= CRITICAL_DROP_PCT) return 'critical'
  if (dropPct >= HIGH_DROP_PCT) return 'high'
  if (dropPct >= MEDIUM_DROP_PCT) return 'medium'
  return null
}

/**
 * Compare the latest snapshot against the trailing-30-day peak. Opens an
 * 'index_cliff' issue on a real drop, clears it if the property has recovered
 * (or never had enough history/volume to alert on in the first place).
 */
export async function evaluateIndexCliff(prop: Property): Promise<CliffResult> {
  const { data, error } = await supabaseAdmin
    .from('seo_index_snapshots')
    .select('indexed_count,snapshot_date')
    .eq('property', prop.property)
    .order('snapshot_date', { ascending: false })
    .limit(60)
  if (error) throw new Error(`evaluateIndexCliff ${prop.property}: ${error.message}`)

  const snapshots = (data ?? []) as Array<{ indexed_count: number; snapshot_date: string }>
  const result = computeCliff(snapshots)

  await supabaseAdmin
    .from('seo_issues')
    .delete()
    .eq('property', prop.property)
    .eq('type', 'index_cliff')
    .eq('status', 'open')

  if (result.flagged) {
    const { error: insertError } = await supabaseAdmin.from('seo_issues').insert({
      property: prop.property,
      tenant_id: prop.tenant_id,
      type: 'index_cliff',
      severity: result.severity,
      tier: 0,
      status: 'open',
      detail: {
        baseline_indexed: result.baselineIndexed,
        current_indexed: result.currentIndexed,
        drop_pct: result.dropPct !== undefined ? Math.round(result.dropPct * 1000) / 10 : null,
        baseline_window_days: BASELINE_WINDOW_DAYS,
      },
    })
    if (insertError) throw new Error(`evaluateIndexCliff insert ${prop.property}: ${insertError.message}`)
  }

  return result
}

/** Pure comparison logic — separated from the DB calls so it's cheap to reason about/test. */
export function computeCliff(
  snapshotsDesc: Array<{ indexed_count: number; snapshot_date: string }>,
): CliffResult {
  if (snapshotsDesc.length < 2) return { flagged: false }

  const [current, ...rest] = snapshotsDesc
  const cutoff = new Date(current.snapshot_date)
  cutoff.setDate(cutoff.getDate() - BASELINE_WINDOW_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const baselineCandidates = rest.filter((s) => s.snapshot_date >= cutoffStr)
  if (!baselineCandidates.length) return { flagged: false }

  const baselineIndexed = Math.max(...baselineCandidates.map((s) => s.indexed_count))
  if (baselineIndexed < MIN_BASELINE_FOR_ALERT) return { flagged: false }

  const dropPct = (baselineIndexed - current.indexed_count) / baselineIndexed
  const severity = severityForDrop(dropPct)
  if (!severity) return { flagged: false, dropPct, baselineIndexed, currentIndexed: current.indexed_count }

  return {
    flagged: true,
    severity,
    dropPct,
    baselineIndexed,
    currentIndexed: current.indexed_count,
  }
}

/** Convenience for callers that already have freshly-fetched sitemap entries (e.g. runTechnicalScan). */
export async function captureAndEvaluate(prop: Property, entries: SitemapEntry[]): Promise<CliffResult> {
  const counts = sumIndexedFromSitemapEntries(entries)
  await captureIndexSnapshot(prop, counts)
  return evaluateIndexCliff(prop)
}

export type FleetIndexCliffResult = {
  properties: number
  captured: number
  flagged: number
  skipped: string[]
}

/**
 * Standalone fleet pass — reads whatever seo_sitemaps already has persisted
 * (no fresh GSC call, so it's free to run more often than the weekly
 * technical scan that populates seo_sitemaps in the first place).
 */
export async function runIndexCliffScan(): Promise<FleetIndexCliffResult> {
  const { data: props } = await supabaseAdmin
    .from('seo_properties')
    .select('property,tenant_id')
    .eq('enabled', true)
  const properties = (props ?? []) as Property[]

  const out: FleetIndexCliffResult = { properties: properties.length, captured: 0, flagged: 0, skipped: [] }

  for (const prop of properties) {
    try {
      const { data: sitemapRows } = await supabaseAdmin
        .from('seo_sitemaps')
        .select('contents')
        .eq('property', prop.property)
      if (!sitemapRows?.length) {
        out.skipped.push(`${prop.property}: no sitemap data yet`)
        continue
      }
      const counts = sumIndexedFromStoredContents(sitemapRows as Array<{ contents: unknown }>)
      await captureIndexSnapshot(prop, counts)
      out.captured++
      const result = await evaluateIndexCliff(prop)
      if (result.flagged) out.flagged++
    } catch (e) {
      out.skipped.push(`${prop.property}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return out
}
