/**
 * Bank-transaction categorization.
 * Cascading strategy:
 *   1. Exact pattern hit in categorization_patterns (per-tenant) → confidence 0.95
 *   2. Substring pattern hit (normalized description contains a stored pattern) → 0.85
 *   3. Claude fallback for unseen descriptions → LLM-scored confidence
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'
import { normalizeDescription } from './ledger'
import { decryptSecret } from './secret-crypto'

let _client: Anthropic | null = null
function getClient(apiKey?: string | null): Anthropic {
  if (apiKey) return new Anthropic({ apiKey })
  if (!_client) _client = new Anthropic()
  return _client
}

export interface Suggestion {
  coa_id: string
  confidence: number
  source: 'exact' | 'substring' | 'llm'
  reason?: string
}

interface CoARow {
  id: string
  code: string
  name: string
  type: string
  subtype: string | null
  is_bank_account: boolean
}

interface PatternRow {
  pattern: string
  coa_id: string
  hit_count: number
}

/** Suggest a CoA for a single transaction. */
export async function suggestCoa(opts: {
  tenant_id: string
  description: string
  amount_cents: number
  counterparty?: string | null
  coas: CoARow[]
  patterns: PatternRow[]
  anthropicKey?: string | null
}): Promise<Suggestion | null> {
  const norm = normalizeDescription(opts.description)

  // 1. Exact pattern match
  const exact = opts.patterns.find(p => p.pattern === norm)
  if (exact) return { coa_id: exact.coa_id, confidence: 0.95, source: 'exact', reason: `Previously categorized as this` }

  // 2. Substring match — prefer the pattern with highest hit_count whose
  //    pattern is contained in the normalized description.
  const substr = opts.patterns
    .filter(p => p.pattern.length >= 4 && norm.includes(p.pattern))
    .sort((a, b) => b.hit_count - a.hit_count)[0]
  if (substr) return { coa_id: substr.coa_id, confidence: 0.85, source: 'substring', reason: `Matches prior pattern "${substr.pattern}"` }

  // 3. LLM fallback — only non-bank CoAs are valid categorization targets
  const candidates = opts.coas.filter(c => !c.is_bank_account)
  if (candidates.length === 0) return null

  const isOutflow = opts.amount_cents < 0
  const dollars = (Math.abs(opts.amount_cents) / 100).toFixed(2)
  const typeHint = isOutflow ? 'expense or liability' : 'income or asset'

  const chartLines = candidates
    .map(c => `${c.id}|${c.code}|${c.name}|${c.type}${c.subtype ? `:${c.subtype}` : ''}`)
    .join('\n')

  const prompt = `You categorize US home-services business bank transactions into a double-entry chart of accounts. Return ONLY a JSON object, nothing else.

TRANSACTION:
  Description: ${opts.description}
  Amount: $${dollars} (${isOutflow ? 'outflow' : 'inflow'} — likely a ${typeHint})
  ${opts.counterparty ? `Counterparty: ${opts.counterparty}` : ''}

CANDIDATE ACCOUNTS (pipe-delimited: id|code|name|type[:subtype]):
${chartLines}

Output JSON with exactly these fields:
{
  "coa_id": "<one of the ids above>",
  "confidence": 0.0-1.0,
  "reason": "<one short sentence>"
}

Rules:
- If outflow, pick an expense/liability account; if inflow, pick income/asset
- Prefer specific subtypes (cogs, operating) over generic "Other Expenses"
- Use 0.5-0.7 confidence for educated guesses; 0.8+ only when the description is unambiguous
- Do not invent account IDs — use only the ids above
`

  const client = getClient(opts.anthropicKey || null)
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  const match = /\{[\s\S]*\}/.exec(text)
  if (!match) return null
  let parsed: { coa_id?: string; confidence?: number; reason?: string }
  try { parsed = JSON.parse(match[0]) } catch { return null }
  if (!parsed.coa_id) return null

  const found = candidates.find(c => c.id === parsed.coa_id)
  if (!found) return null

  return {
    coa_id: parsed.coa_id,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    source: 'llm',
    reason: parsed.reason || undefined,
  }
}

/** Bulk-suggest for every pending bank_transaction in a tenant. */
export async function suggestPending(tenant_id: string): Promise<{ processed: number; suggestedCount: number; skipped: number }> {
  // Preload the CoA, patterns, tenant key once
  const [coasRes, patternsRes, tenantRes, txnsRes] = await Promise.all([
    supabaseAdmin.from('chart_of_accounts').select('id,code,name,type,subtype,is_bank_account').eq('tenant_id', tenant_id).eq('active', true),
    supabaseAdmin.from('categorization_patterns').select('pattern,coa_id,hit_count').eq('tenant_id', tenant_id),
    supabaseAdmin.from('tenants').select('anthropic_api_key').eq('id', tenant_id).single(),
    supabaseAdmin.from('bank_transactions').select('id,description,amount_cents,counterparty,suggested_coa_id').eq('tenant_id', tenant_id).eq('status', 'pending').limit(500),
  ])
  const coas = (coasRes.data || []) as CoARow[]
  const patterns = (patternsRes.data || []) as PatternRow[]
  const anthropicKey = tenantRes.data?.anthropic_api_key ? decryptSecret(tenantRes.data.anthropic_api_key as string) : null
  const txns = txnsRes.data || []

  let suggestedCount = 0
  let skipped = 0
  for (const t of txns) {
    if (t.suggested_coa_id) { skipped++; continue }
    try {
      const s = await suggestCoa({
        tenant_id,
        description: t.description,
        amount_cents: t.amount_cents,
        counterparty: t.counterparty,
        coas,
        patterns,
        anthropicKey,
      })
      if (s) {
        await supabaseAdmin
          .from('bank_transactions')
          .update({ suggested_coa_id: s.coa_id, suggested_confidence: s.confidence })
          .eq('id', t.id)
        suggestedCount++
      }
    } catch (e) {
      console.warn('[categorize-ai] suggest failed for', t.id, e)
    }
  }
  return { processed: txns.length, suggestedCount, skipped }
}
