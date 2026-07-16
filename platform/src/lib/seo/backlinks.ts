// ---------------------------------------------------------------------------
// SIGNAL backlinks — citations + editorial cross-mentions (Phase 4).
//
// DESIGN DECISION (why not hub-and-spoke): FullLoop operates ~22 commonly-owned
// tenant sites. A literal hub-and-spoke scheme — FullLoop links out to every
// tenant, every tenant links back to FullLoop — is a textbook Google link-scheme
// / PBN (private blog network) footprint once a crawler correlates ownership
// across those domains. It is also flatly incompatible with "never damaging":
// a manual action for unnatural links can de-index an entire fleet at once.
//
// This module builds the safer alternative instead:
//   1. Citations — real NAP (name/service-area/phone/website) listings on
//      legitimate, independently-operated business directories. These are
//      earned the normal way every local business earns them; no reciprocal
//      link is created or required.
//   2. Editorial cross-mentions — content angle proposals for genuinely
//      relevant, varied-anchor-text mentions of a tenant in third-party-style
//      editorial content (e.g. a resource guide that cites a tenant as a real
//      example). No two tenants are required to link to each other, and no
//      tenant is required to link back to FullLoop.
//
// Nothing in this module publishes anything externally. Every proposal lands
// in `seo_backlink_opportunities` as status='proposed' — a human (or a later,
// separately-gated apply step) decides what actually gets submitted. This
// mirrors src/lib/seo/remediate.ts's generateProposals()/seo_changes pattern.
//
// Citation sources are real, independently-verifiable platforms as of this
// writing. Directory landscapes change — re-verify each `url` before a human
// acts on a proposal. Category-specific directories for towing/junk-removal
// are intentionally NOT included here (no source I could name with confidence
// exists and is still live) — see CITATION_SOURCES comment below.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import type { IndustryKey } from '@/lib/industry-presets'
import { mapIndustry } from '@/lib/industry-presets'

// ---------------------------------------------------------------------------
// Citation source catalog
// ---------------------------------------------------------------------------

export type ListingType = 'sab' | 'storefront' | 'both'
export type SubmissionMethod = 'self_serve_free' | 'self_serve_paid_upsell' | 'manual_review'

export interface CitationSource {
  key: string
  name: string
  url: string
  /** 'all' or the specific trades this directory is actually relevant for. */
  appliesTo: 'all' | IndustryKey[]
  listingType: ListingType
  submissionMethod: SubmissionMethod
  notes: string
}

/** Home-improvement / repair / maintenance trades — the Angi/HomeAdvisor/Thumbtack/Porch taxonomy. */
const HOME_IMPROVEMENT_TRADES: IndustryKey[] = [
  'cleaning', 'window_cleaning', 'gutter', 'carpet_cleaning', 'air_duct', 'pressure_washing',
  'post_construction', 'pool', 'chimney', 'lawn_care', 'irrigation', 'snow_removal', 'tree_service',
  'pest', 'handyman', 'hvac', 'plumbing', 'electrical', 'garage_door', 'locksmith', 'home_inspection',
  'appliance_repair', 'landscaping', 'remodeling', 'roofing', 'siding', 'painting', 'flooring',
  'concrete', 'deck', 'fencing', 'drywall', 'foundation', 'insulation', 'windows_doors',
  'stucco', 'solar', 'smart_home', 'accessibility', 'restoration', 'interior_design',
]

/** Design/build project trades — Houzz/BuildZoom's audience. */
const PROJECT_TRADES: IndustryKey[] = [
  'remodeling', 'roofing', 'siding', 'painting', 'flooring', 'concrete', 'deck', 'fencing',
  'drywall', 'foundation', 'insulation', 'windows_doors', 'stucco', 'solar', 'interior_design',
  'landscaping',
]

/**
 * Real, independently-operated citation/directory platforms. `appliesTo:
 * 'all'` sources are general-purpose local-business directories where any
 * trade (including towing, junk removal, mobile salon) gets a legitimate
 * listing. Trade-scoped sources only apply where the platform's own category
 * taxonomy genuinely covers that trade — do not widen without checking the
 * platform actually lists that category.
 */
export const CITATION_SOURCES: CitationSource[] = [
  { key: 'google_business_profile', name: 'Google Business Profile', url: 'https://business.google.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Foundational — verify this is not already claimed via tenants.google_business before proposing.' },
  { key: 'bing_places', name: 'Bing Places for Business', url: 'https://www.bingplaces.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Can import directly from an existing Google Business Profile.' },
  { key: 'apple_maps_business_connect', name: 'Apple Maps Business Connect', url: 'https://mapsconnect.apple.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Powers Apple Maps + Siri local results.' },
  { key: 'facebook_business_page', name: 'Facebook Business Page', url: 'https://www.facebook.com/business', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Social profile that also functions as a citation (NAP block on the About tab).' },
  { key: 'nextdoor_business', name: 'Nextdoor Business Page', url: 'https://business.nextdoor.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Hyperlocal neighbor trust signal — strong fit for home-services SABs.' },
  { key: 'yelp_business', name: 'Yelp for Business', url: 'https://biz.yelp.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Free basic profile; paid tiers upsell ads/enhanced listing — do not propose paid tiers.' },
  { key: 'bbb', name: 'Better Business Bureau', url: 'https://www.bbb.org', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_paid_upsell', notes: 'Free basic profile exists; accreditation is a separate paid, audited process — never claim "BBB accredited" unless actually accredited.' },
  { key: 'mapquest_foursquare', name: 'MapQuest / Foursquare Business Listing', url: 'https://business.mapquest.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Feeds several downstream map/nav apps built on the Foursquare places dataset.' },
  { key: 'manta', name: 'Manta', url: 'https://www.manta.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'General small-business directory.' },
  { key: 'alignable', name: 'Alignable', url: 'https://www.alignable.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Small-business networking site; profile doubles as a citation.' },
  { key: 'yellowpages', name: 'YellowPages.com', url: 'https://www.yellowpages.com', appliesTo: 'all', listingType: 'both', submissionMethod: 'self_serve_free', notes: 'Legacy directory, still crawled/cited by aggregators.' },
  { key: 'angi', name: 'Angi (formerly Angie’s List)', url: 'https://www.angi.com', appliesTo: HOME_IMPROVEMENT_TRADES, listingType: 'sab', submissionMethod: 'self_serve_paid_upsell', notes: 'Free basic pro profile; lead-gen placement is paid — propose the free profile only.' },
  { key: 'homeadvisor', name: 'HomeAdvisor (Angi Leads)', url: 'https://www.homeadvisor.com', appliesTo: HOME_IMPROVEMENT_TRADES, listingType: 'sab', submissionMethod: 'self_serve_paid_upsell', notes: 'Pro profile is free to create; lead purchase is separate/paid.' },
  { key: 'thumbtack', name: 'Thumbtack', url: 'https://www.thumbtack.com', appliesTo: HOME_IMPROVEMENT_TRADES, listingType: 'sab', submissionMethod: 'self_serve_paid_upsell', notes: 'Free profile; pay-per-lead credits are separate/paid.' },
  { key: 'porch', name: 'Porch', url: 'https://porch.com', appliesTo: HOME_IMPROVEMENT_TRADES, listingType: 'sab', submissionMethod: 'self_serve_free', notes: 'Home-services pro directory.' },
  { key: 'houzz', name: 'Houzz', url: 'https://www.houzz.com/professionals', appliesTo: PROJECT_TRADES, listingType: 'sab', submissionMethod: 'self_serve_free', notes: 'Design/build audience — best fit for remodeling-adjacent trades.' },
  { key: 'buildzoom', name: 'BuildZoom', url: 'https://www.buildzoom.com', appliesTo: PROJECT_TRADES, listingType: 'sab', submissionMethod: 'self_serve_free', notes: 'Contractor directory with license/permit-history lookups.' },
  { key: 'styleseat', name: 'StyleSeat', url: 'https://www.styleseat.com', appliesTo: ['mobile_salon'], listingType: 'sab', submissionMethod: 'self_serve_free', notes: 'Booking + discovery platform for mobile beauty pros.' },
]

/** Every source whose category taxonomy genuinely covers this trade. */
export function citationSourcesFor(industry: IndustryKey): CitationSource[] {
  return CITATION_SOURCES.filter((s) => s.appliesTo === 'all' || s.appliesTo.includes(industry))
}

// ---------------------------------------------------------------------------
// Fleet loading — every active tenant, not a hand-maintained per-tenant file.
// New tenants get citation/editorial coverage automatically the next cron run.
// ---------------------------------------------------------------------------

export interface TenantFleetRow {
  tenant_id: string
  domain: string
  name: string
  phone: string | null
  websiteUrl: string | null
  industry: IndustryKey
  /** True when tenants.google_business already has a location on file (dashboard/google OAuth connect). */
  googleBusinessConnected: boolean
}

const normDomain = (raw: string): string =>
  raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')

export async function loadActiveFleet(): Promise<TenantFleetRow[]> {
  const { data: domains } = await supabaseAdmin.from('tenant_domains').select('domain,tenant_id').eq('active', true)
  const byTenant = new Map<string, string>()
  for (const d of domains ?? []) {
    const tenantId = d.tenant_id as string | null
    const domain = normDomain(String(d.domain ?? ''))
    if (!tenantId || !domain || !domain.includes('.') || domain.endsWith('.fullloopcrm.com') || byTenant.has(tenantId)) continue
    byTenant.set(tenantId, domain)
  }

  // Fallback: tenant_domains registration is best-effort (activate-tenant.ts's
  // upsert is try/catch, "never blocks" activation), so pre-existing tenants or
  // ones whose upsert failed have no active tenant_domains row at all and would
  // otherwise be silently dropped from the entire fleet. Fill gaps from
  // tenants.domain — matches tenant-lookup.ts's tenant_domains-first /
  // tenants.domain-fallback precedence (tenant_domains wins where both exist).
  const { data: legacy } = await supabaseAdmin.from('tenants').select('id,domain').not('domain', 'is', null)
  for (const t of legacy ?? []) {
    const tenantId = t.id as string | null
    if (!tenantId || byTenant.has(tenantId)) continue
    const domain = normDomain(String(t.domain ?? ''))
    if (!domain || !domain.includes('.') || domain.endsWith('.fullloopcrm.com')) continue
    byTenant.set(tenantId, domain)
  }

  if (byTenant.size === 0) return []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id,name,phone,website_url,industry,google_business')
    .in('id', [...byTenant.keys()])

  return (tenants ?? []).map((t): TenantFleetRow => ({
    tenant_id: t.id as string,
    domain: byTenant.get(t.id as string) as string,
    name: (t.name as string) || '',
    phone: (t.phone as string) || null,
    websiteUrl: (t.website_url as string) || null,
    industry: mapIndustry(t.industry as string | null | undefined),
    googleBusinessConnected: Boolean((t.google_business as { location_name?: string } | null)?.location_name),
  })).filter((t) => t.name && t.domain)
}

// ---------------------------------------------------------------------------
// Safety gate — the wall between a generated listing/pitch and anything a
// human could act on. No model calls here: citation listings below are built
// from deterministic templates over verified tenant fields, never invented,
// so the gate's job is to catch generation bugs, not to police an LLM.
// ---------------------------------------------------------------------------

export type BacklinkSafetyField = 'citation_description' | 'editorial_hook'

export interface BacklinkSafetyInput {
  field: BacklinkSafetyField
  text: string
  tenantName: string
  competitorBrands?: string[]
}

export interface SafetyResult {
  pass: boolean
  reasons: string[]
}

// Same spirit as safety-gate.ts's CLAIM_RE — a listing description has no
// "before" copy to diff against, so ANY claim word here counts as introduced.
const UNVERIFIED_CLAIM_RE =
  /#\s?1|\bno\.?\s?1\b|\bnumber one\b|\bbest\b|\btop[-\s]?rated\b|\baward[-\s]?winning\b|\bvoted\b|\bguarantee[d]?\b|\b100%\b|\b5[-\s]?star\b|\bcertified\b|\blicensed\b|\binsured\b|\bbbb accredited\b/gi

const LENGTH_LIMITS: Record<BacklinkSafetyField, { min: number; max: number }> = {
  citation_description: { min: 40, max: 300 },
  editorial_hook: { min: 20, max: 220 },
}

export function evaluateBacklinkSafety(input: BacklinkSafetyInput): SafetyResult {
  const reasons: string[] = []
  const text = input.text?.trim() ?? ''
  const limit = LENGTH_LIMITS[input.field]

  if (!text) reasons.push('empty value')
  else if (text.length < limit.min) reasons.push(`too short (${text.length} < ${limit.min})`)
  else if (text.length > limit.max) reasons.push(`too long (${text.length} > ${limit.max})`)

  const claims = [...text.toLowerCase().matchAll(UNVERIFIED_CLAIM_RE)].map((m) => m[0])
  if (claims.length) reasons.push(`introduces unverified claim: ${[...new Set(claims)].join(', ')}`)

  if (input.tenantName && !text.includes(input.tenantName)) {
    reasons.push(`does not mention business name "${input.tenantName}"`)
  }

  const lower = text.toLowerCase()
  const namedRival = (input.competitorBrands ?? []).find(
    (b) => b.length >= 3 && new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower),
  )
  if (namedRival) reasons.push(`names competitor: ${namedRival}`)

  return { pass: reasons.length === 0, reasons }
}

// ---------------------------------------------------------------------------
// Citation listing content — deterministic, template-based. No LLM call: NAP
// facts must be exactly correct, and a generator is the wrong tool for "must
// never be wrong." Every field traces back to a real tenants column.
// ---------------------------------------------------------------------------

const TRADE_LABEL: Partial<Record<IndustryKey, string>> = {
  towing: 'towing and roadside assistance',
  junk_removal: 'junk removal',
  dumpster: 'dumpster rental',
  cleaning: 'residential cleaning',
  mobile_salon: 'mobile beauty services',
  laundry: 'laundry and wash-and-fold',
  handyman: 'handyman services',
  hvac: 'HVAC services',
  plumbing: 'plumbing services',
  electrical: 'electrical services',
  landscaping: 'landscaping',
  remodeling: 'home remodeling',
  pest: 'pest control',
}

function tradeLabel(industry: IndustryKey): string {
  return TRADE_LABEL[industry] ?? industry.replace(/_/g, ' ')
}

export interface CitationListing {
  businessName: string
  description: string
  primaryCategory: string
  serviceArea: string
  phone: string | null
  website: string
  /** These fleets operate as service-area businesses — no public storefront address is claimed. */
  listingType: 'sab'
  /**
   * Ordered, source-specific instructions for the human who actually submits
   * this listing. Populated by manualStepsFor() — see that function's header
   * comment for why every directory in CITATION_SOURCES ends up here rather
   * than behind an auto-submit call.
   */
  manualSteps: string[]
}

export function buildCitationListing(tenant: TenantFleetRow): CitationListing {
  const label = tradeLabel(tenant.industry)
  const description =
    `${tenant.name} provides ${label} to the local area, serving customers directly at their ` +
    `home or job site. Book online at ${tenant.domain}.`
  return {
    businessName: tenant.name,
    description,
    primaryCategory: label,
    serviceArea: 'Service-area business — see website for current coverage.',
    phone: tenant.phone,
    website: tenant.websiteUrl || `https://www.${tenant.domain}`,
    listingType: 'sab',
    // Source-specific — filled in per-row by manualStepsFor() once the target
    // directory is known. This canonical listing has no single directory yet.
    manualSteps: [],
  }
}

// ---------------------------------------------------------------------------
// Execution-mechanism research (why manual steps, not an auto-submit call):
// every source in CITATION_SOURCES was checked for a documented public API
// that a third party (us) could call to create a NEW business listing on a
// tenant's behalf without that tenant's own authenticated account on the
// platform. None exists — Google, Bing, Apple, Meta, Yelp, BBB, and every
// trade directory here (Angi/HomeAdvisor/Thumbtack/Porch/Houzz/BuildZoom/
// StyleSeat) gate listing creation behind owner-verification (email, phone/
// SMS, mailed postcard, or manual vetting) specifically to prevent this exact
// kind of third-party automated listing creation — it's an anti-spam control,
// not a gap in their API surface. See deploy-prep/ research doc for the
// per-source pass.
//
// The one real exception: Google Business Profile. This app already runs a
// legitimate per-tenant OAuth flow (business.manage scope, /api/google/auth)
// used today for review sync + posts (src/lib/google.ts, google-posts.ts). If
// a tenant has already connected it, tenants.google_business.location_name is
// set — proposeCitationsForTenant() below uses that to skip re-proposing a
// listing that already exists rather than nagging the reviewer forever. That
// OAuth connection still can't *create and verify* a brand-new, not-yet-
// existing listing end-to-end (Google requires its own verification step for
// new locations), so it doesn't turn this into a submit button — it turns off
// a false-positive proposal using data we already legitimately hold.
export function manualStepsFor(source: CitationSource, tenant: TenantFleetRow, listing: CitationListing): string[] {
  if (source.key === 'bing_places' && tenant.googleBusinessConnected) {
    return [
      `Open ${source.url} and sign in (or create a free Microsoft account).`,
      `Choose "Import from Google" — ${tenant.name} already has a connected Google Business Profile, so Bing can pull the NAP data directly instead of retyping it.`,
      'Review the imported fields against the listing below, then submit for verification.',
      `Category: ${listing.primaryCategory} · Phone: ${listing.phone ?? 'none on file'} · Website: ${listing.website}`,
    ]
  }

  const steps: string[] = [
    `Open ${source.url} and search for "${listing.businessName}" — claim the existing listing if the platform already has one instead of creating a duplicate.`,
    `If none exists, start ${source.submissionMethod === 'manual_review' ? 'the pro application' : 'a free business profile'}.`,
    `Enter exactly: category "${listing.primaryCategory}", phone ${listing.phone ?? '(none on file — leave blank)'}, website ${listing.website}.`,
    `Paste this description as-is — it already passed the safety gate, don't add claims while retyping it: "${listing.description}"`,
  ]
  if (source.appliesTo !== 'all') {
    steps.push('Have a business license number or proof of insurance ready — trade directories commonly ask for one during signup.')
  }
  if (source.submissionMethod === 'self_serve_paid_upsell') {
    steps.push('Stop after the free profile step — do not purchase leads, ads, or an enhanced-placement upsell.')
  }
  if (source.key === 'bbb') {
    steps.push('This creates a free basic profile only. Do not describe the business as "BBB accredited" unless it later completes BBB\'s separate paid accreditation review.')
  }
  steps.push('Complete whichever ownership-verification step the platform requires (email link, phone/SMS code, or mailed postcard). Every directory in this catalog gates activation behind owner verification — that step cannot be automated by a third party.')
  return steps
}

// ---------------------------------------------------------------------------
// Editorial cross-mention angles — content ideas for genuinely relevant,
// varied-anchor-text mentions of a tenant. These are proposals for future
// content, not content that gets published by this module. No reciprocal
// link is implied or required.
// ---------------------------------------------------------------------------

export interface EditorialAngle {
  key: string
  title: string
  hook: string
  anchorTextOptions: string[]
  relevance: string
}

function tenantSiteAnchor(name: string): string {
  return `${name}'s site`
}

function editorialAnglesFor(tenant: TenantFleetRow): EditorialAngle[] {
  const label = tradeLabel(tenant.industry)
  const angles: EditorialAngle[] = [
    {
      key: 'local_guide_mention',
      title: `Local resource guide: what to check before hiring for ${label}`,
      hook: `A practical checklist for homeowners evaluating ${label} providers, using ${tenant.name} as a real working example of what a properly-run local operation looks like.`,
      anchorTextOptions: [tenant.name, `${tenant.name} (${tenant.domain})`, 'this local provider', tenantSiteAnchor(tenant.name)],
      relevance: `Directly on-topic for readers actively researching ${label} — genuine editorial fit, not a placement.`,
    },
    {
      key: 'seasonal_roundup_mention',
      title: `Seasonal roundup: ${label} providers worth knowing about`,
      hook: `A short, specific mention of ${tenant.name} inside a broader seasonal roundup of local ${label} options — one entry among several, not a solo feature.`,
      anchorTextOptions: [tenant.domain, 'more details here', 'the full breakdown'],
      relevance: 'Roundup format gives natural cover for varied, non-repetitive anchor text across the whole fleet.',
    },
  ]
  return angles
}

// ---------------------------------------------------------------------------
// Proposal generation — mirrors remediate.ts's generateProposals(): draft
// into a ledger as status='proposed', apply NOTHING. Re-running is idempotent:
// stale 'proposed' rows are replaced; rows that already progressed past
// 'proposed' (approved/submitted/live/rejected) are left untouched.
// ---------------------------------------------------------------------------

const TABLE = 'seo_backlink_opportunities'
const ACTIONED_STATUSES = ['approved', 'submitted', 'live', 'rejected']

async function alreadyActionedKeys(tenantId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from(TABLE)
    .select('source_key')
    .eq('tenant_id', tenantId)
    .in('status', ACTIONED_STATUSES)
  return new Set((data ?? []).map((r) => r.source_key as string))
}

async function proposeCitationsForTenant(tenant: TenantFleetRow): Promise<number> {
  const actioned = await alreadyActionedKeys(tenant.tenant_id)
  const listing = buildCitationListing(tenant)
  const safety = evaluateBacklinkSafety({
    field: 'citation_description',
    text: listing.description,
    tenantName: tenant.name,
  })
  if (!safety.pass) return 0

  const sources = citationSourcesFor(tenant.industry)
    .filter((s) => !actioned.has(s.key))
    // Already connected via OAuth (src/lib/google.ts) — a listing already
    // exists, so re-proposing it would just nag the reviewer forever.
    .filter((s) => !(s.key === 'google_business_profile' && tenant.googleBusinessConnected))
  if (!sources.length) return 0

  await supabaseAdmin.from(TABLE).delete().eq('tenant_id', tenant.tenant_id).eq('kind', 'citation').eq('status', 'proposed')
  const rows = sources.map((s) => ({
    tenant_id: tenant.tenant_id,
    property: `sc-domain:${tenant.domain}`,
    kind: 'citation',
    source_key: s.key,
    source_name: s.name,
    source_url: s.url,
    category: tenant.industry,
    status: 'proposed',
    listing: { ...listing, manualSteps: manualStepsFor(s, tenant, listing) },
    rationale: `${s.listingType === 'sab' ? 'Service-area' : 'General'} directory listing on ${s.name}. ${s.notes}`,
    safety,
  }))
  await supabaseAdmin.from(TABLE).insert(rows) // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
  return rows.length
}

async function proposeEditorialForTenant(tenant: TenantFleetRow): Promise<number> {
  const actioned = await alreadyActionedKeys(tenant.tenant_id)
  const angles = editorialAnglesFor(tenant).filter((a) => !actioned.has(a.key))
  const passing = angles
    .map((a) => ({ angle: a, safety: evaluateBacklinkSafety({ field: 'editorial_hook', text: a.hook, tenantName: tenant.name }) }))
    .filter((r) => r.safety.pass)
  if (!passing.length) return 0

  await supabaseAdmin.from(TABLE).delete().eq('tenant_id', tenant.tenant_id).eq('kind', 'editorial').eq('status', 'proposed')
  const rows = passing.map(({ angle, safety }) => ({
    tenant_id: tenant.tenant_id,
    property: `sc-domain:${tenant.domain}`,
    kind: 'editorial',
    source_key: angle.key,
    source_name: angle.title,
    source_url: null,
    category: tenant.industry,
    status: 'proposed',
    listing: { title: angle.title, hook: angle.hook, anchorTextOptions: angle.anchorTextOptions, relevance: angle.relevance },
    rationale: angle.relevance,
    safety,
  }))
  await supabaseAdmin.from(TABLE).insert(rows) // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
  return rows.length
}

export async function generateBacklinkProposals(opts?: { limit?: number }): Promise<{
  tenants: number
  citationProposals: number
  editorialProposals: number
}> {
  const limit = opts?.limit ?? 25
  const fleet = (await loadActiveFleet()).slice(0, limit)

  let citationProposals = 0
  let editorialProposals = 0
  for (const tenant of fleet) {
    citationProposals += await proposeCitationsForTenant(tenant)
    editorialProposals += await proposeEditorialForTenant(tenant)
  }
  return { tenants: fleet.length, citationProposals, editorialProposals }
}
