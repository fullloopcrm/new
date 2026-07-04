// Per-tenant system-prompt assembler.
//
// Today `agent.ts` ships the entire nyc-maid `YINEZ_PROMPT` to every tenant and
// prepends a "pretend you're {tenant}" note (the brandOverride hack). That's why
// a dumpster tenant's agent still reads as an "older Latina tía running a
// cleaning service." This module replaces that with: ONE shared discipline
// preamble (generic to any agent) + a PER-TENANT PLAYBOOK (voice, pricing,
// flow, examples). nyc-maid is just one playbook.
//
// SAFETY: the split is done by SLICING the live YINEZ_PROMPT — no re-typing — so
// SHARED_PREAMBLE + NYCMAID_PLAYBOOK is byte-identical to YINEZ_PROMPT by
// construction. assertNycmaidInvariant() proves it and throws if it ever drifts.
// Nothing here is wired into agent.ts yet; wiring happens only after the
// invariance holds and neutral playbooks exist for non-cleaning tenants.

import { YINEZ_PROMPT } from './agent'

// The personality section begins here — everything above is generic agent
// discipline (hard rules, zero-hallucination, tool gating, availability,
// zero-fake-save) that every tenant should keep verbatim.
const PLAYBOOK_MARKER = 'You are Yinez. You run The NYC Maid'

const splitIdx = YINEZ_PROMPT.indexOf(PLAYBOOK_MARKER)

/** Generic agent discipline — shared by every tenant, verbatim. */
export const SHARED_PREAMBLE: string =
  splitIdx >= 0 ? YINEZ_PROMPT.slice(0, splitIdx) : YINEZ_PROMPT

/**
 * nyc-maid's playbook: the voice, pricing, policies, booking flow, and examples
 * that are specific to The NYC Maid. Derived by slice, so it is exactly the
 * back half of the current prompt — no transcription drift.
 */
export const NYCMAID_PLAYBOOK: string =
  splitIdx >= 0 ? YINEZ_PROMPT.slice(splitIdx) : ''

/** Assemble a full system prompt: shared discipline + this tenant's playbook. */
export function assembleSystemPrompt(playbook: string): string {
  return SHARED_PREAMBLE + playbook
}

/**
 * Char-for-char invariance: assembling nyc-maid's playbook must reproduce the
 * exact prompt the live agent ships today. Any drift throws — this is the guard
 * that lets us wire agent.ts without risking the live agent.
 */
export function assertNycmaidInvariant(): { ok: true } {
  const rebuilt = assembleSystemPrompt(NYCMAID_PLAYBOOK)
  if (rebuilt !== YINEZ_PROMPT) {
    throw new Error(
      `[prompt-assembler] nyc-maid invariance FAILED: assembled prompt (${rebuilt.length} chars) ` +
        `!= YINEZ_PROMPT (${YINEZ_PROMPT.length} chars). Refusing to wire.`,
    )
  }
  return { ok: true }
}
