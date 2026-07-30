/**
 * AI service-list tailoring — Phase 2 (Projects/Services build-out), Phase B.
 *
 * provisionTenant() seeds every tenant with the same generic industry preset
 * (see industry-presets.ts) — a painting tenant and every other painting
 * tenant get the identical 10 services in the identical order. This module
 * asks Claude to reorder, rename, and hide (never invent, price, or delete)
 * those SAME seeded service_types rows so the picker reads like it was built
 * for THIS business, using the tenant's own business_description for context.
 *
 * Constrained-output guarantee: the model may only return edits to rows that
 * already exist. Every response is validated against the exact set of seeded
 * row IDs before anything is applied — an id that isn't in the original set,
 * a missing id, a duplicate id, or a malformed response is rejected wholesale
 * (nothing partial is ever applied). This is why it's safe to apply directly
 * instead of surfacing as a suggestion like draft campaign/site copy: it can
 * never touch price_cents, default_hourly_rate, pricing_model, per_unit, or
 * duration — only name, sort_order, and active. No brand-voice risk because
 * there's no way for it to introduce a wrong price or a fabricated service.
 *
 * Same anthropicFromStoredKey() resolution pattern as every other tenant-
 * scoped AI call (see anthropic-client.ts); same JSON-in/JSON-out, strip-
 * markdown-fences, try/catch-parse shape as
 * src/app/api/admin/campaigns/generate/route.ts.
 *
 * Best-effort by design: on any failure (no rows, no API key, malformed
 * response, validation failure) this returns { applied: false, reason }
 * rather than throwing, so a caller (provisionTenant / activateTenant) can
 * treat it exactly like every other non-blocking provisioning step.
 */
import { supabaseAdmin } from './supabase'
import { anthropicFromStoredKey } from './anthropic-client'

const MODEL = 'claude-sonnet-4-6'

export interface SeededServiceRow {
  id: string
  name: string
  description: string | null
  active: boolean
  sort_order: number
}

/** One row's tailored edit. Only these three fields are ever written. */
export interface TailoredServiceEdit {
  id: string
  name: string
  sort_order: number
  active: boolean
}

export interface TailorResult {
  applied: boolean
  edits: TailoredServiceEdit[]
  /** Present when applied is false — why nothing was written. */
  reason?: string
}

function stripFences(text: string): string {
  return text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
}

/**
 * Validate the model's response against the original seeded rows. Rejects
 * (returns null) unless the response is EXACTLY a reorder/rename/deactivate
 * of the original set — same ids, one edit per row, no extras, no gaps.
 */
export function validateTailoredEdits(
  raw: unknown,
  originalRows: SeededServiceRow[],
): TailoredServiceEdit[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length !== originalRows.length) return null

  const originalIds = new Set(originalRows.map((r) => r.id))
  const seenIds = new Set<string>()
  const edits: TailoredServiceEdit[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null
    const e = entry as Record<string, unknown>
    const id = e.id
    const name = e.name
    const sortOrder = e.sort_order
    const active = e.active

    if (typeof id !== 'string' || !originalIds.has(id)) return null
    if (seenIds.has(id)) return null // duplicate — reject wholesale
    if (typeof name !== 'string' || name.trim().length === 0) return null
    if (typeof sortOrder !== 'number' || !Number.isFinite(sortOrder)) return null
    if (typeof active !== 'boolean') return null

    seenIds.add(id)
    edits.push({ id, name: name.trim(), sort_order: sortOrder, active })
  }

  // Every original id must appear exactly once — no silent omissions.
  if (seenIds.size !== originalIds.size) return null

  return edits
}

export function buildPrompt(
  tenantName: string,
  industry: string,
  businessDescription: string,
  rows: SeededServiceRow[],
): string {
  const rowList = rows
    .map((r) => `  { "id": "${r.id}", "name": ${JSON.stringify(r.name)}, "description": ${JSON.stringify(r.description || '')}, "sort_order": ${r.sort_order}, "active": ${r.active} }`)
    .join(',\n')

  return `You are tailoring a ${industry} business's service picker so it reads like it was built specifically for THEM, not a generic ${industry} template.

Business: ${tenantName}
What they do (in their own words, if provided): ${businessDescription || '(not provided — use generic professional tone for this trade)'}

Here are their CURRENT seeded services, exactly as they exist in the database:
[
${rowList}
]

Task: return a JSON array with EXACTLY one object per row above (same "id" values, nothing added or removed), reordering/renaming/hiding to fit this specific business:
- "sort_order": re-rank so the services this business would lead with come first (lower number = shown first).
- "name": you may lightly rename for clarity or tone (e.g. more specific, less generic) — but do NOT invent a different service, do NOT change what it means, do NOT reference a price or duration.
- "active": set to false ONLY for a service that clearly doesn't fit this business based on their description; otherwise leave true.

HARD RULES:
- Return exactly ${rows.length} objects — one per id above, every id used exactly once.
- Never invent a new "id" — only use the ids given.
- Never mention or imply a price, rate, or duration in "name".
- Do not add any field besides "id", "name", "sort_order", "active".

Return ONLY the raw JSON array. No markdown, no code fences, no explanation.`
}

/**
 * Draft + apply tailored services for a tenant. Reads the tenant's ALREADY-
 * seeded service_types rows (from provisionTenant's industry preset) and
 * business_description, asks Claude to reorder/rename/deactivate them, and
 * writes the validated result back to service_types. No-ops (best-effort)
 * if there are no services, no business description context is fine (falls
 * back to generic tone), or the AI/validation step fails for any reason.
 */
export async function draftTailoredServices(tenantId: string): Promise<TailorResult> {
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('name, industry, selena_config, anthropic_api_key')
    .eq('id', tenantId)
    .single()

  if (tenantErr || !tenant) {
    return { applied: false, edits: [], reason: `tenant not found: ${tenantErr?.message || 'no row'}` }
  }

  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from('service_types')
    .select('id, name, description, active, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (rowsErr) {
    return { applied: false, edits: [], reason: `service_types read failed: ${rowsErr.message}` }
  }
  if (!rows || rows.length === 0) {
    return { applied: false, edits: [], reason: 'no seeded services to tailor' }
  }

  const originalRows: SeededServiceRow[] = rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    active: r.active !== false,
    sort_order: r.sort_order as number,
  }))

  const selena = (tenant.selena_config as Record<string, unknown> | null) || {}
  const businessDescription = typeof selena.business_description === 'string' ? selena.business_description : ''
  const industry = (tenant.industry as string | null) || 'general'
  const tenantName = (tenant.name as string | null) || 'this business'

  let text: string
  try {
    const client = anthropicFromStoredKey(tenant.anthropic_api_key as string | null | undefined)
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(tenantName, industry, businessDescription, originalRows) }],
    })
    text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  } catch (e) {
    const err = e as { message?: string }
    return { applied: false, edits: [], reason: `AI call failed: ${err.message || 'unknown error'}` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(stripFences(text))
  } catch {
    return { applied: false, edits: [], reason: 'failed to parse AI response as JSON' }
  }

  const edits = validateTailoredEdits(parsed, originalRows)
  if (!edits) {
    return { applied: false, edits: [], reason: 'AI response failed validation (id/shape mismatch) — not applied' }
  }

  // Only write rows that actually changed — fewer no-op updates, and any
  // partial DB failure below only touches rows that were meant to change.
  const changed = edits.filter((e) => {
    const orig = originalRows.find((r) => r.id === e.id)!
    return orig.name !== e.name || orig.sort_order !== e.sort_order || orig.active !== e.active
  })

  for (const e of changed) {
    const { error: updateErr } = await supabaseAdmin
      .from('service_types')
      .update({ name: e.name, sort_order: e.sort_order, active: e.active })
      .eq('id', e.id)
      .eq('tenant_id', tenantId)
    if (updateErr) {
      return { applied: false, edits: [], reason: `write failed on row ${e.id}: ${updateErr.message}` }
    }
  }

  return { applied: true, edits }
}
