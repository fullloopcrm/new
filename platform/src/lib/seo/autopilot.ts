// ---------------------------------------------------------------------------
// seomgr autopilot — canary auto-apply of tier-1 (auto-eligible) proposals.
//
// tier here means AUTO-APPLY ELIGIBILITY, set by remediate.ts from the source
// issue's type — NOT the seo_issues detection-priority tier (which conflates
// page-1 low_ctr and page-2 striking_distance under the same value; see the
// comment on `common.tier` in remediate.ts). Only striking_distance
// (position 11-20, page 2) proposals ever reach tier=1 here. Anything on
// page 1 (low_ctr, position 6-10) is tier=2 — generated as a suggestion, but
// only ever applied by an admin through /admin/seo, never by this cron.
//
// OFF unless SEO_AUTOPILOT_ENABLED === 'true'. Even on, it is deliberately
// timid: every change must clear the safety gate, and per site it applies at
// most CANARY_PAGES_PER_RUN new pages and RATE_CAP_PER_WEEK total. The idea is a
// slow, reversible trickle onto live client pages — never a fleet-wide blast.
// The verify-and-revert cron measures each change later and rolls back losers.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { applyOverride } from './overrides'
import { evaluateSafety, type SafetyInput } from './safety-gate'

const CANARY_PAGES_PER_RUN = 3 // new pages auto-applied per site, per run
const RATE_CAP_PER_WEEK = 5 // max autopilot applies per site in a rolling 7 days

export function autopilotEnabled(): boolean {
  return process.env.SEO_AUTOPILOT_ENABLED === 'true'
}

type ChangeRow = {
  id: string
  property: string
  tenant_id: string | null
  target_url: string
  field: 'title' | 'meta_description'
  before_value: string | null
  after_value: string | null
  before_metric: { top_query?: string; query?: string } | null
}

type UrlBundle = {
  property: string
  url: string
  topQuery?: string
  title?: { id: string; before: string; after: string }
  meta?: { id: string; before: string; after: string }
}

/**
 * Registrable-domain brand label, e.g. 'merrymaids.com' -> 'merrymaids'.
 * Takes the label before the TLD, NOT split('.')[0] — for a domain with a
 * subdomain (brooklyn.news12.com, m.yelp.com, magazine.northeast.aaa.com),
 * split('.')[0] grabs the subdomain instead of the actual site, producing
 * garbage "brand" tokens like "brooklyn", "m", "magazine" that then falsely
 * flag totally unrelated words (a borough name, a single letter) as if they
 * named a rival. This is what's actually distinctive about the domain.
 */
export function brandLabel(domain: string): string {
  const parts = domain.split('.').filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 2] : domain
}

/** competitor domain -> brand token, e.g. 'merrymaids.com' -> 'merrymaids'. */
async function competitorBrands(property: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('seo_competitors')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .select('competitor_domain')
    .eq('property', property)
    .eq('is_directory', false)
  return (data ?? [])
    .map((r) => brandLabel(r.competitor_domain as string))
    .filter((b) => b.length >= 4)
}

async function appliedLast7d(property: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { count } = await supabaseAdmin
    .from('seo_changes')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .select('id', { count: 'exact', head: true })
    .eq('property', property)
    .eq('applied_by', 'autopilot')
    .eq('status', 'applied')
    .gte('applied_at', since)
  return count ?? 0
}

export type AutopilotResult = {
  enabled: boolean
  candidates: number
  applied: number
  rejected: number
  rateLimited: number
  perSite: Record<string, number>
  rejections: string[]
}

export async function runAutopilot(): Promise<AutopilotResult> {
  const base: AutopilotResult = {
    enabled: autopilotEnabled(),
    candidates: 0,
    applied: 0,
    rejected: 0,
    rateLimited: 0,
    perSite: {},
    rejections: [],
  }
  if (!base.enabled) return base

  // Highest-value proposed Tier-1 title/meta first.
  const { data } = await supabaseAdmin
    .from('seo_changes')
    .select('id,property,tenant_id,target_url,field,before_value,after_value,before_metric')
    .eq('status', 'proposed')
    .eq('tier', 1)
    .in('field', ['title', 'meta_description'])
    .order('proposed_at', { ascending: true })
    .limit(500)

  const changes = (data ?? []) as ChangeRow[]

  // Bundle title + meta for the same URL so a page applies as one unit.
  const bundles = new Map<string, UrlBundle>()
  for (const c of changes) {
    if (!c.target_url || !c.after_value) continue
    const b = bundles.get(c.target_url) ?? { property: c.property, url: c.target_url }
    if (!b.topQuery) b.topQuery = c.before_metric?.top_query ?? c.before_metric?.query
    const entry = { id: c.id, before: c.before_value ?? '', after: c.after_value }
    if (c.field === 'title') b.title = entry
    else b.meta = entry
    bundles.set(c.target_url, b)
  }
  base.candidates = bundles.size

  const brandCache = new Map<string, string[]>()
  const appliedThisRun: Record<string, number> = {}
  const weekBudget: Record<string, number> = {}

  for (const b of bundles.values()) {
    // Canary: cap new pages per site this run.
    if ((appliedThisRun[b.property] ?? 0) >= CANARY_PAGES_PER_RUN) continue

    // Rate cap: cap autopilot applies per site per rolling week.
    if (weekBudget[b.property] == null) weekBudget[b.property] = await appliedLast7d(b.property)
    if (weekBudget[b.property] >= RATE_CAP_PER_WEEK) {
      base.rateLimited++
      continue
    }

    if (!brandCache.has(b.property)) brandCache.set(b.property, await competitorBrands(b.property))
    const rivals = brandCache.get(b.property) ?? []

    // Gate every field on the page. Any failure blocks the whole page.
    const fields: Array<{ key: 'title' | 'meta_description'; e: { id: string; before: string; after: string } }> = []
    if (b.title) fields.push({ key: 'title', e: b.title })
    if (b.meta) fields.push({ key: 'meta_description', e: b.meta })

    const failures: string[] = []
    for (const f of fields) {
      const input: SafetyInput = {
        field: f.key,
        after: f.e.after,
        before: f.e.before,
        url: b.url,
        competitorBrands: rivals,
        topQuery: b.topQuery,
      }
      const res = evaluateSafety(input)
      if (!res.pass) failures.push(`${f.key}: ${res.reasons.join('; ')}`)
    }

    const changeIds = fields.map((f) => f.e.id)

    if (failures.length) {
      base.rejected++
      base.rejections.push(`${b.url} — ${failures.join(' | ')}`)
      await supabaseAdmin
        .from('seo_changes')
        .update({ status: 'rejected', rationale: `safety gate: ${failures.join(' | ')}` })
        .in('id', changeIds)
      continue
    }

    // Passed — apply, tagged as autopilot for the verify sweep.
    await applyOverride(
      b.url,
      { title: b.title?.after ?? null, description: b.meta?.after ?? null },
      changeIds,
      'autopilot',
    )
    base.applied++
    appliedThisRun[b.property] = (appliedThisRun[b.property] ?? 0) + 1
    weekBudget[b.property] = (weekBudget[b.property] ?? 0) + 1
    base.perSite[b.property] = (base.perSite[b.property] ?? 0) + 1
  }

  return base
}
