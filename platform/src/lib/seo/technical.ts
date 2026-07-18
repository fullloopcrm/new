// ---------------------------------------------------------------------------
// SIGNAL technical SEO — the foundation the rest of the engine stands on.
//
// A page Google hasn't indexed ranks nowhere, no matter how good its title or
// content. Until now SIGNAL was blind to that: it only ever saw pages that
// already had impressions (i.e. already indexed). This scan closes the gap —
// it reads each property's sitemaps, inspects a budgeted set of URLs via the
// URL Inspection API, and opens 'not_indexed' issues for pages the site wants
// indexed but Google isn't ranking.
//
// Quota-bounded: URL Inspection is ~2k/day/property, so we inspect at most
// URLS_PER_PROPERTY per run, prioritizing suspected-missing pages (in the
// sitemap, no impressions) over healthy money pages. Anything skipped is logged.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { listSitemaps, inspectUrl, type UrlInspection, type SitemapEntry } from './gsc'
import { captureAndEvaluate } from './index-cliff'
import { safeFetch } from '../ssrf'

const URLS_PER_PROPERTY = 20 // URL Inspection calls per property per run
const SITEMAP_URL_CAP = 800 // max <loc> entries we parse per property
const CHILD_SITEMAP_CAP = 15 // max child sitemaps to follow in a sitemap index
const INSPECT_CONCURRENCY = 6 // parallel URL Inspection calls (fits 300s cron budget)

type Property = { property: string; domain: string | null; tenant_id: string | null }

function propertyToDomain(property: string): string {
  if (property.startsWith('sc-domain:')) return property.slice('sc-domain:'.length)
  try {
    return new URL(property).hostname.replace(/^www\./, '')
  } catch {
    return property
  }
}

// A page is healthy when Google says it's indexed. Everything else is a problem
// worth surfacing (crawled-not-indexed, discovered-not-indexed, excluded, etc).
function isIndexed(r: UrlInspection): boolean {
  const cov = (r.coverageState ?? '').toLowerCase()
  if (r.verdict === 'PASS' && cov.includes('indexed') && !cov.includes('not indexed')) return true
  return false
}

// ---------------------------------------------------------------------------
// Sitemaps — health + the URL list to inspect against.
// ---------------------------------------------------------------------------
async function scanSitemaps(prop: Property): Promise<string[]> {
  let entries: SitemapEntry[]
  try {
    entries = await listSitemaps(prop.property)
  } catch {
    return []
  }

  const now = new Date().toISOString()
  for (const s of entries) {
    if (!s.path) continue
    await supabaseAdmin.from('seo_sitemaps').upsert(
      {
        property: prop.property,
        sitemap_url: s.path,
        is_pending: s.isPending ?? false,
        errors: Number(s.errors ?? 0),
        warnings: Number(s.warnings ?? 0),
        last_downloaded: s.lastDownloaded ?? null,
        contents: s.contents ?? [],
        checked_at: now,
      },
      { onConflict: 'property,sitemap_url' },
    )
  }

  // Indexation-cliff detection — snapshot today's summed indexed count and
  // compare against the trailing baseline (SEOMGR-NEXT-SESSION.md step 3).
  // Best-effort: a snapshot/detection failure shouldn't sink the technical scan.
  try {
    await captureAndEvaluate({ property: prop.property, tenant_id: prop.tenant_id }, entries)
  } catch (e) {
    console.error(`[seo/technical] index-cliff ${prop.property}: ${e instanceof Error ? e.message : e}`)
  }

  // Pull the actual <loc> URLs so we know what the site WANTS indexed.
  const sitemapUrls = entries.map((s) => s.path).filter(Boolean) as string[]
  return collectLocs(sitemapUrls)
}

/** Fetch + parse sitemap XML, following one level of sitemap-index nesting. */
async function collectLocs(sitemapUrls: string[]): Promise<string[]> {
  const locs = new Set<string>()
  const toFetch = [...sitemapUrls]
  let childrenFollowed = 0

  while (toFetch.length && locs.size < SITEMAP_URL_CAP) {
    const url = toFetch.shift() as string
    let xml = ''
    try {
      const res = await safeFetch(url)
      if (!res.ok) continue
      xml = await res.text()
    } catch {
      continue
    }

    const isIndex = /<sitemapindex[\s>]/i.test(xml)
    const found = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])

    if (isIndex) {
      for (const child of found) {
        if (childrenFollowed >= CHILD_SITEMAP_CAP) break
        toFetch.push(child)
        childrenFollowed++
      }
    } else {
      for (const u of found) {
        locs.add(u)
        if (locs.size >= SITEMAP_URL_CAP) break
      }
    }
  }
  return [...locs]
}

// ---------------------------------------------------------------------------
// Pick which URLs to spend inspection quota on.
// ---------------------------------------------------------------------------
async function indexedPages(property: string): Promise<Set<string>> {
  // Pages that already have impressions are, by definition, indexed.
  const { data } = await supabaseAdmin
    .from('seo_metrics')
    .select('page')
    .eq('property', property)
    .neq('page', '')
    .gte('date', new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10))
    .limit(5000)
  return new Set((data ?? []).map((r) => r.page as string))
}

async function selectUrls(prop: Property, sitemapLocs: string[]): Promise<string[]> {
  const indexed = await indexedPages(prop.property)
  // Suspected-missing first: in the sitemap but no impressions → maybe unindexed.
  const suspected = sitemapLocs.filter((u) => !indexed.has(u))
  // Fill remaining budget with high-traffic pages (health/canonical check).
  const { data: top } = await supabaseAdmin
    .from('seo_metrics')
    .select('page')
    .eq('property', prop.property)
    .neq('page', '')
    .order('impressions', { ascending: false })
    .limit(200)
  const money = [...new Set((top ?? []).map((r) => r.page as string))]

  const ordered = [...new Set([...suspected, ...money])]
  return ordered.slice(0, URLS_PER_PROPERTY)
}

// ---------------------------------------------------------------------------
// Inspect + persist + detect.
// ---------------------------------------------------------------------------
async function inspectOne(
  prop: Property,
  url: string,
  now: string,
): Promise<{ inspected: boolean; failed?: boolean; failReason?: string; problem?: Record<string, unknown> }> {
  let r: UrlInspection
  try {
    r = await inspectUrl(prop.property, url)
  } catch (e) {
    const failReason = e instanceof Error ? e.message : String(e)
    console.error(`[seo/technical] inspect ${url}: ${failReason}`)
    return { inspected: false, failed: true, failReason }
  }

  await supabaseAdmin.from('seo_url_status').upsert(
    {
      property: prop.property,
      url,
      index_status: r.verdict ?? null,
      coverage_state: r.coverageState ?? null,
      robots_state: r.robotsTxtState ?? null,
      canonical: r.googleCanonical ?? null,
      last_crawl_at: r.lastCrawlTime ?? null,
      rich_results: (r.richResults as object) ?? {},
      checked_at: now,
    },
    { onConflict: 'property,url' },
  )

  if (isIndexed(r)) return { inspected: true }

  const canonicalMismatch =
    !!r.userCanonical && !!r.googleCanonical && r.userCanonical !== r.googleCanonical
  return {
    inspected: true,
    problem: {
      property: prop.property,
      tenant_id: prop.tenant_id,
      type: 'not_indexed',
      severity: 'high',
      intent: 'customer',
      target_url: url,
      recipe: 'indexing',
      tier: 3, // needs investigation — not an auto title/meta fix
      status: 'open',
      value: 0,
      detail: {
        coverage_state: r.coverageState ?? null,
        verdict: r.verdict ?? null,
        robots_state: r.robotsTxtState ?? null,
        canonical_mismatch: canonicalMismatch,
        google_canonical: r.googleCanonical ?? null,
      },
    },
  }
}

async function inspectAndDetect(
  prop: Property,
  urls: string[],
): Promise<{ inspected: number; failed: number; failReason?: string; problems: Record<string, unknown>[] }> {
  const now = new Date().toISOString()
  const problems: Record<string, unknown>[] = []
  let inspected = 0
  let failed = 0
  let failReason: string | undefined

  // Inspect in small concurrent batches — sequential is too slow for the cron.
  for (let i = 0; i < urls.length; i += INSPECT_CONCURRENCY) {
    const batch = urls.slice(i, i + INSPECT_CONCURRENCY)
    const results = await Promise.all(batch.map((u) => inspectOne(prop, u, now)))
    for (const res of results) {
      if (res.inspected) inspected++
      if (res.failed) {
        failed++
        failReason = failReason ?? res.failReason
      }
      if (res.problem) problems.push(res.problem)
    }
  }

  return { inspected, failed, failReason, problems }
}

// Replace one property's open not_indexed backlog with this run's findings.
// Scoped to a single property and only called once we actually completed a
// scan for it — a property that got skipped this run (no URLs, every
// inspection failed, a thrown error) must keep whatever it had before, not
// have it wiped and left empty until the next run reaches it.
async function replaceNotIndexedIssues(property: string, problems: Record<string, unknown>[]): Promise<void> {
  await supabaseAdmin
    .from('seo_issues')
    .delete()
    .eq('status', 'open')
    .eq('type', 'not_indexed')
    .eq('property', property) // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
  if (problems.length) {
    const { error } = await supabaseAdmin.from('seo_issues').insert(problems)
    if (error) throw new Error(`not_indexed insert ${property}: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Orchestrator.
// ---------------------------------------------------------------------------
export type TechnicalScanResult = {
  properties: number
  scanned: number
  urlsInspected: number
  notIndexed: number
  skipped: string[]
}

export async function runTechnicalScan(opts?: { propertyLimit?: number }): Promise<TechnicalScanResult> {
  const { data: props } = await supabaseAdmin
    .from('seo_properties')
    .select('property,domain,tenant_id')
    .eq('enabled', true)
  let properties = (props ?? []) as Property[]
  if (opts?.propertyLimit) properties = properties.slice(0, opts.propertyLimit)

  const out: TechnicalScanResult = {
    properties: properties.length,
    scanned: 0,
    urlsInspected: 0,
    notIndexed: 0,
    skipped: [],
  }

  for (const prop of properties) {
    try {
      const locs = await scanSitemaps(prop)
      const urls = await selectUrls(prop, locs)
      if (!urls.length) {
        out.skipped.push(`${prop.domain ?? propertyToDomain(prop.property)}: no URLs to inspect`)
        continue
      }
      const { inspected, failed, failReason, problems } = await inspectAndDetect(prop, urls)
      out.urlsInspected += inspected
      // Every attempted inspection failing (GSC permission, quota, transient API
      // error — see inspectUrl's throw) previously looked identical to "scanned,
      // confirmed zero indexing problems": inspected=0/problems=0 either way, no
      // trace beyond a console.error nobody reads. A newly-verified property
      // whose service-account grant covers Search Analytics but not URL
      // Inspection would then permanently report clean with real ingest data
      // flowing in — the exact "fresh ingest, zero not_indexed rows" shape.
      // Surface it as skipped (same diagnostic channel as the no-URLs case)
      // instead of silently counting it as a clean scan — and, critically,
      // leave its existing not_indexed backlog alone: we have no fresh signal
      // for this property, so we must not delete what we already knew.
      if (inspected === 0 && failed > 0) {
        out.skipped.push(
          `${prop.domain ?? propertyToDomain(prop.property)}: ${failed}/${urls.length} URL inspections failed, 0 succeeded (last error: ${failReason ?? 'unknown'}) — check seo_properties.permission for this property`,
        )
        continue
      }
      // This property genuinely completed a scan this run — replace its
      // not_indexed state (may legitimately clear it to zero if truly clean).
      await replaceNotIndexedIssues(prop.property, problems)
      out.notIndexed += problems.length
      out.scanned++
    } catch (e) {
      out.skipped.push(`${prop.domain ?? propertyToDomain(prop.property)}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return out
}
