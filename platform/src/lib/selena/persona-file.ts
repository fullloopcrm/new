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
  // voice & personality (2026-07-30 onboarding gap-fill — see PROFILE_FIELDS 'ai'
  // section). `tone` reuses the pre-existing (previously dead / write-only)
  // selena_config.tone key instead of adding a duplicate field.
  tone?: string
  phrases_to_use?: string[]
  // Pre-existing 'ai' section onboarding fields, wired in 2026-07-30 (same bug
  // class as tone: saved by the wizard, never read by this engine).
  // greeting: single preferred greeting, prepended onto voice.openers.
  // language: 'en' | 'es' — blank/unset renders NO override (the LLM already
  // responds naturally in whatever language the customer uses; forcing a
  // default here would be a behavior change for every existing tenant).
  // emoji_usage: 'none' | 'one_per_message' | 'frequent' — overrides the
  // boolean-driven default emoji line when set.
  greeting?: string
  language?: string
  emoji_usage?: string
  // sales
  value_props?: string[]
  usps?: string[]
  social_proof?: string
  guarantees?: string[]
  sales_approach?: string
  objection_handlers?: { trigger: string; response: string }[]
  // policies the agent needs to know, not guess (2026-07-30)
  cancellation_policy?: string
  reschedule_policy?: string
  refund_policy?: string
  late_payment_policy?: string
  first_time_restrictions?: string
  liability_statement?: string
  out_of_scope?: string[]
  // real FAQ (2026-07-30) — the tenant's own words, distinct from objection_handlers
  faqs?: { question: string; answer: string }[]
  // operations
  never_do?: string[]
  always_ask?: string[]
  team_intro?: string
  // escalation preferences (2026-07-30)
  escalation_triggers?: string[]
  escalation_contact?: string
  escalation_response_time?: string
  // lead qual
  qualifying_questions?: string[]
  disqualifiers?: string[]
  // upsell
  addons?: { label: string; price: string }[]
  upsell_triggers?: string[]
  never_upsell?: string[]
  recurring_incentive?: string
  referral_program_pitch?: string
  // operational context (2026-07-30) — team-capacity heads-up, NOT a substitute
  // for real availability tools (score_cleaners etc.); blank means no note, the
  // agent keeps using real tools rather than guessing at capacity.
  capacity_note?: string
  // Pre-existing 'brand' section onboarding fields, wired in 2026-07-30 (same
  // bug class as tone/greeting/language/emoji_usage above — collected, never
  // read). Rendered as extra business-context sections, same as
  // business_description/business_story.
  target_customer?: string
  competitors?: string[]
  differentiators?: string
  // custom
  custom_fields?: { category: string; label: string; value: string }[]
}

/** Short voice directive per tone option — prefixed onto voice.persona so an
 *  onboarding-selected tone actually steers the assembled prompt (previously
 *  write-only: selena_config.tone was saved but never read by the agent). */
const TONE_DIRECTIVES: Record<string, string> = {
  warm_friendly: 'Warm and friendly.',
  professional: 'Professional and polished.',
  casual: 'Casual and relaxed.',
  luxury: 'Refined, luxury-brand tone.',
}

/** Language directive per onboarding's 'en'/'es' select (LANGUAGE_OPTIONS in
 *  tenant-profile.ts). Unset/unrecognized -> no override (see Persona.language
 *  comment above). Mirrors the wording selena-legacy.ts already uses for its
 *  own (separate, admin-tool-only) engine, for consistency. */
const LANGUAGE_DIRECTIVES: Record<string, string> = {
  en: 'Respond in English, even if the customer writes in another language.',
  es: 'Respond in Spanish, even if the customer writes in English.',
}

/** Emoji directive per onboarding's emoji_usage select (EMOJI_OPTIONS in
 *  tenant-profile.ts). Unset -> keep the existing boolean-driven default in
 *  buildPlaybook (no behavior change for tenants who never set this). */
const EMOJI_DIRECTIVES: Record<string, string> = {
  none: 'No emojis, ever.',
  one_per_message: 'An emoji is okay once, sparingly, never on serious topics.',
  frequent: 'Emojis are welcome throughout when they fit the moment — use them naturally.',
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

  const baseOpeners = arr(p.opening_lines) ? (p.opening_lines as string[]) : cfg.voice.openers
  // greeting: the tenant's single preferred greeting (also used, separately,
  // as the raw first-contact SMS auto-reply via settings.chatbot_greeting) —
  // prepended so Yinez's OWN generated openers actually favor it too, instead
  // of only affecting the pre-AI cold-open text.
  const openers = nonEmpty(p.greeting) ? uniq([p.greeting!.trim(), ...baseOpeners]) : baseOpeners
  const bannedPhrases = arr(p.banned_phrases)
    ? uniq([...cfg.voice.banned_phrases, ...(p.banned_phrases as string[])])
    : cfg.voice.banned_phrases
  const questions = arr(p.qualifying_questions) ? (p.qualifying_questions as string[]) : cfg.intake.questions

  // Tone: prefixed onto the persona paragraph so an onboarding-selected tone
  // actually steers the voice instead of sitting unread in the DB.
  const toneDirective = nonEmpty(p.tone) ? TONE_DIRECTIVES[p.tone!.trim()] : undefined
  const persona = toneDirective ? `${toneDirective} ${cfg.voice.persona}` : cfg.voice.persona

  // Language / emoji: only override when explicitly set (see directive-map
  // comments above) — blank means zero behavior change from before this fix.
  const languageNote = nonEmpty(p.language) ? LANGUAGE_DIRECTIVES[p.language!.trim()] : cfg.language_note
  const emojiNote = nonEmpty(p.emoji_usage) ? EMOJI_DIRECTIVES[p.emoji_usage!.trim()] : cfg.emoji_note

  const policyAdds: string[] = []
  // Cancellation / reschedule / late-payment: each gets an explicit "not
  // provided" fallback when blank so Yinez defers to a human instead of
  // guessing or hallucinating a policy that was never given (verified via
  // resolve-base-prompt.test.ts blank-persona case).
  policyAdds.push(
    nonEmpty(p.cancellation_policy)
      ? `Cancellation: ${p.cancellation_policy!.trim()}`
      : 'Cancellation: no policy on file — do not invent one. Tell the customer you will confirm with the team and call request_callback.',
  )
  policyAdds.push(
    nonEmpty(p.reschedule_policy)
      ? `Rescheduling: ${p.reschedule_policy!.trim()}`
      : 'Rescheduling: no policy on file — do not invent one. Tell the customer you will confirm with the team and call request_callback.',
  )
  policyAdds.push(
    nonEmpty(p.late_payment_policy)
      ? `Late payment / overdue: ${p.late_payment_policy!.trim()}`
      : 'Late payment / overdue: no policy on file — do not invent a fee or deadline. Call request_callback if a customer pushes on this.',
  )
  if (nonEmpty(p.refund_policy)) policyAdds.push(`Refunds: ${p.refund_policy!.trim()}`)
  if (nonEmpty(p.first_time_restrictions)) policyAdds.push(`First-time customers: ${p.first_time_restrictions!.trim()}`)
  if (nonEmpty(p.liability_statement)) policyAdds.push(p.liability_statement!.trim())
  if (arr(p.out_of_scope)) for (const o of p.out_of_scope as string[]) if (nonEmpty(o)) policyAdds.push(`Out of scope: ${o.trim()}`)
  if (arr(p.never_do)) for (const n of p.never_do as string[]) if (nonEmpty(n)) policyAdds.push(`Never: ${n.trim()}`)
  if (arr(p.always_ask)) for (const a of p.always_ask as string[]) if (nonEmpty(a)) policyAdds.push(`Always ask: ${a.trim()}`)

  // Escalation preferences fold into escalation_extra, the same slot
  // buildPlaybook already renders in the "WHAT YOU ESCALATE" block — appended
  // after any industry-authored text rather than replacing it.
  const escalationAdds: string[] = []
  if (arr(p.escalation_triggers)) escalationAdds.push((p.escalation_triggers as string[]).filter(nonEmpty).join('. '))
  if (nonEmpty(p.escalation_contact)) escalationAdds.push(`Escalate to: ${p.escalation_contact!.trim()}.`)
  if (nonEmpty(p.escalation_response_time)) escalationAdds.push(`Promised response time: ${p.escalation_response_time!.trim()}.`)
  const escalationExtra = escalationAdds.length
    ? [cfg.escalation_extra, escalationAdds.join(' ')].filter(nonEmpty).join(' ')
    : cfg.escalation_extra

  return {
    ...cfg,
    voice: { ...cfg.voice, openers, banned_phrases: bannedPhrases, persona },
    intake: { ...cfg.intake, questions },
    policies: [...cfg.policies, ...policyAdds],
    escalation_extra: escalationExtra,
    capacity_note: nonEmpty(p.capacity_note) ? p.capacity_note!.trim() : cfg.capacity_note,
    language_note: languageNote,
    emoji_note: emojiNote,
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
  if (nonEmpty(p.target_customer)) section('WHO YOU TALK TO (target customer)', p.target_customer!.trim())
  if (nonEmpty(p.differentiators)) section('WHAT MAKES YOU DIFFERENT (in the owner\'s own words)', p.differentiators!.trim())
  if (arr(p.competitors)) section('COMPETITORS (know these — never badmouth; pivot to WHAT MAKES YOU DIFFERENT if asked to compare)', bullets(p.competitors))
  if (nonEmpty(p.team_intro)) section('THE TEAM', p.team_intro!.trim())
  if (arr(p.phrases_to_use)) section('PHRASES YOU USE (work these in naturally, don\'t force them)', bullets(p.phrases_to_use))
  if (arr(p.faqs)) {
    const fq = (p.faqs as { question: string; answer: string }[])
      .filter((f) => nonEmpty(f?.question) && nonEmpty(f?.answer))
      .map((f) => `- Q: "${f.question.trim()}" → A: ${f.answer.trim()}`)
      .join('\n')
    section('REAL FAQ (the tenant\'s own words — answer close to these, in your own voice)', fq)
  }
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
  if (arr(p.never_upsell)) section('WHAT TO NEVER PUSH', bullets(p.never_upsell))
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
