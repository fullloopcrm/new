// ---------------------------------------------------------------------------
// SIGNAL ingest — Phase 1 data spine.
//
// 1. Discover every property the service account can read (sites.list).
// 2. Upsert each into seo_properties, linked to a tenant via tenant_domains.
// 3. Pull daily Search Analytics (date × page × query) per property, tag intent
//    (customer vs applicant), and upsert into seo_metrics.
//
// Idempotent — safe to re-run; upserts key on the unique (property,date,page,
// query) index. Per-property try/catch so one bad property can't sink the run.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { listSites, querySearchAnalytics, type GscSite } from './gsc'
import { classifyIntent } from './intent'
import { commercialIntent } from './commercial'
import { backfillUntrackedDomains } from './onboarding'

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** 'sc-domain:thenycmaid.com' -> 'thenycmaid.com'; 'https://x.com/' -> 'x.com' */
function propertyToDomain(property: string): string {
  if (property.startsWith('sc-domain:')) return property.slice('sc-domain:'.length)
  try {
    return new URL(property).hostname.replace(/^www\./, '')
  } catch {
    return property
  }
}

async function linkTenant(domain: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tenant_domains')
    .select('tenant_id')
    .eq('domain', domain)
    .limit(1)
    .maybeSingle()
  return data?.tenant_id ?? null
}

async function upsertProperty(site: GscSite): Promise<void> {
  const domain = propertyToDomain(site.siteUrl)
  const tenant_id = await linkTenant(domain)
  await supabaseAdmin.from('seo_properties').upsert(
    {
      property: site.siteUrl,
      domain,
      tenant_id,
      label: domain,
      permission: site.permissionLevel,
    },
    { onConflict: 'property' },
  )
}

type IngestResult = { property: string; rows: number; error?: string }

async function ingestProperty(site: GscSite, startDate: string, endDate: string): Promise<IngestResult> {
  try {
    // High cap so the biggest properties aren't truncated (default is 25k,
    // which silently drops rows on high-traffic sites). GSC paginates via startRow.
    const rows = await querySearchAnalytics(
      site.siteUrl,
      { startDate, endDate, dimensions: ['date', 'page', 'query'] },
      500000,
    )

    const records = rows.map((r) => {
      const [date, page = '', query = ''] = r.keys ?? []
      return {
        property: site.siteUrl,
        date,
        page,
        query,
        intent: classifyIntent(query),
        commercial: commercialIntent(query),
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }
    })

    // Chunked upsert — keep payloads well under Supabase limits.
    const CHUNK = 500
    for (let i = 0; i < records.length; i += CHUNK) {
      const slice = records.slice(i, i + CHUNK)
      const { error } = await supabaseAdmin
        .from('seo_metrics')
        .upsert(slice, { onConflict: 'property,date,page,query' })
      if (error) throw new Error(error.message)
    }

    await supabaseAdmin
      .from('seo_properties')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
      .update({ last_ingest_at: new Date().toISOString() })
      .eq('property', site.siteUrl)

    return { property: site.siteUrl, rows: records.length }
  } catch (e) {
    return { property: site.siteUrl, rows: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Full ingest across every granted property. `days` = how far back to pull
 * (GSC data lags ~2–3 days, so the window ends 2 days ago).
 */
export async function ingestAllProperties(opts?: { days?: number }): Promise<{
  properties: number
  totalRows: number
  results: IngestResult[]
}> {
  const days = opts?.days ?? 30
  const end = new Date(Date.now() - 2 * 86_400_000)
  const start = new Date(end.getTime() - days * 86_400_000)
  const startDate = ymd(start)
  const endDate = ymd(end)

  // Catch any tenant domain that never got registered into seo_properties
  // (e.g. activated before the onboarding hook existed) — otherwise it stays
  // silently untracked forever, since nothing else ever calls this.
  await backfillUntrackedDomains()

  const sites = await listSites()

  // Register/refresh the property registry first.
  for (const site of sites) await upsertProperty(site)

  // Then ingest metrics per property.
  const results: IngestResult[] = []
  for (const site of sites) {
    results.push(await ingestProperty(site, startDate, endDate))
  }

  // Rebuild the materialized rollup detection reads from (fresh data + top-query
  // value). Done here in the 300s ingest budget so detect stays a ~1s call.
  await supabaseAdmin.rpc('seo_refresh_rollup')

  return {
    properties: sites.length,
    totalRows: results.reduce((n, r) => n + r.rows, 0),
    results,
  }
}
