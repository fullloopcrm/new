# Credential Rotation Policy — Stripe / Telnyx / Resend / Supabase service-role / encryption key / Telegram bot token

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** proposed policy, 0% implemented
**Scope:** WHEN and WHY to rotate these six credentials, and WHO owns the action. This is deliberately
narrower than — and depends on — `deploy-prep/secrets-inventory-and-rotation-plan.md`, which already
documents the full rotation *mechanics* (exact procedure, breaking/non-breaking classification, blast
radius) for **every** secret in the platform, including these six. Read that doc for "how." This doc
answers "how often, on what trigger, and who's accountable" — a policy layer that doesn't exist yet.
This revision adds `TELEGRAM_BOT_TOKEN` (+ per-tenant `telegram_bot_token`) plus explicit kill-switch and
re-register steps per credential, requested as a follow-on to the original pass below.

**Verification anchors read this pass:** `lib/secret-crypto.ts:16-27,91`, `lib/supabase.ts:1-11`,
`lib/onboarding-verify.ts` (full file, reused below as the post-rotation verification mechanism),
`lib/telegram.ts` (full file — `sendTelegram`, `registerTelegramWebhook`),
`app/api/webhooks/telegram/route.ts:1-10`, `app/api/webhooks/telegram/[tenant]/route.ts:35-55`,
`lib/tenant-profile.ts:170`, `app/api/admin/businesses/[id]/route.ts:217,272-273`,
`deploy-prep/secrets-inventory-and-rotation-plan.md` (existing, full read),
`deploy-prep/secrets-at-rest-audit.md` (existing, referenced for the encryption-key special case).
Confirmed by grep: **no rotation automation, expiry tracking, or reminder cron exists anywhere in this
codebase** for any credential — every `cron/*` route was checked for rotation/expiry logic; the only
hits are unrelated (session-token expiry, recurring-schedule resume), not credential rotation.

---

## TL;DR

This policy is a proposal to fill a real gap: today, rotation of these five credentials happens **only**
reactively, with no cadence, no ownership record, and no verification step. That's not a criticism of
prior work — the mechanics doc already did the hard part (how to rotate each one safely). What's missing
is the operational habit: a calendar cadence, a trigger list, and a "did it actually work" check. Nothing
in this document is implemented — no cron added, no rotation performed, no live credential touched.

---

## 1. Scope — the five credentials, current storage

| Credential | Scope | Storage | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Platform-wide | Vercel env | Per-tenant `stripe_api_key` also exists (encrypted in `tenants` table) — see `lib/stripe.ts`, decrypts tenant key or falls back to the platform env key. |
| `TELNYX_API_KEY` (+ `NYCMAID_TELNYX_KEY`) | Platform-wide | Vercel env | Per-tenant `telnyx_api_key` (encrypted) is the norm for live tenants — see `provisioning-runbooks.md` §3. |
| `RESEND_API_KEY` (+ `NYCMAID_RESEND_KEY`) | Platform-wide | Vercel env | Per-tenant `resend_api_key` (encrypted) also exists. |
| `SUPABASE_SERVICE_ROLE_KEY` | Platform-wide, single value | Vercel env | **No per-tenant equivalent — this is the one DB god-key.** `lib/supabase.ts:5` falls back to the literal string `'placeholder'` if unset at boot, rather than throwing. The app does not crash-fail loud on a missing key; it silently constructs a client against a fake URL that will simply error on every query. Worth a loud startup assertion — **not fixed here** (file-only pass), flagged as a real footgun for whoever owns rotation. |
| `SECRET_ENCRYPTION_KEY` | Platform-wide, single value | Vercel env | The envelope key for **every** per-tenant secret above (Stripe/Telnyx/Resend/IMAP/Anthropic/Telegram keys stored encrypted in `tenants`). `getKey()` in `lib/secret-crypto.ts:20-24` **throws loud** if unset — good, fail-closed, unlike the Supabase key above. This is the highest-stakes credential in this list: per `secrets-at-rest-audit.md`, there is no key-id envelope and no re-encrypt tooling, so rotating it today is a breaking outage, not a routine action. |
| `TELEGRAM_BOT_TOKEN` (+ per-tenant `telegram_bot_token`) | Platform-wide env is Jeff's own ops bot (BotFather-issued); per-tenant is each tenant's own bot for Jefe/ops notifications | Vercel env (platform) / `tenants.telegram_bot_token`, encrypted (per-tenant) | Two independent bots, not a shared key. Platform bot: `lib/telegram.ts` — inbound webhook at `app/api/webhooks/telegram/route.ts`, outbound via `sendTelegram()`, targets `TELEGRAM_OWNER_CHAT_ID`/`TELEGRAM_NOTIFY_CHAT_ID`. Per-tenant bot: `sendTelegram(chatId, text, botToken)` accepts an override token so each tenant replies from its own bot; inbound webhook is per-tenant at `app/api/webhooks/telegram/[tenant]/route.ts`, which decrypts the stored token and no-ops cleanly (`skip:'no_bot_token'`) if absent (`:53`). Editable via `PATCH /api/admin/businesses/[id]` (`route.ts:217,272-273` — re-encrypts on save unless already encrypted). |

## 2. Rotation cadence policy (proposed)

| Credential | Time-based cadence | Breaking on rotation? | Owner |
|---|---|---|---|
| `STRIPE_SECRET_KEY` (+ per-tenant) | 90 days | No — Stripe supports overlapping keys; create→swap→revoke is zero-downtime | Jeff (Stripe dashboard access) |
| `TELNYX_API_KEY` (+ per-tenant) | 90 days | No — new key, swap, delete old | Jeff (Telnyx dashboard access) |
| `RESEND_API_KEY` (+ per-tenant) | 90 days | No — new key, swap, revoke | Jeff (Resend dashboard access) |
| `SUPABASE_SERVICE_ROLE_KEY` | 180 days | **Yes** — brief downtime window; rotate at Supabase, paste into Vercel env, redeploy in the same change (per `secrets-inventory-and-rotation-plan.md` item #9) | Jeff (Supabase org owner) |
| `SECRET_ENCRYPTION_KEY` | **No routine cadence — see §2a** | **Yes, catastrophically** — every stored tenant secret becomes undecryptable | Jeff, only on confirmed compromise |
| `TELEGRAM_BOT_TOKEN` (platform) | 180 days | No — BotFather's `/revoke` issues a new token instantly; old token stops working the moment the new one is set in Vercel env | Jeff (owns the BotFather chat for this bot) |
| Per-tenant `telegram_bot_token` | 180 days, or whenever a tenant reports their bot compromised | No — same BotFather revoke pattern, scoped to that tenant's bot only | Jeff (dashboard access), tenant only initiates the request |

90 days for the three vendor API keys is a starting proposal, not a number derived from any compliance
requirement found in this codebase — adjust if Jeff has an existing policy elsewhere. The distinction
that matters is: the top three are cheap, safe, and routine; the bottom two are not, and should be
treated differently by policy, not just by procedure.

### 2a. `SECRET_ENCRYPTION_KEY` — the deliberate exception

This key does **not** get a routine rotation cadence in this policy, and that's intentional, not an
oversight. Per `secrets-at-rest-audit.md` §5, rotating it today has no re-encrypt path — every `v1:`
envelope in the `tenants` table was sealed with the current key, and swapping keys makes all of them
fail GCM authentication simultaneously (mass decrypt failure across every tenant's Stripe/Telnyx/Resend/
Anthropic/IMAP/Telegram secret at once). Putting this on a 90-day calendar would mean scheduling a
recurring outage for no security benefit. **Pre-requisite before this key can join the routine-cadence
list:** the keyring/`kid`-envelope + offline re-encrypt job described in the audit. Until that exists,
this key rotates **only** on confirmed compromise, accepting the documented outage as the cost of that
specific incident — see §3.

## 3. Trigger-based rotation (applies regardless of the time-based cadence above)

Rotate immediately, off-cycle, on any of the following — for **any** of the five credentials:

- Confirmed or suspected leak: committed to git (even briefly, even if reverted), logged in plaintext
  anywhere, pasted into a chat/ticket/screen-share, or found in a stack trace/error log.
- Staff or contractor offboarding, for any credential they had dashboard or env access to.
- A vendor-side breach notice (Stripe, Telnyx, Resend, or Supabase security advisory naming your
  account/org, even indirectly).
- Any production incident where the credential's value appeared unredacted in logs, error responses, or
  monitoring output.

For the three vendor keys and the Supabase service-role key, trigger-based rotation follows the same
safe procedure as routine rotation (§2, create→swap→revoke or the breaking Supabase sequence) — just
off-cycle. For `SECRET_ENCRYPTION_KEY`, a trigger event means accepting the outage in §2a; there is no
safer path today.

## 4. Ownership and access

All five credentials require vendor-dashboard or Vercel-env write access that **no worker lane has**
(per this repo's standing rule: workers prepare files, never touch live prod credentials). Every
rotation in this policy is 100% Jeff-gated. Worker lanes' role is limited to: detecting a credential
problem (via `onboarding-verify.ts` checks, per `provisioning-runbooks.md`), proposing a rotation is
needed, and — once Jeff has rotated a value — running the verification in §5. No lane should ever hold,
paste, or view a raw value for any of these six credentials.

## 5. Verification after rotation — how to confirm it actually worked

A rotation that "should have worked" is not verified — reuse the same live checks the codebase already
has, rather than inventing new ones:

- **Per-tenant Stripe/Telnyx/Resend keys:** `POST /api/admin/businesses/[id]/verify-checklist` for a
  representative tenant — `verifyStripeAccount`, `verifyTelnyxNumber`, `verifyResendDomain`
  (`lib/onboarding-verify.ts`) all make live calls against the new value.
- **Platform-level Stripe/Telnyx/Resend keys** (the env-var fallback, used when a tenant has no
  per-tenant key of its own): the same `verify-checklist` run against a tenant that has *no*
  `stripe_api_key`/`telnyx_api_key`/`resend_api_key` of its own will exercise the platform fallback
  path in `lib/stripe.ts` and equivalents.
- **`SUPABASE_SERVICE_ROLE_KEY`:** confirm the app boots and a basic admin-scoped read succeeds (e.g.
  the tenant-profile GET endpoint) — this also indirectly confirms the `lib/supabase.ts:5` placeholder
  fallback was not silently triggered by a typo'd new value.
- **`SECRET_ENCRYPTION_KEY`:** only ever rotated per §2a (compromise, planned outage). Post-rotation
  verification means confirming the re-encrypt job (once it exists) actually re-sealed every tenant's
  secrets under the new key — decrypt-and-recheck a sample of tenants across all six secret types before
  declaring it done, not just that the app started without throwing.
- **`TELEGRAM_BOT_TOKEN` (platform):** send a test message via `sendTelegram()` (or trigger any real
  outbound ops alert) to `TELEGRAM_NOTIFY_CHAT_ID`/`TELEGRAM_OWNER_CHAT_ID` and confirm it arrives. If
  the inbound webhook path also matters, confirm `registerTelegramWebhook()` was re-run against the new
  token (Telegram webhooks are pinned to a specific token — see §7).
- **Per-tenant `telegram_bot_token`:** trigger a message to that tenant's chat via the per-tenant path
  (`sendTelegram(chatId, text, botToken)`), and confirm an inbound test message to
  `app/api/webhooks/telegram/[tenant]/route.ts` is no longer `skip:'no_bot_token'` and decrypts cleanly.

## 6. Kill-switch — how to immediately stop use of a compromised credential

Every credential in this list has a *fast* way to stop it being used, separate from the full rotation
procedure in `secrets-inventory-and-rotation-plan.md`. Use these when the priority is "stop the bleeding
now," with a full rotation to follow:

| Credential | Fastest kill action | What it does / doesn't cover |
|---|---|---|
| `STRIPE_SECRET_KEY` (+ per-tenant) | Roll the key in the Stripe dashboard (Developers → API keys → "Roll key") | Old key stops working immediately; does not touch Connect account access — a compromised `stripe_account_id` needs the Connect account itself reviewed, not just the key. |
| `TELNYX_API_KEY` (+ per-tenant) | Delete/deactivate the key in the Telnyx Mission Control Portal | Immediate. Does not stop an already-active DID from receiving calls/SMS at the carrier level — that requires suspending the number separately if the number itself (not just the key) is the concern. |
| `RESEND_API_KEY` (+ per-tenant) | Revoke the key in the Resend dashboard | Immediate. Domain verification/DNS records are untouched — a leaked key can't be used to change domain config, only to send mail, so revoke is sufficient containment. |
| `SUPABASE_SERVICE_ROLE_KEY` | There is no dashboard "revoke" for this key short of resetting the project's JWT secret, which invalidates **every** issued token, not just the service role — the closest single-key kill is rotating it per §2/§2a's breaking procedure immediately rather than waiting for the 180-day cadence. | Rotating is itself the kill-switch here; there's no lighter-weight option. |
| `SECRET_ENCRYPTION_KEY` | None short of the full rotation in §2a. This key cannot be "revoked" independently of rotating it, and rotating it is the outage described there. | If this key leaks, the compromise and the fix are the same event — there's no interim containment step. |
| `TELEGRAM_BOT_TOKEN` (platform) | Message `@BotFather` → `/revoke_token` for the bot, or `/setwebhook` to a dead URL to stop inbound processing instantly without revoking | `/revoke_token` issues a new token immediately (old one dies) — functionally identical to rotation, so this doubles as the kill-switch. |
| Per-tenant `telegram_bot_token` | Same BotFather `/revoke_token` for that tenant's bot, scoped to their bot only — or, if BotFather access isn't available, clear the stored `telegram_bot_token` field via `PATCH /api/admin/businesses/[id]` so the per-tenant webhook immediately short-circuits to `skip:'no_bot_token'` (`[tenant]/route.ts:53`) | Clearing the field stops the CRM from *using* the token but does not revoke it at Telegram — the token itself is still valid until BotFather revokes it. Use both if the tenant's bot itself (not just this app's use of it) is the concern. |

## 7. Re-register steps — bringing a rotated credential back online

Rotating a credential is not the same as finishing the job — several of these have a second
"re-register" step that's easy to forget:

- **`STRIPE_SECRET_KEY` / per-tenant:** after swapping the key, the Stripe **webhook endpoint** for
  `/api/webhooks/stripe` is keyed to the account, not the API key, so it does not need re-registering —
  but confirm via `verify-checklist`'s `stripe_webhook_configured` check anyway (per
  `provisioning-runbooks.md` §2), since a *new Connect account* (not just a new key) would need the
  webhook re-added.
- **`TELNYX_API_KEY` / per-tenant:** no re-registration needed for the key itself, but if the rotation was
  prompted by suspecting the *number* (not just the key) was compromised, the messaging profile
  attachment must be re-verified — `verify-checklist`'s `telnyx_number_active` check confirms this.
- **`RESEND_API_KEY` / per-tenant:** no re-registration needed — Resend's domain verification (SPF/DKIM
  DNS records) is tied to the domain, not the key.
- **`SUPABASE_SERVICE_ROLE_KEY`:** must be pasted into Vercel env **and redeployed** in the same change
  (per `secrets-inventory-and-rotation-plan.md` item #9) — a rotated key with no redeploy leaves the
  running app on the old (now-invalid) key until the next deploy, which will start failing every
  admin-scoped query at that moment, not at rotation time. This lag is the single most common way this
  rotation goes wrong.
- **`SECRET_ENCRYPTION_KEY`:** requires the re-encrypt job (§2a) to actually run — a rotated key with no
  re-encrypt pass leaves every existing `v1:` envelope permanently undecryptable. This is not optional
  "re-registration," it's the entire point of the rotation.
- **`TELEGRAM_BOT_TOKEN` (platform):** Telegram webhooks are bound to the specific bot token used when
  `setWebhook` was called. After BotFather issues a new token, `registerTelegramWebhook()` **must be
  re-run** with the new token pointed at the same webhook URL — the old registration silently stops
  working (Telegram just stops delivering, no error surfaces in this app) until re-registered. This is
  the Telegram-specific equivalent of the Supabase redeploy gap above.
- **Per-tenant `telegram_bot_token`:** same requirement, scoped per tenant — after the tenant's bot token
  rotates, re-register that tenant's webhook (`app/api/webhooks/telegram/[tenant]/route.ts`'s URL) with
  the new token, or that tenant's inbound Telegram messages go dark silently.

## 8. Logging / audit trail

**Today there is no record anywhere — in code or docs — of when any of these six credentials was last
rotated.** No cron, no reminder, no log table. This policy proposes (does **not** implement) a minimal
fix: a `deploy-prep/rotation-log.md` entry (or a `credential_rotations` table row) per rotation event,
recording date, credential, who performed it, and the trigger (routine cadence vs. which trigger in §3).
Without this, the 90/180-day cadences in §2 have no way to be enforced or even checked — flagging as a
concrete follow-on, out of scope for this file-only pass.

## 9. What this document does not do

It does not add any cron job, reminder, or automation. It does not rotate any credential. It does not
touch any live env var, Vercel project, or vendor dashboard. It is a policy definition only — the
mechanics for actually executing a rotation safely are already fully specified in
`deploy-prep/secrets-inventory-and-rotation-plan.md`.
