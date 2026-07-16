// ---------------------------------------------------------------------------
// seomgr — conservative cross-tenant internal linking.
//
// Google's link-scheme policy is evaluated at the OWNERSHIP level: commonly-
// owned sites that cross-link to pass authority is exactly what it targets,
// and a hit can suppress every tenant at once, not just one. Approved scope
// (Jeff, 2026-07-16): conservative/contextual only — real relevance, low
// volume, varied anchor text, no reciprocal 1:1 pattern, no site-wide nav/
// footer blocks. This is a PROPOSAL generator only (tier 2, like enrich.ts) —
// nothing here is ever auto-applied. autopilot.ts only reads tier===1, so a
// tier-2 'internal_link' row is structurally excluded from auto-apply.
//
// Eligibility model:
//   1. Only the curated consumer/residential cluster below — B2B/software/
//      finance/marketing tenants have no natural "need this too" crossover
//      with a homeowner and are excluded entirely.
//   2. Same industry = direct competitor. Never cross-link two tenants in the
//      same trade, regardless of geography.
//   3. `local` tenants only match another `local` tenant that shares a state
//      (service_area.states). A NY homeowner doesn't care about an FL vendor.
//   4. `national` tenants have no fixed geography, so they match any other
//      eligible tenant regardless of state.
//   5. `the-home-services-company` is deliberately excluded — a national
//      40-service conglomerate would functionally compete with every niche
//      specialist in this cluster (cleaning, pest, landscaping, ...), not
//      complement them.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'

/** Off unless explicitly enabled — this only drafts proposals, never applies, but
 * Jeff should consciously opt in given the link-scheme sensitivity discussed. */
export function crossLinkEnabled(): boolean {
  // Trimmed defensively — see auto-verify.ts: a sibling flag was found stored
  // in prod as literally 'true\n', which a strict === silently failed on.
  return (process.env.SEOMGR_CROSS_LINK_ENABLED ?? '').trim() === 'true'
}

// The consumer/residential cluster eligible for cross-tenant linking at all.
// Everything NOT listed here (marketing, finance, software/'other', virtual
// assistant, fitness) is excluded — no natural "need this too" crossover with
// a homeowner booking cleaning/pest/junk/landscaping/etc.
const CLUSTER_SLUGS = new Set([
  'nycmaid',
  'sunnyside-clean-nyc',
  'the-florida-maid',
  'wash-and-fold-nyc',
  'we-pay-you-junk',
  'landscaping-in-nyc',
  'the-nyc-exterminator',
  'the-nyc-interior-designer',
  'nyc-mobile-salon',
  'fla-dumpster-rentals',
])

export type ServiceAreaScope = 'local' | 'regional' | 'national'

export interface LinkCandidate {
  tenant_id: string
  slug: string
  industry: string | null
  scope: ServiceAreaScope | null
  states: string[]
  domain: string | null
}

type TenantRow = {
  id: string
  slug: string
  industry: string | null
  selena_config: { service_area?: { scope?: ServiceAreaScope; states?: string[] } } | null
}

async function eligibleTenants(): Promise<LinkCandidate[]> {
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, industry, selena_config')
    .eq('status', 'active')
    .in('slug', [...CLUSTER_SLUGS])

  const { data: domains } = await supabaseAdmin
    .from('tenant_domains')
    .select('tenant_id, domain')
    .eq('is_primary', true)
  const domainByTenant = new Map((domains ?? []).map((d) => [d.tenant_id as string, d.domain as string]))

  return ((tenants ?? []) as TenantRow[]).map((t) => ({
    tenant_id: t.id,
    slug: t.slug,
    industry: t.industry,
    scope: t.selena_config?.service_area?.scope ?? null,
    states: t.selena_config?.service_area?.states ?? [],
    domain: domainByTenant.get(t.id) ?? null,
  }))
}

/** True if `a` may link to `b` — direction-agnostic (the caller decides which is "us"). */
export function isEligiblePair(a: LinkCandidate, b: LinkCandidate): boolean {
  if (a.tenant_id === b.tenant_id) return false
  if (!a.industry || !b.industry || a.industry === b.industry) return false // same trade = competitor
  if (!a.scope || !b.scope) return false // unconfigured — don't guess
  if (a.scope === 'local' && b.scope === 'local') {
    return a.states.some((s) => b.states.includes(s))
  }
  return true // at least one side is national/regional — geography doesn't gate it
}

/** For a given tenant, every other cluster tenant it may link to, most-relevant first. */
export function partnersFor(tenant: LinkCandidate, pool: LinkCandidate[]): LinkCandidate[] {
  return pool
    .filter((p) => isEligiblePair(tenant, p))
    // Same-state local partners first (most relevant), then national.
    .sort((x, y) => {
      const xLocal = x.scope === 'local' && x.states.some((s) => tenant.states.includes(s)) ? 0 : 1
      const yLocal = y.scope === 'local' && y.states.some((s) => tenant.states.includes(s)) ? 0 : 1
      return xLocal - yLocal
    })
}

// Varied natural phrasing — never the same sentence twice in a row for one
// tenant, so the link doesn't read as a templated network.
const ANCHOR_TEMPLATES = [
  (partner: string, industry: string) => `Also need ${industry}? ${partner} handles that.`,
  (partner: string, industry: string) => `For ${industry}, our clients often use ${partner}.`,
  (partner: string, industry: string) => `Looking for ${industry} too? Check out ${partner}.`,
]

export function draftAnchorText(partnerName: string, partnerIndustry: string, seed: number): string {
  const template = ANCHOR_TEMPLATES[seed % ANCHOR_TEMPLATES.length]
  return template(partnerName, partnerIndustry.replace(/_/g, ' '))
}

export type CrossLinkProposal = {
  tenant_id: string
  property: string
  target_url: string
  field: 'internal_link'
  recipe: 'cross_tenant_link'
  tier: 2
  status: 'proposed'
  before_value: null
  after_value: string
  rationale: string
  before_metric: { partner_tenant_id: string; partner_domain: string | null; partner_slug: string }
}

/**
 * Draft (never apply) one contextual link proposal per eligible tenant, into
 * its highest-traffic page. Low volume by design — one partner per tenant per
 * run, capped by MAX_PROPOSALS_PER_RUN — not a site-wide link block.
 */
export async function proposeCrossLinks(opts?: { max?: number }): Promise<{
  eligible: number
  proposed: number
  skipped: string[]
}> {
  const pool = await eligibleTenants()
  const max = opts?.max ?? 10
  const skipped: string[] = []
  const proposals: CrossLinkProposal[] = []

  for (const [i, tenant] of pool.entries()) {
    if (proposals.length >= max) break
    if (!tenant.domain) {
      skipped.push(`${tenant.slug}: no primary domain`)
      continue
    }
    const partners = partnersFor(tenant, pool)
    if (!partners.length) {
      skipped.push(`${tenant.slug}: no eligible partner`)
      continue
    }
    const partner = partners[0]
    const property = `sc-domain:${tenant.domain}`

    // Highest-traffic page on THIS tenant's own property — the page most
    // worth a reader's attention, and the one a human reviewer will recognize.
    const { data: topPage } = await supabaseAdmin
      .from('seo_metrics')
      .select('page,impressions')
      .eq('property', property)
      .neq('page', '')
      .order('impressions', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!topPage?.page) {
      skipped.push(`${tenant.slug}: no page traffic data yet`)
      continue
    }

    proposals.push({
      tenant_id: tenant.tenant_id,
      property,
      target_url: topPage.page as string,
      field: 'internal_link',
      recipe: 'cross_tenant_link',
      tier: 2,
      status: 'proposed',
      before_value: null,
      after_value: draftAnchorText(partner.slug, partner.industry ?? 'general', i),
      rationale: `Contextual cross-link: ${tenant.slug} (${tenant.industry}, ${tenant.scope}) -> ${partner.slug} (${partner.industry}, ${partner.scope}). Human review required before any link goes live.`,
      before_metric: { partner_tenant_id: partner.tenant_id, partner_domain: partner.domain, partner_slug: partner.slug },
    })
  }

  if (proposals.length) {
    // Idempotent per (property,target_url,recipe): clear stale proposals for
    // this recipe before writing fresh ones, same pattern as remediate.ts.
    for (const p of proposals) {
      await supabaseAdmin
        .from('seo_changes')
        .delete()
        .eq('property', p.property)
        .eq('target_url', p.target_url)
        .eq('recipe', 'cross_tenant_link')
        .eq('status', 'proposed')
    }
    const { error } = await supabaseAdmin.from('seo_changes').insert(proposals)
    if (error) throw new Error(`cross-link proposals insert failed: ${error.message}`)
  }

  return { eligible: pool.length, proposed: proposals.length, skipped }
}
