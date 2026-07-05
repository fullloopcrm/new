// ---------------------------------------------------------------------------
// SIGNAL competitor review — the SERP-facing half of the engine.
//
// Flow (weekly, per property):
//   1. selectMoneyKeywords  — GSC queries worth spending a SERP call on
//   2. scanProperty         — live top-10 for each, stored in seo_serp
//   3. computeCompetitors   — leaderboard of who outranks us (seo_competitors)
//   4. detectCompetitorGaps — winnable "they're above me" issues (seo_issues)
//
// Cost is bounded by KEYWORDS_PER_PROPERTY: one Serper call per tracked keyword,
// and we only track keywords with real demand where we already rank <= 30. At
// ~$0.0003/query that's cents per property per week. Anything skipped is logged,
// never silently dropped.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { fetchSerp, serpEnabled, urlToDomain, type SerpOrganic } from './serp'
import { commercialIntent, commercialWeight, type Commercial } from './commercial'

// --- tuning knobs -----------------------------------------------------------
const KEYWORDS_PER_PROPERTY = 15 // SERP calls per property per run (cost cap)
const CANDIDATE_POOL = 60 // top-by-demand queries to classify before capping
const STRIKING_MAX_POS = 20 // only flag gaps where we're already on page 1–2
const SERP_NUM = 20 // depth: must cover the striking band (11–20) so we find ourselves on page 2

// Aggregator/directory domains — they outrank everyone locally but aren't peers
// you beat with a title tweak. Tracked but flagged so the leaderboard stays honest.
const DIRECTORY_DOMAINS = new Set([
  'yelp.com', 'thumbtack.com', 'angi.com', 'angieslist.com', 'homeadvisor.com',
  'bark.com', 'porch.com', 'houzz.com', 'nextdoor.com', 'yellowpages.com',
  'bbb.org', 'mapquest.com', 'facebook.com', 'instagram.com', 'google.com',
  'tripadvisor.com', 'expertise.com', 'birdeye.com', 'nicelocal.com',
  'chamberofcommerce.com', 'manta.com', 'superpages.com',
])

const isDirectory = (domain: string) => DIRECTORY_DOMAINS.has(domain)

type Property = { property: string; domain: string | null; tenant_id: string | null }

type MoneyKeyword = {
  query: string
  impressions: number
  best_position: number
  commercial: Commercial
}

/** Value of an opportunity = demand × how ready-to-buy the query is. */
function keywordValue(impressions: number, commercial: Commercial): number {
  return Math.round(impressions * commercialWeight(commercial))
}

// ---------------------------------------------------------------------------
// 1. Which keywords are worth a SERP call.
// ---------------------------------------------------------------------------
async function selectMoneyKeywords(property: string): Promise<MoneyKeyword[]> {
  const { data, error } = await supabaseAdmin.rpc('seo_money_keywords', {
    p_property: property,
    p_limit: CANDIDATE_POOL,
  })
  if (error) throw new Error(`money_keywords(${property}): ${error.message}`)

  const rows = (data ?? []) as Array<{ query: string; impressions: number; best_position: number }>
  return rows
    .map((r) => ({
      query: r.query,
      impressions: Number(r.impressions) || 0,
      best_position: Number(r.best_position) || 0,
      commercial: commercialIntent(r.query),
    }))
    // Informational queries don't convert — spend SERP budget on money terms.
    .filter((k) => k.commercial !== 'informational')
    // Drop search operators (site:, inurl:) and pure-brand lookups: operators are
    // rejected by free Serper accounts, and brand terms we already own #1.
    .filter((k) => !/^\s*(site:|inurl:|intitle:)/i.test(k.query))
    .sort((a, b) => keywordValue(b.impressions, b.commercial) - keywordValue(a.impressions, a.commercial))
    .slice(0, KEYWORDS_PER_PROPERTY)
}

// ---------------------------------------------------------------------------
// 2. Scan the SERP for each keyword and persist it.
// ---------------------------------------------------------------------------
function ourRank(organic: SerpOrganic[], ourDomain: string | null): { pos: number | null; url: string | null } {
  if (!ourDomain) return { pos: null, url: null }
  const mine = organic.find((o) => o.domain === ourDomain)
  return mine ? { pos: mine.position, url: mine.url } : { pos: null, url: null }
}

async function scanProperty(prop: Property, keywords: MoneyKeyword[]): Promise<number> {
  const ourDomain = prop.domain ? prop.domain.replace(/^www\./, '').toLowerCase() : null
  const today = new Date().toISOString().slice(0, 10)
  let scanned = 0

  for (const kw of keywords) {
    try {
      const serp = await fetchSerp(kw.query, { num: SERP_NUM })
      const { pos, url } = ourRank(serp.organic, ourDomain)
      const { error } = await supabaseAdmin.from('seo_serp').upsert(
        {
          property: prop.property,
          tenant_id: prop.tenant_id,
          query: kw.query,
          our_domain: ourDomain,
          our_position: pos,
          our_url: url,
          results: serp.organic,
          commercial: kw.commercial,
          impressions: kw.impressions,
          checked_at: today,
        },
        { onConflict: 'property,query,checked_at' },
      )
      if (error) throw new Error(error.message)
      scanned++
    } catch (e) {
      // One bad query (rate limit, odd chars) shouldn't sink the property's run.
      console.error(`[seo/competitors] scan ${prop.property} "${kw.query}": ${e instanceof Error ? e.message : e}`)
    }
  }
  return scanned
}

// ---------------------------------------------------------------------------
// 3. Roll up who outranks us across the tracked set.
// ---------------------------------------------------------------------------
type SerpRow = {
  query: string
  our_position: number | null
  results: SerpOrganic[]
  tenant_id: string | null
}

async function todaysSerps(property: string): Promise<SerpRow[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabaseAdmin
    .from('seo_serp')
    .select('query,our_position,results,tenant_id')
    .eq('property', property)
    .eq('checked_at', today)
  return (data ?? []) as SerpRow[]
}

async function computeCompetitors(prop: Property, serps: SerpRow[]): Promise<number> {
  const ourDomain = prop.domain ? prop.domain.replace(/^www\./, '').toLowerCase() : ''

  // domain -> tally
  type Tally = { ahead: number; seen: number; positions: number[]; queries: string[] }
  const byDomain = new Map<string, Tally>()

  for (const s of serps) {
    const ourPos = s.our_position ?? Infinity // not ranked = everyone is "ahead"
    for (const o of s.results) {
      if (!o.domain || o.domain === ourDomain) continue
      const t = byDomain.get(o.domain) ?? { ahead: 0, seen: 0, positions: [], queries: [] }
      t.seen++
      t.positions.push(o.position)
      if (o.position < ourPos) {
        t.ahead++
        if (t.queries.length < 5) t.queries.push(s.query)
      }
      byDomain.set(o.domain, t)
    }
  }

  const rows = [...byDomain.entries()]
    .filter(([, t]) => t.ahead > 0) // only domains that actually beat us somewhere
    .map(([domain, t]) => ({
      property: prop.property,
      tenant_id: prop.tenant_id,
      competitor_domain: domain,
      keywords_ahead: t.ahead,
      keywords_seen: t.seen,
      avg_position: Math.round((t.positions.reduce((a, b) => a + b, 0) / t.positions.length) * 100) / 100,
      best_position: Math.min(...t.positions),
      is_directory: isDirectory(domain),
      sample_queries: t.queries,
      computed_at: new Date().toISOString(),
    }))

  // Rebuild this property's leaderboard from scratch each run.
  await supabaseAdmin.from('seo_competitors').delete().eq('property', prop.property)
  if (rows.length) {
    const { error } = await supabaseAdmin.from('seo_competitors').insert(rows)
    if (error) throw new Error(`competitors insert ${prop.property}: ${error.message}`)
  }
  return rows.length
}

// ---------------------------------------------------------------------------
// 4. Turn winnable gaps into seo_issues.
// ---------------------------------------------------------------------------
async function detectCompetitorGaps(prop: Property, serps: SerpRow[]): Promise<number> {
  const ourDomain = prop.domain ? prop.domain.replace(/^www\./, '').toLowerCase() : ''
  const issues: Record<string, unknown>[] = []

  for (const s of serps) {
    // Winnable = we're on page 1–2 for it AND someone is above us.
    if (s.our_position == null || s.our_position > STRIKING_MAX_POS) continue
    const above = s.results.filter((o) => o.domain && o.domain !== ourDomain && o.position < s.our_position!)
    if (above.length === 0) continue // we already lead — no gap

    // Prefer a real peer as the target to beat; fall back to whoever's on top.
    const peersAbove = above.filter((o) => !isDirectory(o.domain))
    const target = (peersAbove[0] ?? above[0]) as SerpOrganic
    const ourUrl = s.results.find((o) => o.domain === ourDomain)?.url ?? null
    const commercial = commercialIntent(s.query)

    issues.push({
      property: prop.property,
      tenant_id: prop.tenant_id ?? s.tenant_id ?? null,
      type: 'competitor_gap',
      severity: above.length >= 3 ? 'high' : 'medium',
      intent: 'customer',
      target_url: ourUrl,
      recipe: 'competitor_title_meta',
      tier: 1,
      status: 'open',
      value: keywordValue(0, commercial), // impressions filled from seo_serp below
      detail: {
        query: s.query,
        our_position: s.our_position,
        our_url: ourUrl,
        competitors_above: above.length,
        top_competitor_domain: target.domain,
        top_competitor_url: target.url,
        top_competitor_title: target.title,
        top_competitor_position: target.position,
        directories_above: above.filter((o) => isDirectory(o.domain)).map((o) => o.domain),
        commercial,
      },
    })
  }

  if (!issues.length) return 0

  // Backfill impressions/value from the stored SERP rows (kept out of the loop
  // above to keep it a pure transform).
  const imprByQuery = new Map<string, number>()
  const today = new Date().toISOString().slice(0, 10)
  const { data: imprRows } = await supabaseAdmin
    .from('seo_serp')
    .select('query,impressions')
    .eq('property', prop.property)
    .eq('checked_at', today)
  for (const r of (imprRows ?? []) as Array<{ query: string; impressions: number }>) {
    imprByQuery.set(r.query, Number(r.impressions) || 0)
  }
  for (const iss of issues) {
    const d = iss.detail as { query: string; commercial: Commercial }
    const impr = imprByQuery.get(d.query) ?? 0
    iss.value = keywordValue(impr, d.commercial)
    ;(iss.detail as Record<string, unknown>).impressions = impr
  }

  const { error } = await supabaseAdmin.from('seo_issues').insert(issues)
  if (error) throw new Error(`competitor_gap insert ${prop.property}: ${error.message}`)
  return issues.length
}

// ---------------------------------------------------------------------------
// Orchestrator.
// ---------------------------------------------------------------------------
export type CompetitorScanResult = {
  enabled: boolean
  properties: number
  scanned: number
  serpCalls: number
  competitors: number
  gaps: number
  skipped: string[]
}

export async function runCompetitorScan(opts?: { propertyLimit?: number }): Promise<CompetitorScanResult> {
  if (!serpEnabled()) {
    return { enabled: false, properties: 0, scanned: 0, serpCalls: 0, competitors: 0, gaps: 0, skipped: ['SERPER_API_KEY not set'] }
  }

  // Fresh slate for competitor issues — the GSC detector no longer touches these.
  await supabaseAdmin.from('seo_issues').delete().eq('status', 'open').eq('type', 'competitor_gap')

  const { data: props } = await supabaseAdmin
    .from('seo_properties')
    .select('property,domain,tenant_id')
    .eq('enabled', true)
  let properties = (props ?? []) as Property[]
  if (opts?.propertyLimit) properties = properties.slice(0, opts.propertyLimit)

  let serpCalls = 0
  let competitors = 0
  let gaps = 0
  const skipped: string[] = []
  let scanned = 0

  for (const prop of properties) {
    try {
      const keywords = await selectMoneyKeywords(prop.property)
      if (!keywords.length) {
        skipped.push(`${prop.domain ?? prop.property}: no money keywords`)
        continue
      }
      serpCalls += await scanProperty(prop, keywords)
      const serps = await todaysSerps(prop.property)
      competitors += await computeCompetitors(prop, serps)
      gaps += await detectCompetitorGaps(prop, serps)
      scanned++
    } catch (e) {
      skipped.push(`${prop.domain ?? prop.property}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { enabled: true, properties: properties.length, scanned, serpCalls, competitors, gaps, skipped }
}
