/**
 * Phase 4 — AI-drafted, auto-applied per-area site content. The "one button"
 * (~/.claude/plans/compiled-mixing-bumblebee.md Phase 4/5): generateTenantSite()
 * is called once by Completion (complete-tenant.ts) and again, on demand, by
 * "Update Website" (Phase 5) — same underlying engine, two different triggers.
 *
 * Generates content ONCE per area and stores it in tenant_site_content;
 * Phase 3's /areas/[location] and /careers/[location] pages READ from that
 * store at request time (falling back to the free, procedural longform.ts
 * builders when no row exists yet, e.g. before the first Completion run) —
 * they never call the AI model themselves. That's what makes "thousands of
 * pages, rendered on demand" viable: the expensive part happens once here,
 * not on every visitor.
 *
 * Same validate-then-apply contract as generateSiteBrandCopy/
 * draftTailoredServices: constrained JSON output, validated for shape AND
 * quality before anything is written, rejected wholesale (never partial) on
 * any failure. One AI call covers BOTH the location page and the job page
 * for a given area (not two separate calls) — halves the call count, and the
 * two pages sharing one generation keeps their voice consistent.
 *
 * Scope, deliberately: this covers 'location' and 'job' page types only —
 * the two page types that actually exist today (Phase 3, city/metro tier).
 * 'hero'/'about'/'faq' stay on their existing home (generateSiteBrandCopy,
 * which writes directly to tenants.selena_config) rather than duplicating
 * into this table. 'location_service' (area x single-service combo pages) is
 * explicitly NOT built here — no page exists to render it yet; the plan's
 * own Phase 3 ordering calls that out as real, separate follow-on work.
 *
 * Cost/time cap: resolveCoverage() can return dozens to hundreds of areas via
 * the nationwide Overpass fallback (the plan's own verification numbers: 321
 * real places near Times Square). Generating 2 AI-validated pages for EVERY
 * area on every Completion/Update-Website click would be unbounded cost and
 * latency. Capped to the nearest MAX_AREAS (areas is already distance-sorted
 * by resolveCoverage) — areas beyond the cap are reported, not silently
 * dropped, so nothing here pretends to cover more than it does.
 */
import { supabaseAdmin } from './supabase'
import { anthropicFromStoredKey } from './anthropic-client'
import { resolveCoverage, type CoveredArea } from './geo/coverage'

const MODEL = 'claude-sonnet-4-6'
export const MAX_AREAS = 15

const BANNED_FILLER = [
  'customer satisfaction is our top priority',
  'we take pride in',
  'we strive to',
  'look no further',
  'lorem ipsum',
]

export interface ContentSection {
  heading: string
  paragraphs: string[]
}

export interface FaqItem {
  q: string
  a: string
}

export interface LongformPageDraft {
  title: string
  metaDescription: string
  h1: string
  intro: string
  sections: ContentSection[]
  faq: FaqItem[]
}

export interface AreaContentDraft {
  location: LongformPageDraft
  job: LongformPageDraft
}

function stripFences(text: string): string {
  return text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
}

function containsPlaceholderToken(text: string): boolean {
  return /\[[^\]]*\]|\{\{|\binsert\b/i.test(text)
}

function containsBannedFiller(text: string): boolean {
  const lower = text.toLowerCase()
  return BANNED_FILLER.some((phrase) => lower.includes(phrase))
}

/**
 * Shape + quality gate for one LongformPage draft. Returns null on ANY
 * failure so the caller never applies a partial or weak page. `mustInclude`
 * are lowercase substrings that must appear somewhere in the page (business
 * name, area name) — the concrete, checkable proxy for "written for THIS
 * area," not a generic template. `requireFaq` is false for job pages (the
 * existing procedural locationCareersContent() also ships an empty faq: []).
 */
export function validateLongformPage(raw: unknown, mustInclude: string[], requireFaq: boolean): LongformPageDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const { title, metaDescription, h1, intro, sections, faq } = r

  if (typeof title !== 'string' || typeof metaDescription !== 'string' || typeof h1 !== 'string' || typeof intro !== 'string') return null
  if (!Array.isArray(sections) || sections.length < 2 || sections.length > 5) return null
  if (!Array.isArray(faq)) return null
  if (requireFaq && faq.length < 2) return null

  const t = title.trim()
  const md = metaDescription.trim()
  const h = h1.trim()
  const i = intro.trim()
  if (t.length === 0 || t.length > 100) return null
  if (md.length < 50 || md.length > 300) return null
  if (h.length === 0 || h.length > 100) return null
  if (i.length < 40 || i.length > 400) return null

  const cleanSections: ContentSection[] = []
  for (const s of sections) {
    if (!s || typeof s !== 'object') return null
    const sr = s as Record<string, unknown>
    if (typeof sr.heading !== 'string' || !Array.isArray(sr.paragraphs)) return null
    const heading = sr.heading.trim()
    if (heading.length === 0 || heading.length > 120) return null
    if (sr.paragraphs.length < 1 || sr.paragraphs.length > 4) return null
    const paragraphs: string[] = []
    for (const p of sr.paragraphs) {
      if (typeof p !== 'string') return null
      const pt = p.trim()
      if (pt.length < 60 || pt.length > 700) return null
      paragraphs.push(pt)
    }
    cleanSections.push({ heading, paragraphs })
  }

  const cleanFaq: FaqItem[] = []
  for (const f of faq) {
    if (!f || typeof f !== 'object') return null
    const fr = f as Record<string, unknown>
    if (typeof fr.q !== 'string' || typeof fr.a !== 'string') return null
    const q = fr.q.trim()
    const a = fr.a.trim()
    if (q.length === 0 || q.length > 200 || a.length === 0 || a.length > 500) return null
    cleanFaq.push({ q, a })
  }

  const allText = [t, md, h, i, ...cleanSections.flatMap((s) => [s.heading, ...s.paragraphs]), ...cleanFaq.flatMap((f) => [f.q, f.a])]
  for (const text of allText) {
    if (containsPlaceholderToken(text)) return null
    if (containsBannedFiller(text)) return null
  }

  const haystack = allText.join(' ').toLowerCase()
  for (const needle of mustInclude) {
    if (needle && !haystack.includes(needle.toLowerCase())) return null
  }

  return { title: t, metaDescription: md, h1: h, intro: i, sections: cleanSections, faq: cleanFaq }
}

export function validateAreaContent(raw: unknown, tenantName: string, areaName: string): AreaContentDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const location = validateLongformPage(r.location, [tenantName, areaName], true)
  const job = validateLongformPage(r.job, [tenantName, areaName], false)
  if (!location || !job) return null
  return { location, job }
}

export function buildAreaContentPrompt(params: {
  tenantName: string
  industry: string
  areaName: string
  areaState: string
  services: string[]
  businessDescription: string
  differentiators: string[]
}): string {
  const { tenantName, industry, areaName, areaState, services, businessDescription, differentiators } = params
  return `You are writing website copy for a real ${industry} business expanding its site to cover one specific service area — not generic industry boilerplate, and not swappable with copy for any other area or any other ${industry} business.

Business name: ${tenantName}
What they do (their own words): ${businessDescription || '(not provided)'}
What makes them different (their own words): ${differentiators.length > 0 ? differentiators.join('; ') : '(not provided)'}
Real services they offer: ${services.length > 0 ? services.join(', ') : '(not provided — write generically about their trade)'}
Service area for this page: ${areaName}, ${areaState}

Write TWO pages, each grounded in the specifics above:

1. "location" — a service-area landing page for ${areaName}. 2-3 sections (each with a "heading" and 1-3 "paragraphs", each paragraph 1-3 sentences), plus 2-3 "faq" items (each a "q"/"a" pair). Must mention "${tenantName}" and "${areaName}" by name, ideally more than once.
2. "job" — a hiring/recruiting page for ${areaName} ("Now Recruiting in ${areaName}" framing). 2-3 sections, empty faq array. Must mention "${tenantName}" and "${areaName}" by name.

Each page also needs: "title" (page <title>, under 100 chars), "metaDescription" (50-300 chars), "h1" (page heading, under 100 chars), "intro" (lead paragraph under the h1, 40-400 chars).

HARD RULES:
- Use the specifics given. If given almost nothing, keep it honest and plain rather than inventing details.
- Never use generic filler ("customer satisfaction is our top priority", "we take pride in", "we strive to", "look no further").
- Never include a placeholder like [Business Name] or {{...}} — always the real names given above.
- No emoji, no exclamation-point marketing voice.
- Do not invent a phone number, address, or price — none are given, so don't reference specific contact details or numbers.

Return ONLY raw JSON matching this exact shape, no markdown, no code fences, no explanation:
{"location": {"title": "...", "metaDescription": "...", "h1": "...", "intro": "...", "sections": [{"heading": "...", "paragraphs": ["..."]}], "faq": [{"q": "...", "a": "..."}]}, "job": {"title": "...", "metaDescription": "...", "h1": "...", "intro": "...", "sections": [{"heading": "...", "paragraphs": ["..."]}], "faq": []}}`
}

export interface GenerateTenantSiteResult {
  ok: boolean
  areasTotal: number
  areasProcessed: number
  areasSkippedOverCap: number
  locationPagesWritten: number
  jobPagesWritten: number
  areaErrors: Array<{ area: string; reason: string }>
  reason?: string
}

async function generateAreaContent(params: {
  tenantName: string
  industry: string
  area: CoveredArea
  services: string[]
  businessDescription: string
  differentiators: string[]
  anthropicApiKey: string | null | undefined
}): Promise<AreaContentDraft | { error: string }> {
  const { tenantName, industry, area, services, businessDescription, differentiators, anthropicApiKey } = params
  let text: string
  try {
    const client = anthropicFromStoredKey(anthropicApiKey)
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: buildAreaContentPrompt({ tenantName, industry, areaName: area.name, areaState: area.state, services, businessDescription, differentiators }),
      }],
    })
    text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  } catch (e) {
    const err = e as { message?: string }
    return { error: `AI call failed: ${err.message || 'unknown error'}` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(stripFences(text))
  } catch {
    return { error: 'failed to parse AI response as JSON' }
  }

  const draft = validateAreaContent(parsed, tenantName, area.name)
  if (!draft) return { error: 'AI response failed shape/length/quality validation — not applied' }
  return draft
}

/**
 * Generate + store area content for a tenant. Best-effort per area: one
 * area's AI/validation failure is recorded in areaErrors and does not block
 * the rest — matches every other provisioning step in this pipeline (never
 * throws, never blocks the caller).
 */
export async function generateTenantSite(tenantId: string): Promise<GenerateTenantSiteResult> {
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('name, industry, selena_config, anthropic_api_key, address, service_area_lat, service_area_lng, service_radius_miles')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    return { ok: false, areasTotal: 0, areasProcessed: 0, areasSkippedOverCap: 0, locationPagesWritten: 0, jobPagesWritten: 0, areaErrors: [], reason: `tenant not found: ${error?.message || 'no row'}` }
  }

  const { data: serviceRows } = await supabaseAdmin
    .from('service_types')
    .select('name')
    .eq('tenant_id', tenantId)
    .eq('active', true)
  const services = (serviceRows || []).map((s) => s.name as string).filter(Boolean)

  const selena = (tenant.selena_config as Record<string, unknown> | null) || {}
  const businessDescription = typeof selena.business_description === 'string' ? selena.business_description : ''
  const differentiators = Array.isArray(selena.differentiators)
    ? (selena.differentiators as unknown[]).filter((d): d is string => typeof d === 'string' && d.trim() !== '')
    : []

  const radius = typeof tenant.service_radius_miles === 'number' ? tenant.service_radius_miles : 25
  const coverage = await resolveCoverage({
    lat: tenant.service_area_lat as number | null,
    lng: tenant.service_area_lng as number | null,
    address: tenant.address as string | null,
    radiusMiles: radius,
  })

  if (coverage.areas.length === 0) {
    return { ok: true, areasTotal: 0, areasProcessed: 0, areasSkippedOverCap: 0, locationPagesWritten: 0, jobPagesWritten: 0, areaErrors: [], reason: 'no resolvable service area — set a business address first' }
  }

  // areas is already nearest-first (resolveCoverage/nearby-places.ts).
  const areasToProcess = coverage.areas.slice(0, MAX_AREAS)
  const areasSkippedOverCap = coverage.areas.length - areasToProcess.length

  const tenantName = (tenant.name as string | null) || 'this business'
  const industry = (tenant.industry as string | null) || 'general'

  let locationPagesWritten = 0
  let jobPagesWritten = 0
  const areaErrors: Array<{ area: string; reason: string }> = []

  for (const area of areasToProcess) {
    const result = await generateAreaContent({
      tenantName, industry, area, services, businessDescription, differentiators,
      anthropicApiKey: tenant.anthropic_api_key as string | null | undefined,
    })
    if ('error' in result) {
      areaErrors.push({ area: area.name, reason: result.error })
      continue
    }

    const rows = [
      { tenant_id: tenantId, page_type: 'location', slug: area.urlSlug, content: result.location },
      { tenant_id: tenantId, page_type: 'job', slug: area.urlSlug, content: result.job },
    ]
    const { error: upsertErr } = await supabaseAdmin
      .from('tenant_site_content')  // tenant-scope-ok: rows carry tenant_id (built above)
      .upsert(rows, { onConflict: 'tenant_id,page_type,slug' })

    if (upsertErr) {
      areaErrors.push({ area: area.name, reason: `write failed: ${upsertErr.message}` })
      continue
    }
    locationPagesWritten++
    jobPagesWritten++
  }

  return {
    ok: true,
    areasTotal: coverage.areas.length,
    areasProcessed: areasToProcess.length,
    areasSkippedOverCap,
    locationPagesWritten,
    jobPagesWritten,
    areaErrors,
  }
}
