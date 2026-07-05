// ---------------------------------------------------------------------------
// SIGNAL content enrichment — the deep_underperformer remedy (roadmap #1).
//
// deep_underperformer pages rank poorly because they're thin; a title tweak
// can't fix that. This drafts a genuinely useful, page-specific content block
// grounded in the TENANT'S OWN authored business knowledge (the same persona +
// config Selena uses) — real services, pricing, service area, guarantees. That
// grounding is deliberate: Google's scaled-content-abuse policy nukes mass
// template-with-variables AI pages, but rewards content with real, differentiated
// data. Each block targets ONE page's query with facts no other page repeats.
//
// GATED BY DESIGN: drafts to seo_changes (field='enrichment', Tier-2, proposed).
// Nothing is applied to a live page here — content is high-stakes and stays
// human-reviewed. A quality gate discards anything thin, fabricated, off-topic,
// or near-duplicate of the existing page before it ever reaches review.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { getPersona, renderPersonaExtras } from '@/lib/selena/persona-file'
import { getAgentConfig } from '@/lib/selena/agent-config-loader'

const MODEL = 'claude-sonnet-5'
const MIN_LEN = 350 // enrichment must be substantial
const MAX_LEN = 2200 // but not a wall of text
const DUP_THRESHOLD = 0.5 // reject if >50% shingle overlap with existing page

type Issue = {
  id: string
  property: string
  tenant_id: string
  target_url: string | null
  detail: { top_query?: string; query?: string; impressions?: number }
}

// --- tenant knowledge: the same facts Selena speaks from -------------------
async function tenantKnowledge(tid: string): Promise<{ block: string; facts: string[] }> {
  const [cfg, persona] = await Promise.all([getAgentConfig(tid), getPersona(tid)])
  const parts: string[] = []
  const facts: string[] = []

  if (cfg.identity?.business_name) {
    parts.push(`BUSINESS: ${cfg.identity.business_name}`)
    facts.push(cfg.identity.business_name)
  }
  if (cfg.service_area) {
    parts.push(`SERVICE AREA: ${cfg.service_area}`)
    facts.push(cfg.service_area)
  }
  if (cfg.pricing?.copy) {
    parts.push(`PRICING (quote verbatim, never invent): ${cfg.pricing.copy}`)
    facts.push(cfg.pricing.copy)
  }
  if (cfg.contact?.phone) parts.push(`PHONE: ${cfg.contact.phone}`)
  if (Array.isArray(cfg.policies) && cfg.policies.length) {
    parts.push(`POLICIES:\n${cfg.policies.map((p) => `- ${p}`).join('\n')}`)
    facts.push(...cfg.policies)
  }
  const extras = renderPersonaExtras(persona)
  if (extras) {
    parts.push(extras)
    facts.push(extras)
  }
  return { block: parts.join('\n\n'), facts }
}

// --- existing page text (so the block adds, not duplicates) ----------------
async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return ''
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)
  } catch {
    return ''
  }
}

// --- content quality gate --------------------------------------------------
const CLAIM_RE =
  /#\s?1|\bno\.?\s?1\b|\bbest\b|\btop[-\s]?rated\b|\baward[-\s]?winning\b|\bvoted\b|\bguarantee[d]?\b|\b100%\b|\b5[-\s]?star\b|\b\d{2,}\+?\s*(?:reviews|customers|clients|years)\b/gi

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Word-trigram shingles for near-duplicate detection. */
function shingles(s: string): Set<string> {
  const w = norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`)
  return out
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let hit = 0
  for (const s of a) if (b.has(s)) hit++
  return hit / a.size
}

type GateCtx = { query: string; existing: string; knowledge: string; facts: string[] }

export function evaluateEnrichment(text: string, ctx: GateCtx): { pass: boolean; reasons: string[] } {
  const reasons: string[] = []
  const body = text?.trim() ?? ''

  if (body.length < MIN_LEN) reasons.push(`too thin (${body.length} < ${MIN_LEN})`)
  if (body.length > MAX_LEN) reasons.push(`too long (${body.length} > ${MAX_LEN})`)

  // On-topic: must reference the target query's intent.
  const qWords = norm(ctx.query).split(/\s+/).filter((w) => w.length >= 4)
  const bodyNorm = norm(body)
  if (qWords.length && !qWords.some((w) => bodyNorm.includes(w))) {
    reasons.push('off-topic (no query terms)')
  }

  // Grounded: must reuse at least one real tenant fact, not float free.
  const grounded = ctx.facts.some((f) => {
    const t = norm(f).split(/\s+/).filter((w) => w.length >= 5)
    return t.some((w) => bodyNorm.includes(w))
  })
  if (!grounded && ctx.facts.length) reasons.push('not grounded in tenant facts')

  // No fabricated superlatives/counts that aren't in the provided knowledge.
  const known = norm(ctx.knowledge)
  const introduced = [...new Set([...bodyNorm.matchAll(CLAIM_RE)].map((m) => m[0].trim()))].filter(
    (c) => !known.includes(c),
  )
  if (introduced.length) reasons.push(`unverified claim: ${introduced.join(', ')}`)

  // Not a near-duplicate of what's already on the page.
  if (ctx.existing) {
    const dup = overlap(shingles(body), shingles(ctx.existing))
    if (dup > DUP_THRESHOLD) reasons.push(`duplicates existing page (${Math.round(dup * 100)}%)`)
  }

  return { pass: reasons.length === 0, reasons }
}

// --- generation ------------------------------------------------------------
function buildPrompt(query: string, knowledge: string, existing: string): string {
  return `You are writing ONE additional on-page content section for a local service business's web page, to help it rank for the search "${query}" and genuinely help the visitor.

THE BUSINESS (use ONLY these real facts — never invent prices, guarantees, awards, review counts, or claims not stated here):
${knowledge}

WHAT'S ALREADY ON THE PAGE (do NOT repeat it — add something new and specific):
${existing.slice(0, 2500) || '(could not fetch existing page)'}

Write a genuinely useful section (250–400 words) SPECIFIC to "${query}" — e.g. what this service includes, what to expect, local specifics for the service area, honest answers a real customer asks. Distinct from the existing page. Natural, human, no filler, no keyword stuffing, no fabricated claims.

Return ONLY JSON: {"heading":"...","body":"...markdown...","rationale":"one sentence on the ranking + user value"}`
}

async function enrichOne(issue: Issue, knowledge: { block: string; facts: string[] }): Promise<'proposed' | 'rejected' | 'skipped'> {
  const url = issue.target_url
  const query = issue.detail?.top_query ?? issue.detail?.query
  if (!url || !query) return 'skipped'

  const existing = await fetchPageText(url)
  const client = await resolveAnthropic(issue.tenant_id)
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1400,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: buildPrompt(query, knowledge.block, existing) }],
  })
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return 'skipped'

  let parsed: { heading?: string; body?: string; rationale?: string }
  try {
    parsed = JSON.parse(json)
  } catch {
    return 'skipped'
  }
  const block = [parsed.heading ? `## ${parsed.heading}` : '', parsed.body ?? ''].filter(Boolean).join('\n\n').trim()

  const gate = evaluateEnrichment(block, { query, existing, knowledge: knowledge.block, facts: knowledge.facts })
  if (!gate.pass) {
    await supabaseAdmin
      .from('seo_changes')
      .update({ status: 'rejected', rationale: `enrichment gate: ${gate.reasons.join('; ')}` })
      .eq('issue_id', issue.id)
      .eq('field', 'enrichment')
      .eq('status', 'proposed')
    return 'rejected'
  }

  // Idempotent: clear any prior proposal for this issue, then store the draft.
  await supabaseAdmin.from('seo_changes').delete().eq('issue_id', issue.id).eq('field', 'enrichment').eq('status', 'proposed')
  await supabaseAdmin.from('seo_changes').insert({
    issue_id: issue.id,
    property: issue.property,
    tenant_id: issue.tenant_id,
    target_url: url,
    recipe: 'enrich',
    tier: 2,
    field: 'enrichment',
    before_value: null,
    after_value: block,
    rationale: parsed.rationale ?? null,
    status: 'proposed',
    before_metric: issue.detail,
  })
  return 'proposed'
}

export async function generateEnrichments(opts?: { limit?: number }): Promise<{
  issues: number
  proposed: number
  rejected: number
  skipped: number
}> {
  const limit = opts?.limit ?? 20
  // Only tenant-linked deep_underperformers — we need the tenant's knowledge to
  // ground the content. Highest-value first.
  const { data } = await supabaseAdmin
    .from('seo_issues')
    .select('id,property,tenant_id,target_url,detail')
    .eq('status', 'open')
    .eq('type', 'deep_underperformer')
    .not('tenant_id', 'is', null)
    .not('target_url', 'is', null)
    .order('value', { ascending: false })
    .limit(limit)

  const issues = (data ?? []) as Issue[]
  const knowledgeCache = new Map<string, { block: string; facts: string[] }>()
  let proposed = 0
  let rejected = 0
  let skipped = 0

  for (const issue of issues) {
    try {
      if (!knowledgeCache.has(issue.tenant_id)) knowledgeCache.set(issue.tenant_id, await tenantKnowledge(issue.tenant_id))
      const knowledge = knowledgeCache.get(issue.tenant_id)!
      if (!knowledge.facts.length) {
        skipped++ // no authored knowledge → can't ground safely, skip
        continue
      }
      const outcome = await enrichOne(issue, knowledge)
      if (outcome === 'proposed') proposed++
      else if (outcome === 'rejected') rejected++
      else skipped++
    } catch (e) {
      console.error(`[seo/enrich] ${issue.target_url}: ${e instanceof Error ? e.message : e}`)
      skipped++
    }
  }

  return { issues: issues.length, proposed, rejected, skipped }
}
