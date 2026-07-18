# CRITICAL — per-tenant Telegram webhook granted owner-tool access to any stranger when `telegram_chat_id` was unset

W4, 2026-07-18 01:51. Per the 01:44 LEADER order item 1 (new fresh-ground surface).

## What I was hunting

Continuing the `~50 unvetted sendSMS/sendEmail files` volume item carried
forward from the 01:41 checkpoint. Read through the named candidates
(`cron/outreach`, `cron/phone-fixup`, `cron/post-job-followup`,
`documents/[id]/send`, `invoices/[id]/send`, `quotes/[id]/send`,
`routes/[id]/publish`, `email/monitor`, `dashboard/comms-preview`) — all
clean (properly `requirePermission`/`CRON_SECRET`/`safeEqual`-gated, several
already hardened in prior sessions with atomic claims and SSRF guards). No
finding there.

Pivoted to a systematic sweep instead of continuing the named list: grepped
every `route.ts` under `src/app/api` (505 files) for the absence of every
known auth-guard call (`requirePermission`, `requireAdmin`, `CRON_SECRET`,
`verifyToken`/`verifyPortalToken`, `requirePortalPermission`, webhook
signature verifiers, etc.). 40 files had none of them. Most were
intentionally-public token-based routes (`invoices/public/[token]`,
`documents/public/[token]/*`, `cpa/[token]/year-end-zip` — all fine, checked
each: high-entropy tokens, expiry/revocation checked, no timing issue since
these are DB-indexed equality lookups not in-memory compares).

## The bug

`POST /api/webhooks/telegram/[tenant]/route.ts` — each tenant can configure
its own Telegram bot (`tenants.telegram_bot_token` + `tenants.telegram_chat_id`,
both independent, both "optional" per `tenant-profile.ts`). Saving
`telegram_bot_token` in the admin wizard auto-calls `registerTelegramWebhook`
(`admin/businesses/[id]/route.ts:340-360`) — the bot goes live and becomes
publicly discoverable on Telegram the moment the token is saved, **regardless
of whether `telegram_chat_id` has been filled in yet**.

The route's ownership check was:

```ts
if (tenant.telegram_chat_id && String(chatId) !== String(tenant.telegram_chat_id)) {
  await sendTelegram(chatId, 'This bot is private.', botToken)
  return NextResponse.json({ ok: true, private: true })
}
```

This only rejects on a *mismatch*. When `telegram_chat_id` is `null` (the
real, reachable state between "admin saves bot token" and "admin fills in
chat_id" — there's no `/start`-style auto-claim flow that sets it), the
condition is false and the check is skipped entirely. The message then flows
straight into `askSelena('telegram', text, convoId, ownerPhone())`, where
`ownerPhone()` always returns the **platform** owner's phone
(`OWNER_PHONES[0]` / `+12122029220`), not this tenant's actual
`tenants.owner_phone`.

`isOwnerOfTenant(phone, tenantId)` (`selena/agent.ts:186`) checks that phone
against `tenants.owner_phone` for the given tenant, with one exception: for
`tenantId === NYCMAID_TENANT_ID` it *also* accepts anything in the
`OWNER_PHONES` env list. `ownerPhone()` returns exactly `OWNER_PHONES[0]`. So
for the nycmaid tenant specifically, any stranger who finds the bot (its
`@username` is not a secret — Telegram bots are discoverable/searchable) and
sends it any message gets treated as the verified owner: full access to
`process_stripe_refund`, `send_broadcast`, `get_revenue`, `update_setting`,
`trigger_cron`, `block_client`, and the rest of the owner-tool set — with
zero possession proof, no session, nothing. Same vulnerability class, same
severity, as the `/api/chat` + `/api/yinez` owner-phone-spoof bug fixed
earlier this session (`2a684baf`), reached through a third, previously-unaudited
entry point.

For non-nycmaid tenants the same fail-open still runs the tenant's agent for
an unverified stranger (lower severity — `isOwnerOfTenant` only matches that
tenant's *own* `owner_phone` column, which won't equal the hardcoded platform
number by coincidence — but it still lets a stranger drive the tenant's
Selena/Yinez instance and any CLIENT_TOOLS/SELF_TOOLS it exposes without
proof of identity).

**Confirmed this is a genuine gap, not a designed bootstrap step**: grepped
the whole route for any write to `telegram_chat_id` (none — nothing ever
auto-claims it from an inbound message) and checked the admin wizard
(`admin/businesses/[id]/wizard/page.tsx`) for any "message the bot first to
get your chat ID" instruction (none). Also confirmed the two sibling Telegram
routes never had this class of gap: `webhooks/telegram/route.ts` (global
owner bot) uses `ALLOWED_CHAT_IDS.has(String(chatId))` — always a
membership check, never skipped; `webhooks/telegram/jefe/route.ts` compares
directly against `OWNER_CHAT_ID` unconditionally. Only the per-tenant route
used the "skip the check if unconfigured" shape, and it's the only one of
the three where the config gap is a plausible real state (bot token and chat
ID are separate, independently-saved admin-wizard fields).

## Fix

`4c8ac3c7`-style one-line flip, `!` added: unset `telegram_chat_id` now fails
closed exactly like a mismatch always did.

```ts
if (!tenant.telegram_chat_id || String(chatId) !== String(tenant.telegram_chat_id)) {
```

Bots with an unconfigured `telegram_chat_id` now reply "This bot is private."
to every sender until an admin sets the chat ID — matching the two sibling
routes' always-allowlist behavior, and consistent with the fact there's no
onboarding flow that needs the fail-open window.

## Verification

RED/GREEN mutation-verified (not stash — manual line swap + restore,
verified byte-identical to the fix after restoring): the new
`route.owner-chat-id-required.test.ts` (3 tests: unset chat_id rejected +
agent never called, mismatched chat_id rejected, matching chat_id allowed
through) failed 1/3 on the pre-fix condition and passed 3/3 post-fix.

Also had to update the existing `route.msg-tenant-tag.test.ts` — it
previously relied on the fail-open bug (asserted `telegram_chat_id: null`
reached `askSelena` to verify the tenant-tagging fix from an earlier
session) to reach its assertions. Changed its fixture to set a matching
`telegram_chat_id: '12345'` so it still exercises the same tenant-tagging
behavior without depending on the now-closed bypass.

`npx vitest run src/app/api/webhooks/telegram`: 4 files, 7 tests, all pass.
`npx tsc --noEmit`: clean except the 2 documented pre-existing baseline
errors in `sunnyside-clean-nyc/_lib/site-nav.ts` (noted every checkpoint
this session, unrelated, present before this session's changes). Full-repo
`npx vitest run` launched; will confirm zero regressions in the next
checkpoint if it hasn't finished by then.

Commit: (pending — committing after full-suite confirmation)

No push/deploy/DB this pass.
