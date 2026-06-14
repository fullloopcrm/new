# Agent Abstraction Design — 2026-06-11

**Goal:** Make the Yinez agent tenant-generic so non-cleaning tenants (exterminator,
tow, salon, landscaping…) get a correct agent, WITHOUT changing nycmaid's behavior.

**Hard invariant:** nycmaid's assembled system prompt + agent behavior must stay
**byte-identical** after the refactor. "Don't touch nycmaid" = its output is proven
unchanged at every step (snapshot/diff harness).

**Scope:** `src/lib/yinez/{agent.ts (796), core.ts (2573), tools.ts (1329)}` = ~4,700 lines.
Multi-session.

---

## What's VARIABLE (→ per-tenant agent config) vs STRUCTURAL (shared, untouched)

### Variable (extract to config)
| Axis | nycmaid value (today) | exterminator value (target) |
|---|---|---|
| Agent identity | "You are Yinez. You run The NYC Maid." | TBD name / "The NYC Exterminator" |
| Persona / voice examples | cleaning-flavored warm | pest-flavored warm |
| Pricing model + copy | $79/$59/$99hr hourly, "never quote totals" | pest: per-treatment/quote-first (TBD) |
| Sizing questions | bedrooms/bathrooms, supplies policy | pest type / property type / severity |
| Payment methods | Zelle hi@thenycmaid.com, Venmo @thenycmaid, CashApp, card | TBD |
| Contact | (212) 202-8400, thenycmaid.com/portal | 212-202-8545, thenycexterminator.com/portal |
| Self-book offer | "$20 off self-book … /book/new" | TBD (or none — quote-first) |
| Booking model | hourly, pay 30min before completion | likely appointment/quote-first |
| Industry escalation | commercial sqft threshold → custom | pest equivalent (TBD) |

### Structural (shared, NOT changed)
Zero-hallucination rule · context-over-priors rule · owner-only tool gating ·
availability-tool discipline (`score_cleaners`) · escalation framework
(refund/damage/dispute/legal) · booking lifecycle · payment-math. Tool NAMES stay
(team_member already the DB term; `cleaner`-named tools are cosmetic, deferred).

---

## Where config lives
Reuse `tenants.selena_config` JSONB — it already exists and is currently `{}` on every
tenant. Populate it per tenant with an `AgentConfig` shape. No migration needed.

```
AgentConfig = {
  identity: { agent_name, business_name, run_statement },
  voice: { examples: string[], emoji: boolean },
  pricing: { model: 'hourly'|'flat'|'quote', copy: string, rates?: {...} },
  intake: { questions: string[] },          // sizing/qualifying questions
  payment: { methods: string[], timing: string },
  contact: { phone, portal_url, self_book?: {url, offer} },
  booking: { model: 'hourly'|'appointment'|'quote_first', supplies_policy?: string },
  escalation_extra?: string,                 // industry-specific triggers
}
```

## Refactor strategy (proves nycmaid invariance)
1. `buildBusinessProfile(cfg): string` renders the prompt's business section from config.
2. nycmaid's `AgentConfig` = today's verbatim values → `buildBusinessProfile(nycmaidCfg)`
   must equal the current hardcoded block **character-for-character**.
3. Final prompt = `STRUCTURAL_PROMPT + buildBusinessProfile(cfg)`.
4. core.ts: replace hardcoded literals (pricing line ~160/374/856, phone ~1968) with
   `cfg` lookups; assert nycmaid-rendered strings identical.

## Build order (each step verified before the next)
1. `AgentConfig` type + `nycmaidConfig` (extracted verbatim) + `exterminatorConfig` (draft).
2. `buildBusinessProfile()` + **snapshot test**: assert nycmaid render === current prompt block, char-for-char. ← the safety gate
3. Wire `agent.ts` to compose prompt from config. Diff nycmaid assembled prompt vs pre-refactor (must be identical).
4. Replace hardcoded literals in `core.ts` with cfg; re-run diff.
5. Populate `exterminatorConfig` with real pest pricing/model (needs Jeff's pest business rules).
6. Wire a web chat widget on the exterminator site → test pest answers live.

## Verification harness
A test that renders nycmaid's full system prompt from config and asserts it equals a
frozen snapshot of today's prompt. Runs at every step. If it ever differs → stop.
This is the mechanical guarantee that nycmaid is untouched.

## What I still need from Jeff (to finish exterminator config, step 5)
- Pest pricing model: per-treatment flat? inspection fee? quote-first (human follows up)?
- Payment methods + timing for the exterminator.
- Agent name/persona for the exterminator (keep "Yinez"? new name?).
- Booking model: real online appointments, or quote-first lead → human?
