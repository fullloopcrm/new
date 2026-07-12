# Webhook Hardening — Ready-to-Apply Plan

**Status:** file-only, additive. Nothing here is applied to any route in this
pass (W6, 2026-07-12, branch `p1-w6`). This is the exact change list for when
Jeff clears the work. Pairs with:

- `deploy-prep/webhook-idempotency-audit.md` — the findings this closes
- `deploy-prep/webhook-dedupe-helper-design.md` — the dedupe helper shape
- `platform/src/lib/migrations/2026_07_12_processed_webhook_events.sql` — the idempotency ledger (leader/Jeff runs the DDL)

**Verification anchors (read directly this pass):** `telnyx-voice/route.ts:385-400`,
`telnyx/route.ts:14-19`, `resend/route.ts:5-45`, `telegram/route.ts:48-63`,
`telegram/[tenant]/route.ts:48-73`, `telegram/jefe/route.ts:17-30`,
`lib/webhook-verify.ts:77-115`.

Order of application matters — see **§4 Safe sequencing** at the end. TL;DR:
the two signature fixes (§1, §2) are pure code, no schema, no new prod secret,
and can ship first. The idempotency wiring (§3) must wait until the ledger
migration is applied to prod, or every inbound handler fails closed and drops
live traffic.

---

## §1 — Telnyx **Voice**: replace the fake sig check with real Ed25519 verify (fail-closed)

**File:** `platform/src/app/api/webhooks/telnyx-voice/route.ts`
**Flag:** audit #1 (🔴 P1) — header-presence + timestamp only, and fully
fail-open when `TELNYX_PUBLIC_KEY` is unset.

### Current (`:385-402`)

```ts
export async function POST(req: NextRequest) {
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

  const payload = (await req.json().catch(() => null)) as {
    data?: { /* ...unchanged... */ }
  }
```

### Replacement

Two coupled edits — (a) read the raw body once so we can verify it, then
`JSON.parse` (Ed25519 verifies bytes, not a re-serialized object; `req.json()`
throws away the exact bytes), and (b) call the same `verifyTelnyx` the SMS route
already uses. Add the import at the top of the file alongside the existing
imports:

```ts
import { verifyTelnyx } from '@/lib/webhook-verify'
```

Then the handler head becomes:

```ts
export async function POST(req: NextRequest) {
  // Read raw bytes once — Ed25519 verifies the exact payload, and JSON.parse
  // reuses the same string (matches telnyx/route.ts:15-30).
  const rawBody = await req.text()

  // Fail-CLOSED signature verification. Unlike the old block, this is NOT
  // gated on the key being present: verifyTelnyx returns { valid:false } when
  // the key is unset, so a missing key now REJECTS instead of waving traffic
  // through. Keep the same env kill-switch shape as the other routes so local
  // dev can opt out explicitly.
  if (process.env.TELNYX_WEBHOOK_VERIFY !== 'off') {
    const result = verifyTelnyx(req.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
    if (!result.valid) {
      console.warn('[telnyx-voice webhook] rejected:', result.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let parsed: {
    data?: { /* ...same shape as the old `payload` cast... */ }
  } | null = null
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const payload = parsed
  // ...rest of the handler unchanged; it already reads `payload?.data?...`
}
```

**Notes for the applier:**
- The old `.catch(() => null)` swallow-and-continue is replaced by an explicit
  400 on unparseable JSON — same as SMS/resend. If a downstream line depends on
  `payload` being non-null, it already guarded with `payload?.` so no cascade.
- `verifyTelnyx` reuses `TELNYX_PUBLIC_KEY` — the **same** key already set for
  the SMS route. No new secret. (Telnyx signs voice call-control events with
  the same account key.) Confirm the voice webhook is configured under the same
  Telnyx account as SMS before relying on this — see §4.
- Do **not** keep the old `if (process.env.TELNYX_PUBLIC_KEY)` wrapper. Leaving
  it in reintroduces the fail-open path.

**Env/secret deps:** `TELNYX_PUBLIC_KEY` (already present for SMS). Optional
`TELNYX_WEBHOOK_VERIFY=off` for local dev only.

---

## §2 — Telegram: enforce `X-Telegram-Bot-Api-Secret-Token` (fail-closed) on all 3 routes

**Files:**
- `platform/src/app/api/webhooks/telegram/route.ts` (owner bot)
- `platform/src/app/api/webhooks/telegram/[tenant]/route.ts` (per-tenant bot)
- `platform/src/app/api/webhooks/telegram/jefe/route.ts` (Jefe GM bot)

**Flag:** audit #2 (🟠 P2) — Telegram doesn't sign payloads; today the only
gate is a body-supplied `chat.id` allowlist, which is attacker-controlled.
Telegram's intended mitigation is a `secret_token` set at `setWebhook` time and
returned on every POST as the `X-Telegram-Bot-Api-Secret-Token` header.

### The check (identical shape, added at the very top of each `POST`, before parsing the body)

```ts
// Telegram returns the secret_token registered via setWebhook on every POST.
// Reject anything that doesn't match — fail closed. This runs BEFORE json()
// so a forged request never reaches the allowlist/agent path.
const expectedSecret = process.env.<VAR> // see per-route table below
if (expectedSecret) {
  const got = req.headers.get('x-telegram-bot-api-secret-token')
  if (got !== expectedSecret) {
    return NextResponse.json({ ok: true, skip: 'bad_secret' }, { status: 401 })
  }
}
```

Return-shape note: keep the `{ ok: true, ... }` body style these routes already
use, but with a 401 status so a real misconfig is visible in logs. Returning
200 here would tell Telegram "delivered" and suppress its retry — fine for a
forgery, but a 401 is the honest signal and Telegram won't spam-retry a 401.

### Per-route wiring

| Route | Env var | Insert point |
|---|---|---|
| `telegram/route.ts` | `TELEGRAM_WEBHOOK_SECRET` | top of `POST` (`:48`), before `await req.json()` |
| `telegram/jefe/route.ts` | `TELEGRAM_JEFE_WEBHOOK_SECRET` | top of `POST` (`:17`), before `body = await req.json()` |
| `telegram/[tenant]/route.ts` | per-tenant column `telegram_webhook_secret` (see below) | after tenant lookup, before `await req.json()` |

**Per-tenant route caveat:** the `[tenant]` route serves a *different bot per
tenant*, each with its own `setWebhook` secret. A single env var can't cover
them. Two options — pick at apply time:
1. **Column (preferred, matches house pattern):** add `telegram_webhook_secret text`
   to the `tenants` select at `[tenant]/route.ts:42` and compare against
   `tenant.telegram_webhook_secret`. Needs a one-line additive migration
   (`ALTER TABLE tenants ADD COLUMN telegram_webhook_secret text;`) — leader-gated,
   prepare as a file, not run here.
2. **Shared env fallback (weaker):** one `TELEGRAM_TENANT_WEBHOOK_SECRET` used
   when re-registering *all* tenant bots with the same secret. Simpler, no
   schema, but one leaked secret unlocks every tenant bot. Only acceptable as a
   stopgap.

The `if (expectedSecret)` guard means: **until** each bot is re-registered with
a secret (see §4 re-register steps) and the env/column is populated, the check
is a no-op and existing behavior is unchanged. Once populated, it enforces.
This is what lets §2 ship as code now and activate per-bot as secrets land.

**Env/secret deps:** `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_JEFE_WEBHOOK_SECRET`,
and either the `tenants.telegram_webhook_secret` column or
`TELEGRAM_TENANT_WEBHOOK_SECRET`. All NEW secrets — generate random values
(e.g. `openssl rand -hex 32`), 1–256 chars, `A-Z a-z 0-9 _ -` only (Telegram's
allowed charset). Store per the access-save convention.

---

## §3 — Idempotency: wire `claimWebhookEvent` into the 5 non-idempotent branches

**Flag:** audit #3 (🟠 P2) — replays re-run AI agents, re-send SMS/Telegram,
and insert duplicate inbound-email rows.

**Hard dependency:** the ledger table must exist in prod first
(`2026_07_12_processed_webhook_events.sql`) **and** the helper file must be
created. The helper is designed but NOT yet written — create it exactly as
specified in `webhook-dedupe-helper-design.md`:

```ts
// platform/src/lib/webhook-dedupe.ts  (create in the §3 pass)
import { supabaseAdmin } from '@/lib/supabase'

export async function claimWebhookEvent(
  provider: string,
  eventId: string | null | undefined,
  tenantId?: string | null,
): Promise<boolean> {
  if (!eventId) return false // no id → cannot dedupe → fail closed
  const { error } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({ provider, event_id: eventId, tenant_id: tenantId ?? null })
  if (!error) return true
  if (error.code === '23505') return false // unique violation → replay → skip
  throw error // unexpected DB error → let caller 5xx so provider retries
}
```

> ⚠️ Column-name sanity check: the helper inserts `{ provider, event_id,
> tenant_id }`; the migration defines exactly those columns plus a defaulted
> `received_at` and `id`, so the insert correctly omits the two defaulted ones.
> Consistent as written today — re-confirm both files agree at apply time.

### Per-branch wiring — each claim runs AFTER signature verify, BEFORE any side effect

| # | Handler / branch | `provider` | event-id source | Claim site |
|---|---|---|---|---|
| 3a | `telnyx/route.ts` — `message.received` (`:98`) | `'telnyx'` | `event.payload?.id` | first line inside the `if (eventType === 'message.received')` block, before any tenant/agent work |
| 3b | `telegram/route.ts` (`:48`) | `'telegram'` | `body.update_id` | after the §2 secret check + `ALLOWED_CHAT_IDS` allowlist (`:62`), before `sendTelegram`/agent |
| 3c | `telegram/[tenant]/route.ts` (`:48`) | `'telegram'` | `body.update_id` | after tenant + secret + chat-id checks (`:72`), before agent |
| 3d | `telegram/jefe/route.ts` (`:17`) | `'telegram'` | `body.update_id` | after the §2 secret check + owner-chat check (`:29`), before agent |
| 3e | `resend/route.ts` — `email.received` (`:30`) | `'resend'` | `d.email_id ?? d.id ?? svix-id header` | first line inside the `if (type === 'email.received')` block, before the `inbound_emails` insert |

### Handler pattern (uniform)

```ts
// telnyx message.received example:
if (!(await claimWebhookEvent('telnyx', event.payload?.id, tenantId /* if resolved here */))) {
  return NextResponse.json({ received: true, deduped: true })
}
// ...existing side-effecting work runs only on the first delivery...
```

```ts
// telegram example (all 3 routes):
if (!(await claimWebhookEvent('telegram', body.update_id != null ? String(body.update_id) : null))) {
  return NextResponse.json({ ok: true, deduped: true })
}
```

```ts
// resend email.received example:
const claimId = (d.email_id as string) || (d.id as string) || request.headers.get('svix-id')
if (!(await claimWebhookEvent('resend', claimId))) {
  return NextResponse.json({ ok: true, deduped: true })
}
```

**Telegram `update_id` namespacing:** `update_id` is unique *per bot*, not
globally. Because 3 routes serve different bots, two bots could theoretically
emit the same integer `update_id` and collide in the shared ledger — a
false-positive dedupe that silently drops a real message. Namespace it:
`claimWebhookEvent('telegram', \`owner:${body.update_id}\`)`,
`\`jefe:${body.update_id}\``, and `\`t:${tenant.id}:${body.update_id}\`` for the
per-tenant route. Decide the exact scope tokens at apply time; the design doc
flags this too.

**Fail-closed reminder:** `claimWebhookEvent` returns `false` on a missing id →
the handler short-circuits and does NOT process. So if the ledger table is
absent (migration not yet applied) the insert throws → the helper re-throws →
the route 5xxs → the provider retries forever. **This is why §3 cannot ship
before the migration is live in prod** (see §4).

**Do NOT touch the already-idempotent branches:** telnyx delivery-status
(`message.sent|delivered|failed`, `:41`) and the resend campaign-status
branches are blind keyed updates — adding a claim there is pointless churn.

---

## §4 — Safe sequencing (what Jeff/leader runs, in order)

Signature fixes and idempotency have different dependencies. Ship in three
waves so no wave can dark live traffic.

### Wave A — signature fixes (§1 + §2 code). No schema, no traffic risk.
1. Apply §1 (voice) and §2 (telegram secret checks) as code.
   - §1 activates immediately: `TELNYX_PUBLIC_KEY` already exists, so voice
     starts truly verifying on deploy. **Pre-check:** confirm the Telnyx voice
     webhook lives under the same Telnyx account/key as SMS. If it's a separate
     Telnyx app with a different signing key, set that key first or §1 will
     reject all real voice events. Verify against a real inbound call in staging
     before prod.
   - §2 is inert until secrets exist (the `if (expectedSecret)` guard), so
     deploying the code alone changes nothing. Safe to ship ahead of the secrets.

### Wave B — activate telegram secrets (§2 runtime). Per-bot, reversible.
2. Generate a secret per bot (`openssl rand -hex 32`).
3. Set the env / column:
   - `TELEGRAM_WEBHOOK_SECRET` (owner bot)
   - `TELEGRAM_JEFE_WEBHOOK_SECRET` (jefe bot)
   - `tenants.telegram_webhook_secret` per tenant (needs the additive column
     migration from §2) **or** `TELEGRAM_TENANT_WEBHOOK_SECRET`
4. **Re-register each webhook** with Telegram so it starts sending the header
   (this is the step that makes the header appear):
   ```
   curl -sS "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -d "url=<EXISTING_WEBHOOK_URL>" \
     -d "secret_token=<THE_SECRET_JUST_SET>"
   ```
   Do this for the owner bot, the jefe bot, and every tenant bot. The URL must
   be the one already configured — `setWebhook` overwrites, so re-send the
   current URL unchanged alongside the new `secret_token`.
5. **Ordering within Wave B matters per bot:** set the env/column value BEFORE
   `setWebhook`. If you `setWebhook` first, Telegram starts sending the header
   while the route's `expectedSecret` is still empty → the guard is a no-op →
   still safe, just not yet enforcing. If you set the env first and `setWebhook`
   later, there's a window where the route expects a secret but Telegram isn't
   sending one yet → the route 401s every real update. So: **env/column first,
   then setWebhook** — and roll it bot-by-bot, verifying one live message each.
6. Rollback: unset the env/column (guard goes inert) or `setWebhook` without
   `secret_token` (Telegram stops sending the header). Either restores old
   behavior without a deploy.

### Wave C — idempotency (§3). Gated on the ledger migration.
7. **Leader/Jeff applies the migration to prod first:**
   ```
   PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres \
     -d postgres -f platform/src/lib/migrations/2026_07_12_processed_webhook_events.sql
   ```
   Safe to run anytime — an empty ledger with no handlers wired changes nothing.
8. Verify the schema landed: `\d processed_webhook_events` — confirm the
   `UNIQUE (provider, event_id)` constraint and the `received_at` index exist.
9. If §2's per-tenant column option was chosen, apply that
   `ALTER TABLE tenants ADD COLUMN telegram_webhook_secret text;` in this wave
   too (or Wave B, whichever comes first).
10. **Only after 7–8 confirm:** create `platform/src/lib/webhook-dedupe.ts` and
    apply the §3 per-branch wiring. Deploying §3 before the table exists 5xxs
    every inbound webhook (fail-closed by design) — this is the one ordering
    that can dark live traffic, so it is last and gated.
11. Verify: send a duplicate inbound SMS / re-deliver a Telegram update in
    staging; confirm the second delivery returns `{ deduped: true }` and no
    second outbound SMS / agent run fires.

### Cross-cutting: the `*_WEBHOOK_VERIFY=off` kill-switch (audit #4, 🟡 P3)
Not blocking, but fold into Wave A while touching these files: guard the `off`
switch so it can't silently disable verification in prod —
`process.env.X_WEBHOOK_VERIFY === 'off' && process.env.NODE_ENV !== 'production'`.
Applies to `resend`, `clerk`, `telnyx` (SMS), and the new `telnyx-voice` switch
added in §1. Additive, no deps.

---

## Summary — dependency matrix

| Change | New code? | New secret? | Schema? | Can dark live traffic if mis-sequenced? |
|---|---|---|---|---|
| §1 voice sig verify | yes | no (reuses `TELNYX_PUBLIC_KEY`) | no | only if voice uses a *different* Telnyx key than SMS — verify first |
| §2 telegram secret check | yes | yes (per bot) | optional (`tenants` column) | no — inert until secret set; enforce env-before-setWebhook |
| §3 idempotency wiring | yes (+ helper file) | no | **yes (ledger table)** | **YES — must ship after migration is live** |
