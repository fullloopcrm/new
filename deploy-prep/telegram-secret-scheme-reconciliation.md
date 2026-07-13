# Telegram webhook secret scheme — reconciling 4 docs that disagree (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** read-only reconciliation of this worktree's own prior specs. No code changed, nothing applied.

**Why this exists:** while writing `telegram-jefe-webhook-auth-guard-spec.md` (2026-07-13, this branch) I
claimed the Jefe route "was missed by every prior audit pass" and proposed a shared secret across all 3
telegram routes. Both claims need correcting — re-reading `webhook-hardening-plan.md` (authored earlier
the same day) shows the Jefe route **was** already specced there, with a **different** secret model than
what I proposed. That is a real, self-authored contradiction, not a hypothetical — flagging and resolving
it here rather than leaving two live FOR-JEFF-REVIEW docs disagreeing on which env var(s) to provision.

---

## The 4 docs and what each proposes

| Doc | Route(s) | Secret var proposed |
|---|---|---|
| `webhook-auth-throttle-guard-spec.md` (Finding 2) | owner (`telegram/route.ts`) | `TELEGRAM_WEBHOOK_SECRET` |
| `telegram-tenant-webhook-auth-guard-spec.md` | tenant (`telegram/[tenant]/route.ts`) | **Reuses** `TELEGRAM_WEBHOOK_SECRET` (same platform-wide value as owner's) — explicit design choice, with a per-tenant `tenants.telegram_webhook_secret` column offered only as *optional* extra hardening |
| `webhook-hardening-plan.md` §2 (per-route table) | all 3 | owner=`TELEGRAM_WEBHOOK_SECRET`, **jefe=`TELEGRAM_JEFE_WEBHOOK_SECRET`** (distinct), tenant=column **or** `TELEGRAM_TENANT_WEBHOOK_SECRET` (distinct) |
| `telegram-jefe-webhook-auth-guard-spec.md` (this branch, same day) | jefe | **Reuses** `TELEGRAM_WEBHOOK_SECRET` ("one secret covers all three routes... one fewer credential to provision/rotate") |

**The disagreement:** 3 of 4 docs (owner spec, tenant spec, jefe spec) converge on **one shared
`TELEGRAM_WEBHOOK_SECRET`** across all three routes. `webhook-hardening-plan.md` §2's table — written
*before* the tenant and jefe specs fully worked out their own reasoning — proposes **3 distinct secrets**
(`TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_JEFE_WEBHOOK_SECRET`, `TELEGRAM_TENANT_WEBHOOK_SECRET`/column).
Also downstream: `env-var-inventory.md`'s only `TELEGRAM_WEBHOOK_SECRET` row cites the **tenant** spec as
its source, not the owner or jefe routes — meaning as written today, none of the 4 docs consistently
inventories what actually needs provisioning.

## Which model is correct — security reasoning, not just doc-counting

The tenant spec (`telegram-tenant-webhook-auth-guard-spec.md:105`) already states the reasoning correctly:
*"the secret_token authenticates 'this update came from a webhook WE registered with Telegram' — source
authentication, not tenant identity."* That's the right threat model. Telegram's `secret_token` exists to
prove the POST came from Telegram's own delivery infrastructure to *an endpoint the platform itself
registered* — it is not a per-actor credential the way a tenant's bot token or a user's session is. The
actual authorization boundary for *which* chat/tenant/action is allowed is a separate, already-existing
layer on top (the `chat_id` allowlist for owner/jefe, the tenant-scoped bot token + slug for the tenant
route). Sharing one `secret_token` across routes registered by the same platform does not weaken that
boundary, the same way reusing one webhook-signing secret across routes from a single provider account
would not weaken per-resource authorization checked after signature verification.

**Recommendation: standardize on the shared-secret model** (owner spec + tenant spec + jefe spec — 3 of 4
docs, and the one with the explicit security reasoning already written down). `webhook-hardening-plan.md`
§2's per-route table is the odd one out and should be corrected to match, not the other way around —
correcting the newer/fewer docs to match an older table that never re-derived the reasoning would throw
away the reasoning, not just the naming.

## What needs to change, concretely (not applied — routing to the leader for whoever consolidates)

1. **`webhook-hardening-plan.md` §2 per-route table** — change the `telegram/jefe/route.ts` row's env var
   from `TELEGRAM_JEFE_WEBHOOK_SECRET` to `TELEGRAM_WEBHOOK_SECRET` (matches `telegram-jefe-webhook-auth-guard-spec.md`,
   already-applied convention). Change the tenant row's "or `TELEGRAM_TENANT_WEBHOOK_SECRET`" fallback
   option to read "or `TELEGRAM_WEBHOOK_SECRET` (see tenant spec's reasoning for why platform-wide is
   sufficient)" instead of implying a fourth distinct var.
2. **`env-var-inventory.md`** — the existing `TELEGRAM_WEBHOOK_SECRET` row currently cites only the tenant
   spec as its consumer. Update its description to note it is shared by **all three** telegram routes
   (owner, tenant, jefe) once each of the three specs ships, so a reader doesn't provision it thinking
   it's tenant-only and then hit two more not-inventoried var names when jefe/owner specs land.
3. **No doc needs to *add* a new secret.** This reconciliation reduces the total distinct Telegram secrets
   from a stated-but-inconsistent "up to 4" (owner/jefe/tenant-env/tenant-column) down to **1 required**
   (`TELEGRAM_WEBHOOK_SECRET`) **+ 1 optional** (the tenant-only column, for anyone who later wants
   per-tenant secret isolation — still explicitly optional, not required to ship any of the 3 specs).

## What this does not change

- None of the 3 specs' actual code diffs need to change — all three already read
  `process.env.TELEGRAM_WEBHOOK_SECRET` (the owner and jefe specs verbatim; the tenant spec via its
  primary/non-optional path). The only things wrong were the **hardening-plan table** and the
  **env-var-inventory description**, both docs, not code.
- The rollout ordering each spec already states (provision secret → re-register each bot with
  `secret_token` → ship the fail-closed check) is unchanged and, if anything, simpler now: one secret to
  provision once, reused for three `setWebhook` calls instead of three secrets to generate and track
  separately.

**Not applied. No route file, no env var, no migration touched by this doc.**
