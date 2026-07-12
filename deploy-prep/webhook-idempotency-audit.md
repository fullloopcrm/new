# Webhook Signature-Verification & Idempotency Audit

**Scope:** every inbound webhook route under `platform/src/app/api/webhooks/*`.
**Method:** direct read of each `route.ts` handler + `platform/src/lib/webhook-verify.ts` (2026-07-12, branch `p1-w6`).
**Docs only — no code changed.** Findings below are ranked; the top three are the ones worth fixing before the next deploy.

---

## Routes enumerated (8 handlers)

| Route | Provider | Sig verify | Fail-closed? | Idempotent (dedupes replays)? |
|---|---|---|---|---|
| `webhooks/stripe/route.ts` | Stripe (tenant/Connect) | ✅ `stripe.webhooks.constructEvent` | ✅ yes | ✅ yes (per-branch) |
| `webhooks/stripe-platform/route.ts` | Stripe (platform billing) | ✅ `stripe.webhooks.constructEvent` | ✅ yes | ⚠️ delegated to `createTenantFromLead` |
| `webhooks/resend/route.ts` | Resend (Svix) | ✅ `verifySvix` | ✅ yes* | ⚠️ partial — `email.received` NOT deduped |
| `webhooks/clerk/route.ts` | Clerk (Svix) | ✅ `verifySvix` | ✅ yes* | ✅ effectively (updates are set-idempotent) |
| `webhooks/telnyx/route.ts` | Telnyx (SMS) | ✅ `verifyTelnyx` (Ed25519) | ✅ yes* | ❌ NO — `message.received` re-runs the AI agent |
| `webhooks/telnyx-voice/route.ts` | Telnyx (Voice) | ❌ **header-presence + timestamp only, NO crypto verify** | ❌ **fail-open when key unset** | ❌ NO (missed-call SMS has a cooldown guard only) |
| `webhooks/telegram/route.ts` | Telegram (owner bot) | ❌ none (chat-ID allowlist only) | n/a | ❌ NO — no `update_id` dedupe |
| `webhooks/telegram/[tenant]/route.ts` | Telegram (per-tenant bot) | ❌ none (registered chat-ID only) | n/a | ❌ NO — no `update_id` dedupe |
| `webhooks/telegram/jefe/route.ts` | Telegram (Jefe GM bot) | ❌ none (chat-ID allowlist only) | n/a | ❌ NO — no `update_id` dedupe |

`*` = fail-closed **by default**, but bypassed entirely when the per-provider
`<PROVIDER>_WEBHOOK_VERIFY=off` env kill-switch is set (see finding #4).

---

## TOP FINDINGS (fix before deploy)

### 🔴 #1 — Telnyx **Voice** webhook does not actually verify the signature (forgeable)
`webhooks/telnyx-voice/route.ts:390-400`

```ts
if (process.env.TELNYX_PUBLIC_KEY) {
  const signature = req.headers.get('telnyx-signature-ed25519')
  const timestamp = req.headers.get('telnyx-timestamp')
  if (!signature || !timestamp) { return 401 }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) { return 401 }
}
// …then processes the event
```

Two problems:
- **No cryptographic check.** It only confirms the two headers are *present* and the timestamp is *fresh*. It never verifies the Ed25519 signature against `TELNYX_PUBLIC_KEY`. Any attacker can POST a forged call-control event with a made-up `telnyx-signature-ed25519` value and a current `telnyx-timestamp` and it passes.
- **Fail-open when the key is unset.** The entire block is gated on `if (process.env.TELNYX_PUBLIC_KEY)`. With no key configured, there is zero verification.

**Blast radius:** this handler places outbound PSTN calls (`stripe`-independent), starts recordings, and sends missed-call SMS. A forged event can drive Telnyx API calls and SMS sends on the NYC Maid account.

**Fix:** call the existing `verifyTelnyx(req.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)` from `lib/webhook-verify.ts` (already used by the SMS route) instead of the hand-rolled presence check. Note it needs the **raw body** string — this route currently does `req.json()`, so it must switch to `req.text()` then `JSON.parse`.

---

### 🟠 #2 — Telegram webhooks have no signature verification and no secret-token check
`webhooks/telegram/route.ts`, `webhooks/telegram/[tenant]/route.ts`, `webhooks/telegram/jefe/route.ts`

Telegram does not sign webhook payloads. The only auth here is an **allowlist compare against `chat.id` taken from the request body** (`ALLOWED_CHAT_IDS.has(String(chatId))` / `String(chatId) !== tenant.telegram_chat_id`). Because `chat.id` is attacker-controlled request data, anyone who learns (or guesses) an allowed chat ID *and* the webhook URL can submit a forged update that the bot will process and reply to — including running `askJefe` / `askSelena` with owner-level tool access.

Telegram's intended mitigation — the **`secret_token` set via `setWebhook`, delivered as the `X-Telegram-Bot-Api-Secret-Token` header** — is **not implemented** anywhere (grep for `x-telegram-bot-api-secret-token` / `secret_token` returns nothing). Today the only real secret protecting these routes is the unguessable-ness of the webhook URL path itself.

**Fix:** register each Telegram webhook with a `secret_token` and reject any POST whose `X-Telegram-Bot-Api-Secret-Token` header doesn't match (fail-closed). Cheap, additive, no schema change.

---

### 🟠 #3 — Inbound message webhooks are not idempotent → replays re-run AI agents and re-send messages
Applies to: `telnyx/route.ts` (`message.received`), all three `telegram/*` routes, `resend/route.ts` (`email.received`).

None of these dedupe on the provider's event/update ID:
- **Telnyx SMS `message.received`** (`telnyx/route.ts:98`): a redelivered inbound SMS re-runs `askSelena`/`askYinez`, **sends a duplicate outbound SMS** (real money + customer-facing), and re-appends client notes / conversation messages. The delivery-status branch (`message.sent|delivered|failed`) *is* idempotent (blind `update` by `telnyx_message_id`).
- **Telegram** (all 3 routes): no `update_id` dedupe → a replayed update re-runs the agent and re-sends a Telegram reply. Telegram *will* redeliver on any non-2xx/timeout.
- **Resend `email.received`** (`resend/route.ts:30-44`): inserts a row into `inbound_emails` with **no uniqueness guard** on `resend_email_id` → replay inserts a duplicate inbound email. (The campaign status branches are guarded and effectively idempotent.)

**Why it matters:** providers retry on any slow/failed response, so these are hit in normal operation, not just under attack. Duplicate outbound SMS is the most visible/costly.

**Fix pattern (prepare as a follow-up, needs a DB migration — leader-gated):** a `processed_webhook_events(provider, event_id, processed_at)` table with `UNIQUE(provider, event_id)`, claimed at the top of each handler; short-circuit if the insert conflicts. Same shape as the existing Stripe `payments.stripe_session_id` guard.

---

## Secondary findings

### 🟡 #4 — `*_WEBHOOK_VERIFY=off` kill-switch fully bypasses verification
`resend/route.ts:9`, `clerk/route.ts:9`, `telnyx/route.ts:18` each wrap verification in
`if (process.env.<PROVIDER>_WEBHOOK_VERIFY !== 'off')`. Intended for local dev, but if the env var leaks to production the route silently accepts unsigned payloads. Recommend: assert `NODE_ENV !== 'production'` before honoring the `off` switch, or drop it in favor of a dev-only secret.

### 🟢 #5 — `stripe-platform` idempotency is delegated, not local
`stripe-platform/route.ts` comments claim "a re-delivered event is a no-op," but the handler itself has no guard — it relies entirely on `createTenantFromLead(lead_id)` being idempotent (and returns 500 on failure so Stripe retries). This is fine **iff** `createTenantFromLead` truly dedupes by `lead_id`; worth confirming (not verified in this pass — out of scope for a webhook-route audit).

---

## What's already correct (no action)

- **`webhooks/stripe/route.ts`** — exemplary. Fail-closed sig verify (`constructEvent`, 500 on missing secret / 400 on bad sig) and layered idempotency: `payments.stripe_session_id` existence checks, a compare-and-swap `prospects` status claim for signup, `quotes.deposit_paid_at` guard, and a `UNIQUE(tenant_id, booking_id)` claim on cleaner payouts so a retry never double-pays.
- **`verifySvix` / `verifyTelnyx`** (`lib/webhook-verify.ts`) — both do constant-time / crypto verification with a 5-minute timestamp window and return `{valid:false}` (never throw) so callers fail closed. The Telnyx SMS route and both Svix routes use them correctly; only the Voice route bypasses them (finding #1).

---

## Summary

| Priority | Route | Issue |
|---|---|---|
| 🔴 P1 | telnyx-voice | Signature never cryptographically verified; fail-open when key unset |
| 🟠 P2 | telegram (×3) | No sig/secret-token verification — body-supplied chat-ID allowlist only |
| 🟠 P2 | telnyx SMS, telegram ×3, resend `email.received` | Not idempotent — replays re-run agents / re-send SMS / duplicate rows |
| 🟡 P3 | resend, clerk, telnyx SMS | `*_WEBHOOK_VERIFY=off` bypass could leak to prod |
| 🟢 P4 | stripe-platform | Idempotency delegated to `createTenantFromLead` (unverified here) |

Fixes for P1 and P2-signature are additive and need no DB change. The idempotency
fix (P2) needs a `processed_webhook_events` table — prepare as a migration file
for leader/Jeff to run against prod; do not apply here.
