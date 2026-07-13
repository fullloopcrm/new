# Guard Spec — Jefe (platform GM) Telegram webhook auth + throttle

**Status:** SPEC — **NOT applied.** Ready-to-apply diff below; no code changed by authoring this. The
leader applies after Jeff approves. **Hard prerequisite:** `TELEGRAM_WEBHOOK_SECRET` must be provisioned
AND the Jefe bot's webhook re-registered with that `secret_token` (Rollout §) *before* the verify ships,
or Jefe traffic 401s (fail-closed).

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13 · **Docs only — no code changed.**

**Distinct from, and a gap NOT covered by, either existing telegram guard spec:**
- `webhook-auth-throttle-guard-spec.md` Finding 2 covers the **owner** bot (`webhooks/telegram/route.ts`).
- `telegram-tenant-webhook-auth-guard-spec.md` covers the **per-tenant** bot (`webhooks/telegram/[tenant]/route.ts`).
- **Neither mentions `webhooks/telegram/jefe/route.ts`** — the third telegram route, and per its own file
  comment, the **most sensitive one**: "the PLATFORM GM bot (Jeff <-> Jefe)... runs `askJefe` (platform
  brain) over Full Loop's whole health." `webhook-rate-limit-coverage.md`'s route table (2026-07-12) also
  only lists 9 handlers and does not include this route by name — it was missed by every prior audit pass,
  not intentionally scoped out.

---

## The gap (verified in source this session, `platform/src/app/api/webhooks/telegram/jefe/route.ts`)

```ts
const BOT_TOKEN = (process.env.JEFE_BOT_TOKEN || '').trim()
const OWNER_CHAT_ID = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()

export async function POST(req: Request) {
  // ... parse body, dedupe on update_id ...
  if (OWNER_CHAT_ID && String(chatId) !== String(OWNER_CHAT_ID)) {
    await sendTelegram(chatId, 'This bot is private.', BOT_TOKEN)
    return NextResponse.json({ ok: true, private: true })
  }
  // ... askJefe(text, history) — full platform-brain LLM call, no further gate ...
```

Three problems, worse in combination than any one alone:

1. **Zero request-source authentication.** No `secret_token` header check (grep `secret.token`/
   `x-telegram` in this route: none) — same shape as the two already-flagged routes, but this route was
   never named in either existing spec, so it is not covered by applying those two fixes.
2. **The chat-id allowlist falls back to a value that is disclosed elsewhere.**
   `JEFE_OWNER_CHAT_ID || TELEGRAM_OWNER_CHAT_ID` — the route's own comment states *"Jeff's chat id is the
   same across bots."* `GET /api/webhooks/telegram` (the owner route) returns that exact `owner_chat_id`
   value, unauthenticated, in its JSON response body (`secrets-in-logs-audit.md`, "Adjacent" section).
   That means the one value gating access to the **platform GM bot** is very likely obtainable from a
   sibling route's unauthenticated diagnostic endpoint — the allowlist isn't just weak, it may already be
   an open door, compounding two independently-known gaps into one worse one that neither source doc
   connected.
3. **No throttle at all.** Unlike the owner/tenant routes (which at least send an outbound "This bot is
   private" reply on reject — itself an unthrottled Bot-API call), a forged POST that clears the chat-id
   check here runs `askJefe`: a full Anthropic tool-loop with **platform-wide** context ("Full Loop's
   whole health"), not a single tenant's. This is the same financial-DoS shape `webhook-auth-throttle-guard-spec.md`
   ranked P1 for the owner/voice routes, on a route with a broader blast radius and zero existing mitigation.

**No existing in-repo caller registers this webhook.** Unlike the tenant route
(`registerTelegramWebhook`, called from `admin/businesses/[id]/route.ts:349`), a repo-wide grep for
`JEFE_BOT_TOKEN` alongside `setWebhook`/`registerTelegramWebhook` finds no call site — the Jefe bot's
webhook appears to be registered manually/out-of-band (Telegram Bot API directly, or by Jeff). That
changes Part 2 of the fix below from a code diff into a runbook step.

---

## Fix — three parts, same shape as the two sibling specs

### Part 1 (must-do) — authenticate the request came from Telegram (fail-closed)

Reuses the same `TELEGRAM_WEBHOOK_SECRET` value the other two specs introduce — the secret_token is a
shared string Telegram echoes back per-registration, not bound to a specific bot token, so one secret
covers all three routes (one fewer credential to provision/rotate).

```ts
// webhooks/telegram/jefe/route.ts — add imports
import { timingSafeEqual } from 'node:crypto'
import { rateLimitDb } from '@/lib/rate-limit-db'

const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()

function secretOk(req: Request): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) return false            // fail-closed: unset = reject
  const got = (req.headers.get('x-telegram-bot-api-secret-token') || '').trim()
  const a = Buffer.from(got)
  const b = Buffer.from(TELEGRAM_WEBHOOK_SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}
```

Insert as the first check in `POST`, before `BOT_TOKEN` short-circuit:

```ts
export async function POST(req: Request) {
  // 1. Authenticate the request source (Telegram secret_token). Fail-closed.
  if (!secretOk(req)) {
    return NextResponse.json({ ok: true }, { status: 401 })
  }
  // 2. Throttle (Part 3) ...
  if (!BOT_TOKEN) return NextResponse.json({ ok: true, skip: 'no_jefe_bot_token' })
  // ... existing body parse + dedupe + chat-id check unchanged ...
```

With this in place, the `OWNER_CHAT_ID` fallback-disclosure problem (issue 2 above) stops mattering as an
*authentication* bypass — an attacker who has scraped `owner_chat_id` from the owner route's `GET` still
cannot forge a valid `secret_token`. The chat-id check remains as a second, independent authorization
layer and should **not** be removed — recommend fixing the `GET` disclosure separately (already tracked
in `secrets-in-logs-audit.md`; not re-scoped here to keep this spec's diff minimal).

### Part 2 (must-do, manual — no in-repo caller to patch) — register the webhook WITH the secret

Since no code path currently calls `setWebhook` for `JEFE_BOT_TOKEN`, this is a one-time manual step for
whoever provisioned the bot (Jeff or the leader), **not** a code change:

```bash
curl -s "https://api.telegram.org/bot${JEFE_BOT_TOKEN}/setWebhook" \
  -d "url=${ORIGIN}/api/webhooks/telegram/jefe" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Must run **after** `TELEGRAM_WEBHOOK_SECRET` is provisioned and **before** Part 1 ships, or every real
Jefe message 401s the moment the fail-closed check goes live (same ordering constraint as the tenant
spec's Part 2). If the fleet ever gains an admin route for Jefe bot management, this should move into
code and stop being a manual step — out of scope here.

### Part 3 (must-do) — unconditional throttle

```ts
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
const rl = await rateLimitDb(`telegram-jefe:${ip}`, 30, 60 * 1000)   // tighter than owner/tenant (60/min) — platform-brain calls cost more
if (!rl.allowed) {
  return NextResponse.json({ ok: true, throttled: true }, { status: 429 })
}
```

Placed after the secret check (Part 1), before any body parsing — bounds cost even for an
authenticated-but-abusive sender (e.g. a leaked secret token), same defense-in-depth rationale as the
sibling specs. Suggested ceiling is tighter than the owner/tenant routes' 60/min since each admitted
request can trigger a platform-wide agent turn, not a single-tenant one — tune from real usage once
deployed, this number is a starting ceiling, not measured.

---

## Rollout (ordered — do NOT ship Part 1 before Part 2 completes)

1. Provision `TELEGRAM_WEBHOOK_SECRET` (shared with the owner/tenant specs if not already done for those).
2. Re-register the Jefe bot's webhook with the secret (Part 2, manual `curl`, above).
3. Confirm `TELEGRAM_WEBHOOK_SECRET` is set in the prod env (same prerequisite as the other two specs —
   one env var, three routes).
4. Ship Part 1 + Part 3 together (auth + throttle, same deploy).
5. Verify: a real Jefe message from Jeff's Telegram still works end-to-end; a POST with the correct
   `chat_id` but missing/wrong `X-Telegram-Bot-Api-Secret-Token` header gets 401.

## What this does and does not fix

- **Fixes:** the third, previously-unaudited unauthenticated-and-unthrottled telegram route; the
  compounding risk from the `owner_chat_id` GET-disclosure making this route's sole gate guessable.
- **Does not fix:** the `GET /api/webhooks/telegram` disclosure itself (separate fix, tracked in
  `secrets-in-logs-audit.md`) — recommend closing that alongside this spec since together they're the
  same attack chain, but each is independently shippable and this spec does not depend on the other
  landing first (Part 1 here closes the auth gap regardless of whether the GET leak is also fixed).
- **Does not fix:** anything about `askJefe`'s own tool scope/capabilities once a message is admitted —
  out of scope for a webhook-auth spec.

## Verification done / not done

- **Confirmed by reading source this turn:** the exact `POST` handler shape above (no secret check, no
  rate limit, `OWNER_CHAT_ID` fallback chain); the absence of any `setWebhook`/`registerTelegramWebhook`
  call site referencing `JEFE_BOT_TOKEN` anywhere in `platform/src` (repo-wide grep); the `GET
  owner_chat_id` disclosure in the sibling owner route and its citation in `secrets-in-logs-audit.md`;
  `rateLimitDb` signature and `timingSafeEqual` precedent reused verbatim from the two sibling specs.
- **Not verified:** whether `JEFE_OWNER_CHAT_ID` is actually set in prod (if so, the fallback-disclosure
  compounding risk in issue 2 does not apply — only the base "no auth" gap does; either way Part 1 closes
  both) — Jeff's env, not readable from here. Whether the Jefe bot is currently registered with any
  webhook at all (if it isn't, this is a hardening spec for before first use, not an active-exploit
  closure) — also not readable from here.
- **Not wired, not applied.** No route file modified by this commit.
