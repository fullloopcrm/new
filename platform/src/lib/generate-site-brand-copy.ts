/**
 * AI-personalized site copy — the "go wild" step of Activate automation.
 *
 * provisionTenant()/draftTailoredServices() already tailor the SERVICE list.
 * This module tailors the WORDS: a short tagline, a homepage hero line, and
 * an About-page opening paragraph, drafted from the tenant's own onboarding
 * answers (business_description, differentiators, brand_key_takeaway,
 * brand_proud_moment, brand_never_do — see tenant-profile.ts PROFILE_FIELDS)
 * so two same-industry tenants stop reading like the same template with the
 * name swapped.
 *
 * Same auto-apply contract as draftTailoredServices: constrained JSON output,
 * validated before anything is written, rejected wholesale (nothing partial)
 * on any shape/length/quality failure. Unlike draftInitialSiteContent (which
 * only ever suggests to tenant_notes for a human to review), this WRITES —
 * that tradeoff is safe here because the output is validated structurally
 * AND for quality (length bounds, business name must appear, no placeholder
 * tokens, no generic filler) before it ever reaches the DB, and it only ever
 * touches namespaced site_* fields — it never overwrites the tenant's own
 * business_description, tagline (if they already set one), or differentiators
 * (passed through raw, never paraphrased, in generate-tenant-site consumers).
 */
import { supabaseAdmin } from './supabase'
import { anthropicFromStoredKey } from './anthropic-client'

const MODEL = 'claude-sonnet-4-6'

const BANNED_FILLER = [
  'customer satisfaction is our top priority',
  'we take pride in',
  'we strive to',
  'look no further',
  'lorem ipsum',
]

export interface BrandCopyDraft {
  tagline: string
  heroLine: string
  aboutIntro: string
}

export interface BrandCopyResult {
  applied: boolean
  draft?: BrandCopyDraft
  reason?: string
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
 * Validate + quality-gate the model's response. Returns null on ANY failure —
 * shape, length, or quality — so the caller never applies a partial or weak
 * draft. Exported for unit testing.
 */
export function validateBrandCopy(raw: unknown, tenantName: string): BrandCopyDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const { tagline, heroLine, aboutIntro } = r

  if (typeof tagline !== 'string' || typeof heroLine !== 'string' || typeof aboutIntro !== 'string') return null

  const t = tagline.trim()
  const h = heroLine.trim()
  const a = aboutIntro.trim()

  if (t.length === 0 || t.length > 60) return null
  if (h.length === 0 || h.length > 160) return null
  if (a.length < 200 || a.length > 900) return null

  for (const text of [t, h, a]) {
    if (containsPlaceholderToken(text)) return null
    if (containsBannedFiller(text)) return null
  }

  // The business's real name must actually appear — the concrete, checkable
  // proxy for "this reads as written for THIS business," not a generic swap.
  const nameLower = tenantName.trim().toLowerCase()
  if (nameLower && !a.toLowerCase().includes(nameLower) && !h.toLowerCase().includes(nameLower)) return null

  return { tagline: t, heroLine: h, aboutIntro: a }
}

export function buildBrandCopyPrompt(params: {
  tenantName: string
  industry: string
  businessDescription: string
  differentiators: string[]
  brandKeyTakeaway: string
  brandProudMoment: string
  brandNeverDo: string
}): string {
  const { tenantName, industry, businessDescription, differentiators, brandKeyTakeaway, brandProudMoment, brandNeverDo } = params
  return `You are writing website copy for a real ${industry} business, using ONLY what they told us about themselves — not generic industry boilerplate.

Business name: ${tenantName}
What they do (their own words): ${businessDescription || '(not provided)'}
What makes them different (their own words): ${differentiators.length > 0 ? differentiators.join('; ') : '(not provided)'}
The one thing they want remembered: ${brandKeyTakeaway || '(not provided)'}
Something they're genuinely proud of: ${brandProudMoment || '(not provided)'}
Something they'd never do: ${brandNeverDo || '(not provided)'}

Write three pieces of copy, each grounded in the specifics above — not swappable with any other ${industry} business:
1. "tagline": under 60 characters, for under the business name.
2. "heroLine": under 160 characters, the subheading under the homepage headline.
3. "aboutIntro": 2-4 sentences (roughly 250-600 characters), the opening paragraph of the About page. Must mention "${tenantName}" by name.

HARD RULES:
- Use specifics from what they told us. If they gave you almost nothing, keep it honest and plain rather than inventing details.
- Never use generic filler ("customer satisfaction is our top priority", "we take pride in", "we strive to", "look no further").
- Never include a placeholder like [Business Name] or {{...}} — always the real name, "${tenantName}".
- No emoji, no exclamation-point marketing voice.

Return ONLY raw JSON: {"tagline": "...", "heroLine": "...", "aboutIntro": "..."}. No markdown, no code fences, no explanation.`
}

/**
 * Draft + apply personalized brand copy for a tenant. No-ops (best-effort,
 * never throws) when there's no qualitative onboarding input to draw from,
 * the AI call fails, or the response fails validation — same non-blocking
 * contract as draftTailoredServices so callers (activateTenant) can treat
 * this as one more best-effort provisioning step.
 */
export async function generateSiteBrandCopy(tenantId: string): Promise<BrandCopyResult> {
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('name, industry, tagline, selena_config, anthropic_api_key')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    return { applied: false, reason: `tenant not found: ${error?.message || 'no row'}` }
  }

  const selena = (tenant.selena_config as Record<string, unknown> | null) || {}
  const businessDescription = typeof selena.business_description === 'string' ? selena.business_description : ''
  const differentiators = Array.isArray(selena.differentiators)
    ? (selena.differentiators as unknown[]).filter((d): d is string => typeof d === 'string' && d.trim() !== '')
    : []
  const brandKeyTakeaway = typeof selena.brand_key_takeaway === 'string' ? selena.brand_key_takeaway : ''
  const brandProudMoment = typeof selena.brand_proud_moment === 'string' ? selena.brand_proud_moment : ''
  const brandNeverDo = typeof selena.brand_never_do === 'string' ? selena.brand_never_do : ''

  if (!businessDescription && differentiators.length === 0 && !brandKeyTakeaway && !brandProudMoment) {
    return { applied: false, reason: 'no qualitative onboarding input to draft from' }
  }

  const tenantName = (tenant.name as string | null) || 'this business'
  const industry = (tenant.industry as string | null) || 'general'

  let text: string
  try {
    const client = anthropicFromStoredKey(tenant.anthropic_api_key as string | null | undefined)
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: buildBrandCopyPrompt({ tenantName, industry, businessDescription, differentiators, brandKeyTakeaway, brandProudMoment, brandNeverDo }),
      }],
    })
    text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  } catch (e) {
    const err = e as { message?: string }
    return { applied: false, reason: `AI call failed: ${err.message || 'unknown error'}` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(stripFences(text))
  } catch {
    return { applied: false, reason: 'failed to parse AI response as JSON' }
  }

  const draft = validateBrandCopy(parsed, tenantName)
  if (!draft) {
    return { applied: false, reason: 'AI response failed shape/length/quality validation — not applied' }
  }

  const nextSelena = { ...selena, site_hero_line: draft.heroLine, site_about_intro: draft.aboutIntro }
  const updates: Record<string, unknown> = { selena_config: nextSelena }
  // Never overwrite a tagline the tenant already set themselves.
  if (!tenant.tagline) updates.tagline = draft.tagline

  const { error: updateErr } = await supabaseAdmin.from('tenants').update(updates).eq('id', tenantId)
  if (updateErr) {
    return { applied: false, reason: `write failed: ${updateErr.message}` }
  }

  return { applied: true, draft }
}
