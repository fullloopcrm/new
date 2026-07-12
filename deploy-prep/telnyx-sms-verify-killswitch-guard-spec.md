# Telnyx SMS webhook — `VERIFY=off` kill-switch guard SPEC (P2, FOR-JEFF-REVIEW)

**Status:** SPEC / ready-to-apply. **NOT APPLIED.** No route file is modified by
this doc. It hands the leader a precise, minimal patch to apply after Jeff approves.

**Author:** W6, branch `p1-w6`, 2026-07-12.
**Ranked:** P2 in `deploy-prep/webhook-rate-limit-coverage.md` (finding #2).

---

## The gap (exact code)

`platform/src/app/api/webhooks/telnyx/route.ts:18`

```ts
// Signature verification (skip only when explicitly disabled for local dev).
if (process.env.TELNYX_WEBHOOK_VERIFY !== 'off') {
  const result = verifyTelnyx(request.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
  if (!result.valid) {
    console.warn('[telnyx webhook] rejected:', result.reason)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
}
```

Two facts, together, make this a real cost/abuse exposure:

1. **The route is fail-closed today — but only because of the signature check.**
   `verifyTelnyx` correctly returns `{valid:false}` when the key is unset
   (`webhook-verify.ts:82`), so unlike `telnyx-voice` this route does **not**
   fail-open on a missing key. Good.
2. **There is no rate limit anywhere on this route.** The signature check is the
   *only* throttle. The instant `TELNYX_WEBHOOK_VERIFY=off` is set — for local dev,
   a break-glass moment, or by misconfiguration — the endpoint becomes
   **unauthenticated *and* unthrottled**, and the `message.received` branch
   (`route.ts:98`) **re-runs the Anthropic AI agent (`askSelena`/`askYinez`) and
   sends outbound SMS per request.** An attacker who discovers the `off` window can
   drive unbounded Anthropic + Telnyx spend by POSTing forged `message.received`
   events.

**The kill-switch is a single point of failure: "verify off" also means
"throttle off."**

## What is already covered elsewhere (do not duplicate)

`deploy-prep/webhook-hardening-plan.md` §"Cross-cutting kill-switch" (P3) proposes
making `off` inert in production:
`process.env.X_WEBHOOK_VERIFY === 'off' && process.env.NODE_ENV !== 'production'`.
That closes the *silent-prod-misconfig* angle but (a) removes the operational
break-glass escape hatch entirely, and (b) does **nothing** for the case where the
switch is legitimately flipped. This SPEC is the complementary defense the hardening
plan does not provide: **a throttle that runs regardless of verify state**, plus a
*non-silent* treatment of the switch that keeps break-glass usable.

---

## Fix — two additive parts, no new deps, no schema change

### Part 1 (must-do): a rate-limit ceiling that runs regardless of verify state

Add a `rateLimitDb` ceiling on the **expensive inbound path only**
(`message.received`), keyed by sender number with an outer per-IP bound. It runs
whether or not the signature was checked, so the `off` window is capped.

- Reuses the existing `rateLimitDb` helper (`@/lib/rate-limit-db`) — already used by
  `client/send-code`, `portal/collect`, etc. It **fail-opens on DB error**
  (`rate-limit-db.ts:28`), so it can never lock out legitimate SMS.
- **Scope it to `message.received` only.** Delivery-status events
  (`message.sent`/`delivered`/`failed`, `route.ts:41`) are cheap DB updates and
  arrive at high, legitimate volume during campaigns — rate-limiting those would
  break real traffic. The expensive, abusable path is `message.received`.
- Limits are generous ceilings, not conversational limits: a real human texting a
  business stays far under 10/min; a flood is capped.

**Insertion point:** in the `message.received` branch, immediately after the
`if (!from || !to || !text)` guard (`route.ts:104`), before the tenant lookup and
agent invocation:

```ts
  if (eventType === 'message.received') {
    const payload = event.payload
    const from = payload?.from?.phone_number
    const to = payload?.to?.[0]?.phone_number
    const text = payload?.text

    if (!from || !to || !text) {
      return NextResponse.json({ received: true })
    }

    // --- guard (P2): cap the expensive AI-agent path regardless of verify state,
    // so the TELNYX_WEBHOOK_VERIFY=off window is never also a "throttle off" window.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const fromDigits = String(from).replace(/\D/g, '')
    const [sender, source] = await Promise.all([
      rateLimitDb(`wh-telnyx-sms:${fromDigits}`, 10, 60_000),   // per-sender: 10/min
      rateLimitDb(`wh-telnyx-sms-ip:${ip}`, 60, 60_000),        // per-IP outer bound: 60/min
    ])
    if (!sender.allowed || !source.allowed) {
      console.warn(`[telnyx webhook] rate-limited inbound from=${fromDigits} ip=${ip}`)
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
    // --- end guard
```

Add the import at the top of the file:

```ts
import { rateLimitDb } from '@/lib/rate-limit-db'
```

(Telnyx retries on non-2xx, so a 429 here just defers a genuinely-throttled event;
under normal verified traffic the limit is never hit because forgeries are rejected
upstream at `route.ts:20`.)

### Part 2 (recommended): make the kill-switch loud, not silent

Do **not** fully disable `off` in prod (that removes break-glass — e.g. if Telnyx
rotates the signing key and verification breaks while SMS must keep flowing).
Instead, keep it usable but **impossible to leave on silently**: log an error on
every request whose verification was skipped in production.

Replace `route.ts:18`:

```ts
  // Signature verification. `off` is a break-glass switch for local dev / incidents.
  // In production it is honored but SHOUTED so it can never be left on unnoticed;
  // the Part-1 rate limit is the safety net while it is off.
  const verifyOff = process.env.TELNYX_WEBHOOK_VERIFY === 'off'
  if (verifyOff && process.env.NODE_ENV === 'production') {
    console.error('[telnyx webhook] SIGNATURE VERIFICATION DISABLED IN PRODUCTION (break-glass). Unset TELNYX_WEBHOOK_VERIFY to restore.')
  }
  if (!verifyOff) {
    const result = verifyTelnyx(request.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
    if (!result.valid) {
      console.warn('[telnyx webhook] rejected:', result.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }
```

> If Jeff prefers the hardening-plan P3 stance (no break-glass in prod at all),
> swap the second block's condition to `if (!verifyOff || process.env.NODE_ENV === 'production')`
> so verification is unconditional in prod. Part 1 is unaffected either way — it is
> the part that actually caps the spend. **Part 1 is the must-do; Part 2 is the
> policy choice.**

---

## Why this is the right shape

- **Part 1 is unconditional** — it does not depend on the verify state, `NODE_ENV`,
  or any operator discipline. Even a forgotten `off` in prod is now bounded to
  ≤10 agent invocations/min/sender and ≤60/min/IP instead of unbounded.
- It targets **only** the paid path (`message.received` → Anthropic + Telnyx),
  leaving high-volume delivery receipts untouched.
- It reuses infrastructure already in the tree (`rateLimitDb`, `rate_limit_events`
  table from migration 014) — **no new secret, no new table, no new dependency.**

## Verification plan (for whoever applies it)

Nothing is applied here, so `tsc` is **N/A for this doc** (no code changed). After
the leader applies the patch on a real branch:

1. `cd platform && npx tsc --noEmit` — clean (the snippet uses only existing
   helper signatures: `rateLimitDb(key, max, windowMs) → {allowed, remaining}`).
2. Unit/route test (add alongside `telnyx-sms-idempotency.witness.test.ts`):
   - POST 11 forged `message.received` from one number with `TELNYX_WEBHOOK_VERIFY=off`
     → first 10 proceed to tenant lookup, 11th returns **429**. Asserts the agent
     is **not** invoked on the throttled request.
   - POST a `message.delivered` status event 100× → **never** 429 (delivery path is
     not rate-limited).
   - With verify **on** and a valid signature, a normal single inbound → 200, agent
     runs (limit not hit).
3. Confirm `rate_limit_events` rows appear with `bucket_key` `wh-telnyx-sms:*`.

## Rollout / break-glass runbook

- Ship anytime — additive, no migration ordering constraint (the
  `rate_limit_events` table already exists, migration 014).
- `TELNYX_WEBHOOK_VERIFY=off` remains an **incident-only, time-boxed** switch. With
  Part 2 it now logs an error on every prod request while off. **Standing rule:
  unset it the moment the incident is resolved.** The Part-1 rate limit is the net
  that makes leaving it on survivable, not a reason to leave it on.

**Cross-refs:** `webhook-rate-limit-coverage.md` (#2, the P2 ranking this implements),
`webhook-hardening-plan.md` (P3 prod-inert kill-switch — the alternative Part-2
stance), `webhook-idempotency-audit.md` (finding #4, the `*_WEBHOOK_VERIFY=off`
family), `webhook-auth-throttle-guard-spec.md` (the P1 telnyx-*voice*/telegram
sibling — distinct route, distinct fail-open bug).
