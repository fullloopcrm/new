# Guard Spec — telegram + telnyx-voice webhook auth + throttle (P1 financial-DoS)

**Status:** SPEC — **NOT applied.** Ready-to-apply diffs below. No code was changed by authoring this. The leader applies after Jeff approves. `TELEGRAM_WEBHOOK_SECRET` must be provisioned + the Telegram webhook re-registered with a matching `secret_token` (see Rollout) or applying the telegram guard will 401 all live traffic.

**Author:** W6, branch `p1-w6`, 2026-07-12. Ranked P1 in the financial-DoS surface.

---

## Why P1 (financial, not just data)

Both endpoints are internet-reachable and trigger **paid outbound side effects on unauthenticated input**:

- **`/api/webhooks/telnyx-voice`** — on a forged `call.initiated` event it **dials `ADMIN_RING_LIST`** (outbound PSTN legs = telephony $) and can fire `sendSMS` (missed-call SMS = $). A flood of forged events = direct, uncapped money burn plus real phones ringing.
- **`/api/webhooks/telegram`** — every unauthenticated POST does DB work and, for a non-allowed chat, an **outbound `sendTelegram(...)` "This bot is private."** reply (Bot API call per request). For an allowed chat it runs `askSelena` = an **LLM call** = tokens/$. No auth gate on the request itself, no throttle.

Neither has request-level authentication that actually holds, and neither has rate limiting. That's the P1: **unauthenticated → paid outbound action → unbounded.**

## Finding 1 — telnyx-voice signature check is presence-only AND optional

`platform/src/app/api/webhooks/telnyx-voice/route.ts:385-400`:

```ts
if (process.env.TELNYX_PUBLIC_KEY) {
  const signature = req.headers.get('telnyx-signature-ed25519')
  const timestamp = req.headers.get('telnyx-timestamp')
  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'missing telnyx signature' }, { status: 401 })
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) {
    return NextResponse.json({ error: 'stale webhook' }, { status: 401 })
  }
}
```

Two defects:

1. **No cryptographic verification.** It only checks that the header is *present* and the timestamp is *fresh*. It never verifies the Ed25519 signature. An attacker sends `telnyx-signature-ed25519: anything` + `telnyx-timestamp: <now>` and passes. The sibling SMS webhook (`webhooks/telnyx/route.ts:19`) does it correctly with `verifyTelnyx(...)` — voice was never upgraded to match.
2. **Optional.** The whole block is gated on `process.env.TELNYX_PUBLIC_KEY`. If the key is unset in an environment, the endpoint is **fully open** — fail-**open**, the wrong default for a money-moving webhook.

### Fix (ready to apply)

Mirror the SMS route exactly: read raw body, real `verifyTelnyx`, fail-closed.

```ts
// top of file — reuse the existing util
import { verifyTelnyx } from '@/lib/webhook-verify'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST(req: NextRequest) {
  // Read raw body ONCE — verifyTelnyx signs over `timestamp|rawBody`, so we
  // must verify against the exact bytes, then JSON.parse the same string.
  const rawBody = await req.text()

  // Rate limit by source IP first (cheap, pre-auth) — caps forged-event floods.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`telnyx-voice:${ip}`, 120, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  // Signature: fail-CLOSED. Only skip with an explicit local-dev opt-out,
  // matching the SMS route's TELNYX_WEBHOOK_VERIFY convention.
  if (process.env.TELNYX_WEBHOOK_VERIFY !== 'off') {
    const result = verifyTelnyx(req.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
    if (!result.valid) {
      console.warn('[telnyx-voice webhook] rejected:', result.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const payload = (() => {
    try { return JSON.parse(rawBody) } catch { return null }
  })() as { data?: { event_type?: string; payload?: { /* …existing shape… */ } } } | null
  // … rest of handler unchanged, using `payload` instead of `await req.json()` …
```

Key points:
- **Delete** the old presence-only block (lines 385-400) — the `verifyTelnyx` call subsumes it (it already enforces the 5-min freshness window internally).
- **`req.text()` before parse** is mandatory: `verifyTelnyx` verifies over the raw body string. The current `await req.json()` consumes the stream and loses the exact bytes. Switch to `req.text()` then `JSON.parse`.
- **Fail-closed:** `verifyTelnyx` returns `{valid:false, reason:'public key not configured'}` when the key is missing, so an unset key now **rejects** instead of waving traffic through. `TELNYX_WEBHOOK_VERIFY=off` remains the explicit, deliberate local-dev escape hatch — same as the SMS route.

## Finding 2 — telegram webhook has no request authentication

`platform/src/app/api/webhooks/telegram/route.ts` — `POST` parses the body and only checks `ALLOWED_CHAT_IDS` **after** processing begins. There is no verification that the request actually came from Telegram. Telegram's supported mechanism is the **secret token**: you pass `secret_token` to `setWebhook`, and Telegram then sends it on every update in the `X-Telegram-Bot-Api-Secret-Token` header. The route checks nothing.

Amplification: an unauthenticated flood of POSTs with attacker-chosen `chat.id`s each triggers `sendTelegram(chatId, 'This bot is private.')` — an outbound Bot API call per request, unthrottled.

### Fix (ready to apply)

```ts
import { timingSafeEqual } from 'node:crypto'
import { rateLimitDb } from '@/lib/rate-limit-db'

const WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()

function secretOk(req: Request): boolean {
  if (!WEBHOOK_SECRET) return false            // fail-closed: unset = reject
  const got = req.headers.get('x-telegram-bot-api-secret-token') || ''
  const a = Buffer.from(got)
  const b = Buffer.from(WEBHOOK_SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  // 1. Authenticate the request came from Telegram (constant-time compare).
  if (!secretOk(req)) {
    return NextResponse.json({ ok: true }, { status: 401 })
  }

  // 2. Throttle by source IP — bounds cost even for authenticated floods.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`telegram:${ip}`, 60, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ ok: true, throttled: true }, { status: 429 })
  }

  // … existing body parse + ALLOWED_CHAT_IDS logic unchanged …
}
```

Notes:
- **Fail-closed** (`!WEBHOOK_SECRET → reject`): the secret must be set before this deploys, or all telegram traffic 401s. That's the intended safe default, but it makes the env-var + re-register step a **hard prerequisite** (Rollout below), not optional.
- The existing `ALLOWED_CHAT_IDS` check stays — it's authorization (which humans may use the bot), a separate layer from authenticating the request source. Keep both.
- `timingSafeEqual` needs equal-length buffers; the `a.length === b.length` guard avoids its throw on mismatch. Constant-time compare prevents a secret-guessing side channel (see `constant-time` hygiene).

## Rate limiting: use `rateLimitDb`, not `rateLimit`

Both fixes use **`rateLimitDb`** (persistent, `rate_limit_events` table) rather than the in-memory `rateLimit` Map. These routes run on Vercel serverless — the in-memory Map does **not** survive cold starts and is **not** shared across concurrent instances, so it provides ~no protection against a distributed flood. `rateLimitDb` is the same choice `portal/collect` and `track` already made. It fails **open** on a DB error (by design, in `rate-limit-db.ts`) so a DB blip won't dark the webhooks — acceptable, since signature/secret auth is the primary control and the limiter is defense-in-depth.

Limits above (120/min for voice, 60/min for telegram) are **starting values** — set them above real peak legitimate volume (a busy call flow emits many call-control events per call) and tune from logs. Too tight will drop legitimate Telnyx event bursts mid-call.

## Rollout / ordering (must be done in this order)

1. **Provision `TELEGRAM_WEBHOOK_SECRET`** (random 256-bit hex) in the platform env. Add to the secrets inventory.
2. **Re-register the Telegram webhook** with the matching secret:
   `setWebhook(url, secret_token=<TELEGRAM_WEBHOOK_SECRET>)`. Until this is done, applying Finding 2 **401s all telegram traffic** (fail-closed). This step and the deploy must be coordinated.
3. **Confirm `TELNYX_PUBLIC_KEY`** is set in every deployed environment before applying Finding 1's fail-closed change — otherwise voice webhooks 401. Confirm the value matches the Telnyx portal's public key for the voice app.
4. Verify `rate_limit_events` table + its migration (`014_security_hardening.sql`, referenced by `rate-limit-db.ts`) exists in the target DB.
5. Apply diffs, deploy, smoke-test: a real Telnyx call still connects; the bot still answers Jeff; a forged POST to each endpoint returns 401 (bad/absent signature/secret) and 429 past the limit.

## Verification done / not done

- **Nothing applied, nothing run.** This is a spec; `tsc` N/A (no `.ts` file created — the code blocks are the proposed edits, to be type-checked *when applied*). When the leader applies, run `npx tsc --noEmit` in `platform/` before deploy.
- **Confirmed by reading source this turn:** telnyx-voice does presence-only + key-optional auth (lines 385-400) and no rate limit; telegram has no request auth and no rate limit; `verifyTelnyx` (`lib/webhook-verify.ts`) and `rateLimitDb` (`lib/rate-limit-db.ts`) exist with the signatures used above; the SMS telnyx route (`webhooks/telnyx/route.ts:15-24`) is the correct reference pattern being mirrored.
- **Not verified:** that `TELEGRAM_WEBHOOK_SECRET` and `TELNYX_PUBLIC_KEY` are set in prod (that's Jeff's env, not readable from here), and that the `rate_limit_events` migration is applied in the live DB. These are the rollout prerequisites above — do not apply the fail-closed changes until they're confirmed.
- Signature-verification correctness of `verifyTelnyx` itself was **not** re-tested here; it is assumed correct because it is already the production control on the SMS webhook.

## Relationship to existing docs

- Extends the same webhook-hardening theme as `webhook-hardening-plan.md` / `rate-limit-coverage-audit.md`; this doc is the **ready-to-apply** cut for the two highest-$-risk unauthenticated endpoints specifically.
