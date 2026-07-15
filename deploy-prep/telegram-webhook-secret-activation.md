# Telegram webhook secret_token — activation steps

Branch: p1-w3. Code-side fix is merged behind an env-var gate so shipping it
does NOT break the live bots. Nothing here has been run — these are the
manual/coordinated steps needed to actually turn enforcement on.

## What was fixed

Telegram never signs webhook bodies. All three Telegram webhook routes
(`/api/webhooks/telegram`, `/api/webhooks/telegram/jefe`,
`/api/webhooks/telegram/[tenant]`) previously "authed" inbound POSTs by
comparing a `chat_id` **taken from the POST body itself** against an
allowlist — meaning the only thing standing between an attacker and driving
the owner-tier AI agent (Yinez / Jefe) was them guessing/leaking a chat ID.
Same class of gap as the earlier telegram/jefe finding this session.

Fix: verify Telegram's `secret_token` mechanism
(https://core.telegram.org/bots/api#setwebhook) via the new
`verifyTelegramSecretToken()` helper in `src/lib/webhook-verify.ts`. Telegram
echoes back whatever `secret_token` you register via `setWebhook` as the
`X-Telegram-Bot-Api-Secret-Token` header on every real delivery.

The check is soft-gated: if the expected secret env var / DB column is empty,
`verifyTelegramSecretToken()` passes the request through unverified (today's
behavior) instead of rejecting — so merging this doesn't 401 live traffic.
It only starts rejecting once a secret is actually configured on both sides.

## Activation — owner bot (`/api/webhooks/telegram`)

1. Generate a secret: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
2. Set `TELEGRAM_WEBHOOK_SECRET=<value>` in the Vercel env (production).
3. Register it with Telegram (needs `TELEGRAM_BOT_TOKEN`, not committed anywhere — pull from wherever it's currently stored):
   ```
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H 'Content-Type: application/json' \
     -d "{\"url\":\"https://<prod-host>/api/webhooks/telegram\",\"secret_token\":\"<value>\"}"
   ```
4. Redeploy (or the env var takes effect on next deploy) — the route starts
   rejecting requests without the matching header immediately after.

## Activation — Jefe bot (`/api/webhooks/telegram/jefe`)

Same as above, but:
- Env var: `JEFE_WEBHOOK_SECRET` (falls back to `TELEGRAM_WEBHOOK_SECRET` if
  unset, mirroring how `JEFE_OWNER_CHAT_ID` already falls back to
  `TELEGRAM_OWNER_CHAT_ID`).
- Uses `JEFE_BOT_TOKEN` for the `setWebhook` call, URL `.../telegram/jefe`.

**This is the highest-priority one to activate** — Jefe is the platform-GM
agent; impersonating Jeff through this route is the highest-blast-radius
version of the gap.

## Activation — per-tenant bots (`/api/webhooks/telegram/[tenant]`)

**No manual step required per tenant.** `registerTelegramWebhook()` (in
`src/lib/telegram.ts`) now accepts a `secretToken` param, and
`PUT /api/admin/businesses/[id]` (the route the admin tenant-editor UI calls
when a bot token is saved) now:
1. Generates a fresh random secret whenever a raw (unencrypted)
   `telegram_bot_token` is submitted.
2. Stores it encrypted in the new `tenants.telegram_webhook_secret` column
   (added to `ENCRYPTED_TENANT_FIELDS`).
3. Passes it to `registerTelegramWebhook()`, which now includes
   `secret_token` in the `setWebhook` call.

**Prerequisite:** run the migration first —
`platform/src/lib/migrations/2026_07_13_tenants_telegram_webhook_secret.sql`
(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS telegram_webhook_secret text`).
Not run against prod by this worker — leader/Jeff to apply.

Until a tenant's bot token is next re-saved through the admin UI (or someone
does it manually), that tenant's `telegram_webhook_secret` stays NULL and the
route falls back to the old (weaker) chat-id-only check — no breakage, just
not yet hardened. To force activation for an already-configured tenant
without changing its bot token, re-save the *same* token value through the
admin editor (the route re-registers + re-generates the secret on any raw,
non-encrypted token in the request body).

## Verification after activating each bot

Send a real message to the bot from the registered owner/tenant chat and
confirm it still replies. Then try a manual curl to the webhook URL with a
forged body and no (or wrong) `X-Telegram-Bot-Api-Secret-Token` header and
confirm it now 401s.
