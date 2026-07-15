# ADR 0001 — SELENA engine cutover: keep the legacy/new split until configs are authored and F2/F3 are fixed

- **Status:** Proposed (recommendation: defer cutover)
- **Date:** 2026-07-11
- **Decision driver:** Q4 planning — do we move non-nycmaid tenants off `selena-legacy` onto the new SELENA persona pipeline now, or keep the split?
- **Deciders:** Jeff (owner), platform leader
- **Author:** W3 (reconcile-gate lane), file-only

---

## Context

We run **two** conversational-agent engines side by side:

- **Legacy engine** — `platform/src/lib/selena-legacy.ts` (deterministic intent router + checklist).
- **New SELENA persona pipeline** — `platform/src/lib/selena/` (base engine + per-tenant persona layer: `agent.ts`, `agent-config.ts`, `agent-config-loader.ts`, `prompt-assembler.ts`, `persona-file.ts`, `tenants/`).

**Which engine a live customer actually hits is gated on `isNycMaid(tenantId)`.** On the two channels customers really use — the website chat widget (`platform/src/app/api/chat/route.ts:86`) and inbound SMS (`platform/src/app/api/webhooks/telnyx/route.ts:374`) — the code short-circuits to the new pipeline **only for nycmaid**. Every other tenant falls through to `askSelena` from `selena-legacy`.

The new persona/playbook can currently reach a non-nycmaid tenant only through `/api/yinez`, and **no live widget calls that endpoint** (W1 routing audit, LEADER-CHANNEL 2026-07-11 13:44). So today:

- **nycmaid** = new SELENA pipeline, fully authored, byte-identical invariant guarded (`assertNycmaidInvariant`).
- **all other tenants** = legacy engine. The new persona pipeline is effectively **dark** for them.

On top of the routing gate, the per-tenant config that the new pipeline reads is largely unpopulated. **15 of 22 active tenants have an empty `selena_config`.** (Design note `platform/AGENT-ABSTRACTION-DESIGN-2026-06-11.md:39` records `selena_config` as `{}` on every tenant at authoring time; the 15/22 figure is the current leader-supplied count. It has **not** been re-verified against prod in this worktree — DB reads are out of scope for this lane, so treat the exact count as needs-DB-confirm, not the direction of the finding, which is confirmed by code + design docs.)

Net: flipping non-nycmaid tenants onto the new pipeline today would route real customers to an engine that (a) has no authored persona/pricing for most of them and (b) has two known latent defects on the new path.

## The two latent bugs that block a safe cutover

Both were found by the W1 routing/persona audit (LEADER-CHANNEL 2026-07-11 13:44) and are **present on this branch (`p1-w3`) right now**:

- **F2 (HIGH) — dead exterminator config.** `exterminatorAgentConfig` is authored in `platform/src/lib/selena/agent-config.ts:75` but has **zero importers** on `p1-w3` (verified: `grep -rn exterminatorAgentConfig platform/src` returns only the definition; `platform/src/lib/selena/tenants/` contains only `nycmaid.ts`). On the new-agent path the exterminator tenant therefore resolves to the **generic default persona**, not its authored one. Any tenant whose config is "authored but never wired" has the same failure mode.

- **F3 (MED) — dropped price numbers.** The derived-prompt pipeline drops the tenant's actual dollar rates: `ServiceType.rate` is queried but not carried into the assembled prompt (mapping in `settings.ts`). A **booking** tenant moved onto the new agent therefore **cannot quote a price** — the numbers never reach the model. (Note: a `quote_only` tenant like the exterminator never quotes by design, so F3 bites booking/flat tenants specifically.)

**Fix state — important nuance, not yet safe to rely on:** W1 authored fixes for both as commit **`2c4d854`** (`feat(P1/selena): wire exterminator persona + fix F3 price-drop`). That commit exists on `p1-w1`, `p1-final-integration(-clean)`, and `p1-integration-verify` — **but not on `p1-w3`, not on `origin/main`, and not deployed** (W1 GO/NO-GO v2, LEADER-CHANNEL 2026-07-11 17:12: wave-2 fixes are "code-real but NOT in the integration branch, NOT on origin/main, NOT deployed"). So for cutover purposes F2/F3 must be treated as **open until integrated to the deploy branch and shipped**, even though the code exists.

## Options considered

### Option A — Keep the split (legacy for non-nycmaid, new pipeline for nycmaid)

- **Pros:** Non-nycmaid customers keep a working deterministic engine. No customer is exposed to empty configs or F2/F3. Zero cutover risk. nycmaid keeps its byte-identical guarantee.
- **Cons:** The new persona/learning-machine work delivers no value to 21/22 tenants. Two engines to maintain. Legacy is the *real* customer engine, so persona improvements don't reach paying non-nycmaid tenants.

### Option B — Cut over now (flip non-nycmaid to the new pipeline)

- **Pros:** One engine. Persona pipeline + learning machine reach every tenant. Retires `selena-legacy`.
- **Cons:** **Ships known breakage to real customers.** 15/22 tenants would run on an empty `selena_config` → generic, wrong persona and no business facts. F2 → exterminator (and any unwired tenant) gets the generic default. F3 → booking tenants can't quote prices. The fixes for F2/F3 aren't on the deploy branch yet. This is a customer-facing regression on the highest-risk parity surface (the agent).

## Decision

**Recommend Option A — keep the split — until BOTH preconditions are met:**

1. **Configs authored.** The empty `selena_config` tenants (the ~15/22) have real persona + services + pricing + hours authored and test-verified (web chat **and** SMS return correct answers), per the launch-plan agent gate (`platform/TENANT-LAUNCH-PLAN-2026-06-11.md:44`).
2. **F2 and F3 fixed on the deploy path.** Commit `2c4d854` (or an equivalent) is integrated into the branch that actually ships and is deployed — not merely present on `p1-w1`. Regression proof: an unwired tenant resolves to its authored persona (F2), and a booking tenant's real per-service rates appear in the assembled prompt (F3).

When both hold, cut over **one tenant at a time, exterminator first, nycmaid untouched**, with global code never overwriting per-tenant data (per Jeff's migration directive, LEADER-CHANNEL 2026-07-11 14:59). Each tenant flip is a small, reversible change validated on both channels before the next.

## Consequences

**If we keep the split (recommended):**
- Non-nycmaid customers stay on the proven legacy engine — no regression risk.
- The persona pipeline stays dark for 21/22 tenants until their configs exist; that work is now explicitly gated, not silently shipped.
- We carry two engines and the `isNycMaid` gate until per-tenant cutover completes. This is deliberate technical debt with a defined exit (per-tenant flips), not indefinite.
- `assertNycmaidInvariant` continues to protect nycmaid from spillover during migration.

**If we cut over prematurely (rejected):**
- Real customers on 15/22 tenants get a generic agent with no business facts.
- Exterminator (F2) and booking tenants (F3) get wrong behavior — no persona, no price quotes — on the channels customers actually use.
- High blast radius on the riskiest parity surface, and the fixes aren't on the deploy branch yet, so a rollback to legacy would be the likely outcome anyway.

**Follow-ups this ADR depends on (tracked elsewhere, not resolved here):**
- Integrate `2c4d854` (F2/F3) into the deploy branch; confirm deployed.
- Author + test `selena_config` for the empty tenants.
- Define the per-tenant cutover order and per-flip regression checklist (exterminator first).
