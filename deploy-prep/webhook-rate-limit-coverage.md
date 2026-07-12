# Webhook Rate-Limit Coverage — the surface the main rate-limit audit excluded

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Docs only — no code changed.**

> **Why this file exists.** `deploy-prep/rate-limit-coverage-audit.md` deliberately scoped out the
> webhook surface ("cron routes behind `CRON_SECRET`… admin routes sit behind session auth"). But
> inbound webhooks are the app's **largest unauthenticated, state-changing, public** surface, and
> **none of the 9 has any rate limiting.** This file covers only that gap. It does **not** re-litigate
> signature verification — that's fully done in `deploy-prep/webhook-idempotency-audit.md`; it's
> referenced here only where it changes the *effective* throttle.

**Method:** grep every `webhooks/**/route.ts` for a limiter call (`rateLimit` / `rateLimitDb`) — **0
hits across all 9 handlers** — then cross-read each route's cost profile (what expensive work a single
POST triggers). The signature-verify column is carried verbatim from the idempotency audit.

---

## The core fact

**A rate limiter throttles by *count*. A signature check throttles by *rejecting forgeries*.** For a
webhook, the two combine: a **fail-closed** signature check is itself an effective rate limit against
outsiders (a forged flood is dropped at `constructEvent`). So the true rate-limit exposure is the set
of webhooks where the signature gate is **absent or fail-open** — there, anyone can drive the
handler's expensive work as fast as they can POST, with nothing to stop them.

| Route | Sig gate (from idempotency audit) | Own rate limit? | Expensive work per request | Effective throttle |
|---|---|---|---|---|
| `webhooks/stripe` | ✅ fail-closed | ❌ none | DB writes | 🟢 sig gate throttles outsiders |
| `webhooks/stripe-platform` | ✅ fail-closed | ❌ none | tenant provisioning | 🟢 sig gate |
| `webhooks/resend` | ✅ fail-closed* | ❌ none | DB writes | 🟢 sig gate (*unless `RESEND_WEBHOOK_VERIFY=off`) |
| `webhooks/clerk` | ✅ fail-closed* | ❌ none | user/tenant sync | 🟢 sig gate |
| `webhooks/telnyx` (SMS) | ✅ fail-closed* | ❌ none | **re-runs the AI agent (Anthropic $) + sends SMS** | 🟠 sig gate, but see #2 |
| `webhooks/telnyx-voice` | ❌ **fail-open** (no crypto verify) | ❌ none | Telnyx call-control actions + missed-call SMS | 🔴 **#1 — none** |
| `webhooks/telegram` (owner) | ❌ **none** (body chat-id only) | ❌ none | **runs the Selena agent (Anthropic $) + Telegram send** | 🔴 **#1 — none** |
| `webhooks/telegram/[tenant]` | ❌ **none** (registered chat-id only) | ❌ none | **runs the tenant agent (Anthropic $) + send** | 🔴 **#1 — none** |
| `webhooks/telegram/jefe` | ❌ **none** (chat-id allowlist only) | ❌ none | runs the GM agent + send | 🔴 **#1 — none** |

`*` = fail-closed by default but bypassed by the per-provider `<PROVIDER>_WEBHOOK_VERIFY=off`
kill-switch (idempotency audit finding #4).

---

## TOP FINDINGS (ranked by cost-of-abuse)

### 🔴 #1 — The Telegram + Telnyx-Voice webhooks are unauthenticated *and* unthrottled *and* invoke paid LLM/telephony work

The four routes with no real signature gate (`telegram`, `telegram/[tenant]`, `telegram/jefe`,
`telnyx-voice`) are the whole ballgame. A single forged POST to a Telegram route that clears the
body-`chat_id` allowlist runs the **Selena/Yinez agent** — an Anthropic tool-loop that also reads and
writes the DB. With **no rate limit**, that is a direct **cost-amplification / financial-DoS** primitive:
each request burns Anthropic tokens (and Telegram/Telnyx API calls) on the tenant's or platform's key.

The chat-id "gate" is not a throttle and barely an auth check — the value is handed out unauthenticated
by `GET /api/webhooks/telegram` (`owner_chat_id`) and the auth gap is codified in
`platform/src/app/api/webhooks/telegram-auth-bypass.witness.test.ts`. `telnyx-voice` fails fully open
when `TELNYX_PUBLIC_KEY` is unset (`telnyx-voice-failopen.witness.test.ts`).

**Sequence:** the two signature fixes in `deploy-prep/webhook-hardening-plan.md` (§1 telnyx-voice
Ed25519, §2 telegram secret-token) close most of this — a fail-closed gate throttles the outsider
flood. Adding a modest IP/chat-keyed `rateLimitDb` on top is belt-and-suspenders against an
*authorized-but-abusive* sender (e.g. a leaked secret token). Fix the signature first; the limiter is
secondary here.

### 🟠 #2 — `telnyx` SMS webhook: fail-closed today, but the kill-switch removes the only throttle

`webhooks/telnyx` verifies Ed25519 (fail-closed), so outsiders can't flood it — **but** it has no rate
limit of its own, so the moment `TELNYX_WEBHOOK_VERIFY=off` is set (finding #4 in the idempotency
audit), it becomes an unauthenticated, unthrottled endpoint that **re-runs the AI agent per inbound
`message.received`**. The kill-switch is the single point of failure. Recommend: (a) treat the
kill-switch as break-glass only, and (b) add an IP + from-number `rateLimitDb` bucket so "verify off"
doesn't also mean "throttle off".

### 🟢 #3 — Stripe / Stripe-platform / Resend / Clerk are adequately throttled by their fail-closed signatures

No rate limiter, but the Svix/Stripe fail-closed gate rejects forgeries, so the outsider-flood vector is
closed. Residual risk is **replay of a captured valid event**, which is an *idempotency* concern
(covered in `webhook-idempotency-audit.md`), not a rate-limit one. No action needed for rate limiting.

---

## Recommendation

1. Land `webhook-hardening-plan.md` §1 (telnyx-voice) and §2 (telegram secret-token) — this converts
   the 🔴 #1 routes from "no gate" to "fail-closed", which is the primary throttle.
2. Add a small `rateLimitDb` bucket to the LLM-invoking webhooks (`telnyx`, `telegram*`) keyed by
   IP + sender, as defense-in-depth against an authorized-but-abusive sender and the `VERIFY=off`
   window. Suggested: `rateLimitDb(`wh-<provider>:${ip}`, 60, 60_000)` — generous, just a ceiling.
3. Leave Stripe/Resend/Clerk as-is for rate limiting; their fail-closed signatures are the gate.

**Cross-refs:** `rate-limit-coverage-audit.md` (non-webhook surface), `webhook-idempotency-audit.md`
(signature + replay), `webhook-hardening-plan.md` (ready-to-apply sig fixes),
`secrets-in-logs-audit.md` (the telegram GET `owner_chat_id` disclosure).
