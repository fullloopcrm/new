// ---------------------------------------------------------------------------
// SIGNAL Core Web Vitals — real-user field data via the Chrome UX Report API.
//
// CrUX (not PageSpeed Insights) is the source: it's a direct lookup against
// Google's aggregated real-Chrome-user dataset — 150 queries/minute/project,
// free, no paid tier exists ("not possible to pay for an increased quota,"
// per Google's docs). PSI instead triggers a live Lighthouse run per request
// (synthetic lab data, slower, more tightly rate-limited) and is deprecating
// its bundled CrUX field data in favor of this API directly.
//
// Records one row per (property, url, form_factor) per run — seo_vitals has
// no unique constraint, so this is an append-only time series, not an upsert.
// Every property gets an origin-level check (PHONE + DESKTOP, always has the
// most traffic to aggregate against) plus page-level PHONE checks for its
// top-impression pages. Page-level CrUX queries 404 (NOT_FOUND) when a URL
// hasn't seen enough Chrome traffic to report on — that's expected and is
// skipped, not treated as an error.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'

const CRUX_ENDPOINT = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord'
const TOP_PAGES_PER_PROPERTY = 5 // page-level CrUX checks per property per run
const FORM_FACTORS: FormFactor[] = ['PHONE', 'DESKTOP']
const MIN_CALL_INTERVAL_MS = 450 // ~133/min, under the 150/min CrUX quota with headroom

export type FormFactor = 'PHONE' | 'DESKTOP'

type Property = { property: string; domain: string | null; tenant_id: string | null }

type CruxMetrics = { lcp: number | null; inp: number | null; cls: number | null }

type VitalsRow = {
  property: string
  url: string
  form_factor: FormFactor
  lcp: number | null
  inp: number | null
  cls: number | null
  source: 'crux'
}

function propertyToDomain(property: string): string {
  if (property.startsWith('sc-domain:')) return property.slice('sc-domain:'.length)
  try {
    return new URL(property).hostname.replace(/^www\./, '')
  } catch {
    return property
  }
}

function requireApiKey(): string {
  const key = process.env.CRUX_API_KEY
  if (!key) throw new Error('CRUX_API_KEY not configured')
  return key
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Shared pacer across every CrUX call in a run, so concurrent-looking property
// loops still respect one project-wide 150/min budget.
let lastCallAt = 0
async function throttle(): Promise<void> {
  const now = Date.now()
  const wait = lastCallAt + MIN_CALL_INTERVAL_MS - now
  lastCallAt = Math.max(now, lastCallAt + MIN_CALL_INTERVAL_MS)
  if (wait > 0) await sleep(wait)
}

/** Query CrUX for one target + form factor. Returns null on 404 (insufficient Chrome data for that URL/origin — not an error). */
async function queryCrux(target: { origin: string } | { url: string }, formFactor: FormFactor): Promise<CruxMetrics | null> {
  const key = requireApiKey()
  await throttle()
  const res = await fetch(`${CRUX_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...target, formFactor }),
  })
  if (res.status === 404) return null
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`CrUX API failed (${res.status}): ${JSON.stringify(json)}`)
  }
  const metrics = (json?.record?.metrics ?? {}) as Record<string, { percentiles?: { p75?: number } }>
  return {
    lcp: metrics.largest_contentful_paint?.percentiles?.p75 ?? null,
    inp: metrics.interaction_to_next_paint?.percentiles?.p75 ?? null,
    cls: metrics.cumulative_layout_shift?.percentiles?.p75 ?? null,
  }
}

async function topPages(property: string, limit: number): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('seo_metrics')
    .select('page')
    .eq('property', property)
    .neq('page', '')
    .order('impressions', { ascending: false })
    .limit(limit * 20) // headroom for dedupe — same page repeats across date/query rows
  const pages = [...new Set((data ?? []).map((r) => r.page as string))]
  return pages.slice(0, limit)
}

async function scanProperty(prop: Property): Promise<{ rows: VitalsRow[]; errors: string[] }> {
  const rows: VitalsRow[] = []
  const errors: string[] = []
  const domain = prop.domain ?? propertyToDomain(prop.property)
  const origin = `https://${domain}`

  for (const formFactor of FORM_FACTORS) {
    try {
      const metrics = await queryCrux({ origin }, formFactor)
      if (metrics) rows.push({ property: prop.property, url: origin, form_factor: formFactor, source: 'crux', ...metrics })
    } catch (e) {
      errors.push(`${domain} origin/${formFactor}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const pages = await topPages(prop.property, TOP_PAGES_PER_PROPERTY)
  for (const page of pages) {
    try {
      const metrics = await queryCrux({ url: page }, 'PHONE')
      if (metrics) rows.push({ property: prop.property, url: page, form_factor: 'PHONE', source: 'crux', ...metrics })
    } catch (e) {
      errors.push(`${page} PHONE: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { rows, errors }
}

export type VitalsScanResult = {
  properties: number
  scanned: number
  recorded: number
  skipped: string[]
}

export async function runVitalsScan(opts?: { propertyLimit?: number }): Promise<VitalsScanResult> {
  const { data: props } = await supabaseAdmin
    .from('seo_properties')
    .select('property,domain,tenant_id')
    .eq('enabled', true)
  let properties = (props ?? []) as Property[]
  if (opts?.propertyLimit) properties = properties.slice(0, opts.propertyLimit)

  const out: VitalsScanResult = { properties: properties.length, scanned: 0, recorded: 0, skipped: [] }
  const allRows: VitalsRow[] = []

  for (const prop of properties) {
    const { rows, errors } = await scanProperty(prop)
    allRows.push(...rows)
    out.skipped.push(...errors)
    out.scanned++
  }

  if (allRows.length) {
    const now = new Date().toISOString()
    const records = allRows.map((r) => ({ ...r, checked_at: now }))
    const CHUNK = 500
    for (let i = 0; i < records.length; i += CHUNK) {
      const slice = records.slice(i, i + CHUNK)
      const { error } = await supabaseAdmin.from('seo_vitals').insert(slice)
      if (error) throw new Error(`seo_vitals insert failed: ${error.message}`)
    }
  }
  out.recorded = allRows.length
  return out
}
