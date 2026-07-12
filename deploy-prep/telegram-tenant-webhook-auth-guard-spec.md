# Guard Spec — per-tenant Telegram webhook auth + throttle

**Status:** SPEC — **NOT applied.** Ready-to-apply diffs below; no code was changed by authoring this. The leader applies after Jeff approves. **Hard prerequisite:** `TELEGRAM_WEBHOOK_SECRET` must be provisioned AND every existing tenant bot re-registered with the matching `secret_token` (Rollout §) *before* the verify ships, or all per-tenant Telegram traffic 401s (fail-closed).

**Closes:** Finding 1 of `deploy-prep/admin-webhook-idor-audit.md`.
**Witnessed by:** `platform/src/app/api/webhooks/telegram-tenant-auth-bypass.witness.test.ts` (passing today; documents the bypass — should flip to failing once this ships).
**Distinct from** `webhook-auth-throttle-guard-spec.md` Finding 2, which covers the **global** owner bot (`webhooks/telegram/route.ts`). This spec covers the **per-tenant** route (`webhooks/telegram/[tenant]/route.ts`) — a different file with a strictly-worse gap.

---

## The gap (verified in source this session)

`platform/src/app/api/webhooks/telegram/[tenant]/route.ts`, the only request auth:

```ts
if (tenant.telegram_chat_id && String(chatId) !== String(tenant.telegram_chat_id)) { reject }
```

Two problems:

1. **No request-source authentication at all.** Telegram supports a `secret_token` set at `setWebhook` time and echoed on every update in the `X-Telegram-Bot-Api-Secret-Token` header. The route never reads it (grep `secret.token`/`x-telegram` in this route: none). The current `registerTelegramWebhook` helper never *sends* one either.
2. **Null-`telegram_chat_id` short-circuits the only gate.** When a tenant has a bot token but no registered owner chat (the default right after setup), the `&&` skips the reject branch entirely — any attacker-chosen `chat.id` reaches `askSelena(...)`. And that call passes `ownerPhone()`, so the agent runs with **owner-level tools** (DB read/write, outbound SMS/Telegram) on the victim tenant. Attack input: a POST to `/api/webhooks/telegram/<slug>` (slug is public) with a chosen `chat.id` + `text`.

Plus an amplification vector: each unauthenticated POST does a `tenants` lookup and, for a rejected non-null-chat case, an outbound `sendTelegram(..., 'This bot is private.')` Bot-API call — unthrottled.

---

## Fix — three parts

### Part 1 (must-do) — authenticate the request came from Telegram (fail-closed)

Verify the secret-token header at the **top** of `POST`, before any DB work, constant-time (precedent: `lib/webhook-verify.ts` uses `timingSafeEqual`).

```ts
// webhooks/telegram/[tenant]/route.ts — add imports
import { timingSafeEqual } from 'node:crypto'

const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()

function secretOk(req: Request): boolean {
  // Fail-closed: no configured secret => reject (forces the rollout prerequisite).
  if (!TELEGRAM_WEBHOOK_SECRET) return false
  const got = (req.headers.get('x-telegram-bot-api-secret-token') || '').trim()
  const a = Buffer.from(got)
  const b = Buffer.from(TELEGRAM_WEBHOOK_SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}
```

Insert as the first lines of `POST`, before `loadTenantBot`:

```ts
export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params

  // 1. Authenticate the request source (Telegram secret_token). Fail-closed.
  if (!secretOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // 2. Throttle (Part 3) …
  // 3. existing loadTenantBot + body logic …
```

With this in place the null-`telegram_chat_id` case is **no longer a bypass**: an attacker cannot forge a valid `secret_token`. The existing `chat_id` check stays as a *second* authorization layer (which chat may drive the bot) — keep both; do not delete it.

### Part 2 — register the webhook WITH the secret (so real Telegram traffic carries it)

`lib/telegram.ts` — thread an optional `secretToken` into `setWebhook`:

```ts
export async function registerTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string,           // NEW
): Promise<TelegramSendResult> {
  const token = botToken.trim()
  if (!token) return { ok: false, status: 0, body: 'no bot token' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'channel_post'],
        ...(secretToken ? { secret_token: secretToken } : {}),   // NEW
      }),
    })
    return { ok: r.ok, status: r.status, body: await r.text() }
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) }
  }
}
```

Caller `admin/businesses/[id]/route.ts:349` — pass the secret:

```ts
telegramWebhook = await registerTelegramWebhook(
  rawTelegramToken,
  `${origin}/api/webhooks/telegram/${t.slug}`,
  process.env.TELEGRAM_WEBHOOK_SECRET,      // NEW
)
```

**Secret model:** one platform-wide `TELEGRAM_WEBHOOK_SECRET`, reused for every tenant's `setWebhook`. Sufficient because the secret_token authenticates *"this update came from a webhook WE registered with Telegram"* — source authentication, not tenant identity (tenant is already bound by the slug + that tenant's own bot token). A per-tenant secret column (`tenants.telegram_webhook_secret`) is an optional hardening (§ Optional) but needs a migration; the platform-wide secret needs none.

### Part 3 — unconditional throttle (bounds pre-auth floods)

Mirror the P2 telnyx pattern: a `rateLimitDb` ceiling keyed by slug + IP, applied right after the secret check so even authenticated bursts (and, defensively, any traffic) are bounded. `rateLimitDb(bucketKey, maxRequests, windowMs) → { allowed }` already exists (`lib/rate-limit-db.ts`), backed by `rate_limit_events` (migration already in tree).

```ts
import { rateLimitDb } from '@/lib/rate-limit-db'
// …inside POST, after secretOk():
const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
const rl = await rateLimitDb(`tg-tenant:${slug}:${ip}`, 60, 60 * 1000)   // 60/min/slug/IP — tune from logs
if (!rl.allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 })
```

---

## Rollout (ordered — do NOT ship Part 1 before step 2 completes)

1. **Provision `TELEGRAM_WEBHOOK_SECRET`** (random 256-bit hex) in the platform env; add to the secrets inventory.
2. **Re-register every existing tenant bot** with the secret, else Part 1 fail-closes all of them. One-off over tenants that have a `telegram_bot_token`:
   for each such tenant, `registerTelegramWebhook(decryptSecret(telegram_bot_token), '<origin>/api/webhooks/telegram/<slug>', TELEGRAM_WEBHOOK_SECRET)`. (Author as a script FILE; the leader runs it — it makes outbound Telegram API calls, so it's not a local test-mode op.)
3. **Deploy** Parts 1–3 together.
4. **Verify:** the witness test `telegram-tenant-auth-bypass.witness.test.ts` should now FAIL (its assertions describe the bypassed behavior). Update/retire it to a positive regression lock (forged secret → 401; correct secret + owner chat → agent runs).

## Optional hardening (needs a migration — separate approval)

Per-tenant secret: add `tenants.telegram_webhook_secret text`, generate per tenant at bot-setup, store it, register with it, and in `secretOk` compare against `tenant.telegram_webhook_secret` instead of the env. Binds the secret to the tenant so a leak of one tenant's secret can't authenticate another's webhook. Migration = DDL → prepared as a FILE, leader runs after Jeff approves.

## Verification / honesty notes

- **Confirmed by reading source this turn:** the `&&` short-circuit at the `telegram_chat_id` check; `registerTelegramWebhook` sends no `secret_token`; the sole registration caller is `admin/businesses/[id]/route.ts:349`; `rateLimitDb` signature + `rate_limit_events` backing; `timingSafeEqual` precedent in `webhook-verify.ts`.
- **Not verified (Jeff's env / live):** whether `TELEGRAM_WEBHOOK_SECRET` is set in prod, and how many tenants currently have a live `telegram_bot_token` (that count = the re-register blast radius in step 2). Do not apply Part 1 until step 2 is confirmed done.
- **No code changed by this spec.** `tsc` N/A (markdown only). The diffs above are illustrative and must be `tsc`-checked when actually applied.
