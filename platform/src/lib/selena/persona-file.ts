// The tenant PERSONALITY FILE — the authored `Persona` stored in
// `tenants.selena_config` and edited via the Selena Persona admin UI
// (src/app/admin/businesses/[id]/selena-persona/page.tsx).
//
// BACKGROUND: the persona editor + store already existed, but the agent never
// read it — everything a tenant authored was dead data. This module wires it in:
//   - applyPersonaToConfig(): folds fields that map onto AgentConfig (openers,
//     banned phrases, qualifying questions, policies) so they flow through the
//     existing buildPlaybook.
//   - renderPersonaExtras(): renders the rich fields with no AgentConfig slot
//     (sales, upsell, custom, business story) as an authored prompt block, so
//     NOTHING authored is dropped.
//
// nyc-maid does NOT use this path (agent.ts short-circuits to YINEZ_PROMPT), so
// it stays byte-identical. Tenants with an empty selena_config are unaffected:
// applyPersonaToConfig is a no-op and renderPersonaExtras returns ''.

import { supabaseAdmin } from '@/lib/supabase'
import type { AgentConfig } from './agent-config'

// Mirror of the shape authored by the Selena Persona UI. All fields optional —
// selena_config is JSONB and may be `{}` or partially filled.
export interface Persona {
  // identity
  business_description?: string
  business_story?: string
  opening_lines?: string[]
  sign_off?: string[]
  banned_phrases?: string[]
  // sales
  value_props?: string[]
  usps?: string[]
  social_proof?: string
  guarantees?: string[]
  sales_approach?: string
  objection_handlers?: { trigger: string; response: string }[]
  // policies
  refund_policy?: string
  first_time_restrictions?: string
  liability_statement?: string
  // operations
  never_do?: string[]
  always_ask?: string[]
  team_intro?: string
  // lead qual
  qualifying_questions?: string[]
  disqualifiers?: string[]
  // upsell
  addons?: { label: string; price: string }[]
  upsell_triggers?: string[]
  recurring_incentive?: string
  referral_program_pitch?: string
  // custom
  custom_fields?: { category: string; label: string; value: string }[]
}

/** Read the tenant's authored personality file. Returns {} if none. */
export async function getPersona(tenantId: string): Promise<Persona> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('selena_config')
    .eq('id', tenantId)
    .single()
  const raw = (data?.selena_config ?? {}) as Record<string, unknown>
  return raw as Persona
}

const nonEmpty = (s?: string): s is string => typeof s === 'string' && s.trim().length > 0
const arr = (a?: unknown[]): a is unknown[] => Array.isArray(a) && a.length > 0
const uniq = (items: string[]): string[] => Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)))

/**
 * Fold the persona fields that have a natural AgentConfig home into the config,
 * so they render through the existing buildPlaybook. Immutable — returns a new
 * config, never mutates the input.
 */
export function applyPersonaToConfig(cfg: AgentConfig, p: Persona): AgentConfig {
  if (!p || Object.keys(p).length === 0) return cfg

  const openers = arr(p.opening_lines) ? (p.opening_lines as string[]) : cfg.voice.openers
  const bannedPhrases = arr(p.banned_phrases)
    ? uniq([...cfg.voice.banned_phrases, ...(p.banned_phrases as string[])])
    : cfg.voice.banned_phrases
  const questions = arr(p.qualifying_questions) ? (p.qualifying_questions as string[]) : cfg.intake.questions

  const policyAdds: string[] = []
  if (nonEmpty(p.refund_policy)) policyAdds.push(`Refunds: ${p.refund_policy!.trim()}`)
  if (nonEmpty(p.first_time_restrictions)) policyAdds.push(`First-time customers: ${p.first_time_restrictions!.trim()}`)
  if (nonEmpty(p.liability_statement)) policyAdds.push(p.liability_statement!.trim())
  if (arr(p.never_do)) for (const n of p.never_do as string[]) if (nonEmpty(n)) policyAdds.push(`Never: ${n.trim()}`)
  if (arr(p.always_ask)) for (const a of p.always_ask as string[]) if (nonEmpty(a)) policyAdds.push(`Always ask: ${a.trim()}`)

  return {
    ...cfg,
    voice: { ...cfg.voice, openers, banned_phrases: bannedPhrases },
    intake: { ...cfg.intake, questions },
    policies: [...cfg.policies, ...policyAdds],
  }
}

/**
 * Render the authored fields that have no AgentConfig slot as a prompt block
 * appended after the playbook. Returns '' when there's nothing authored.
 */
export function renderPersonaExtras(p: Persona): string {
  if (!p || Object.keys(p).length === 0) return ''
  const lines: string[] = []
  const bullets = (items?: unknown[]): string =>
    (items as string[] | undefined)?.filter((s) => nonEmpty(s)).map((s) => `- ${s.trim()}`).join('\n') || ''

  const section = (title: string, body: string) => {
    if (nonEmpty(body)) lines.push(`${title}\n${body}`)
  }

  if (nonEmpty(p.business_description)) section('WHAT THE BUSINESS DOES', p.business_description!.trim())
  if (nonEmpty(p.business_story)) section('THE STORY (use naturally, never recite)', p.business_story!.trim())
  if (nonEmpty(p.team_intro)) section('THE TEAM', p.team_intro!.trim())
  if (arr(p.value_props)) section('WHY US (value props)', bullets(p.value_props))
  if (arr(p.usps)) section('WHAT MAKES US DIFFERENT', bullets(p.usps))
  if (nonEmpty(p.social_proof)) section('SOCIAL PROOF (mention when it helps close)', p.social_proof!.trim())
  if (arr(p.guarantees)) section('GUARANTEES', bullets(p.guarantees))
  if (nonEmpty(p.sales_approach)) section('HOW WE SELL', p.sales_approach!.trim())
  if (arr(p.objection_handlers)) {
    const oh = (p.objection_handlers as { trigger: string; response: string }[])
      .filter((o) => nonEmpty(o?.trigger) && nonEmpty(o?.response))
      .map((o) => `- If they say "${o.trigger.trim()}" → ${o.response.trim()}`)
      .join('\n')
    section('OBJECTION HANDLING', oh)
  }
  if (arr(p.disqualifiers)) section('DISQUALIFIERS (politely decline / escalate)', bullets(p.disqualifiers))
  if (arr(p.addons)) {
    const ad = (p.addons as { label: string; price: string }[])
      .filter((a) => nonEmpty(a?.label))
      .map((a) => `- ${a.label.trim()}${nonEmpty(a.price) ? ` (${a.price.trim()})` : ''}`)
      .join('\n')
    section('ADD-ONS YOU CAN OFFER', ad)
  }
  if (arr(p.upsell_triggers)) section('WHEN TO UPSELL', bullets(p.upsell_triggers))
  if (nonEmpty(p.recurring_incentive)) section('RECURRING INCENTIVE', p.recurring_incentive!.trim())
  if (nonEmpty(p.referral_program_pitch)) section('REFERRAL PITCH', p.referral_program_pitch!.trim())
  if (arr(p.sign_off)) section('SIGN-OFFS (rotate, natural)', bullets(p.sign_off))
  if (arr(p.custom_fields)) {
    const cf = (p.custom_fields as { category: string; label: string; value: string }[])
      .filter((c) => nonEmpty(c?.label) && nonEmpty(c?.value))
      .map((c) => `- ${c.label.trim()}: ${c.value.trim()}`)
      .join('\n')
    section('BUSINESS-SPECIFIC NOTES', cf)
  }

  if (lines.length === 0) return ''
  return `\n\n=== BUSINESS-SPECIFIC PERSONA (authored by the owner — honor all of it) ===\n${lines.join('\n\n')}`
}
