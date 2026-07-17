# SMS/webhooks routes: sms_conversation_messages write-side tenant-tag gap closed

**Author:** W4 · **Date:** 2026-07-17
**Trigger:** LEADER 13:43 order queue item (1): sweep `sms/route.ts` +
`webhooks/telnyx` + `webhooks/telegram` (x2) for the same P2 tenant_id-stamping
class already fixed on chat/yinez/admin-chat/selena (commit `c2bdd746`).

## Summary

Closed the remaining unstamped `sms_conversation_messages` inserts flagged
as "not touched (out of scope)" in the prior chat/yinez sweep
(`w4-chat-yinez-sms-message-tenant-tag-writeside-fix.md`):

- `src/app/api/sms/route.ts` — 1 insert site (outbound message)
- `src/app/api/webhooks/telnyx/route.ts` — 4 insert sites (chatbot flow:
  new-conversation inbound + greeting, ongoing-conversation inbound + AI reply)
- `src/app/api/webhooks/telegram/route.ts` (platform-owner bot) — 2 insert
  sites (inbound + outbound)
- `src/app/api/webhooks/telegram/[tenant]/route.ts` (per-tenant bot) — 2
  insert sites (inbound + outbound)

9 insert sites total across 4 files.

## The gap (same as prior sweep)

`sms_conversation_messages.tenant_id` carries a column `DEFAULT` of nycmaid's
UUID (`migrations/2026_05_09_tenant_id_core.sql`, "rollout safety net"). Every
insert above omitted `tenant_id`, carrying the same
`// tenant-scope-ok: row-scoped by conversation_id` / `webhook resolves
tenant from the verified event payload` comment that was true for
write-integrity but not for the row's own tag. For any tenant other than
nycmaid: self-visibility bug (tenant's own `GET ?convoId` read comes back
empty) plus latent disclosure toward a nycmaid operator who already knows a
foreign conversation id.

The two Telegram routes are a variant: both already stamp their
**conversation** row correctly (`NYCMAID_TENANT_ID` sentinel for the
platform-owner bot, `tenant.id` for the per-tenant bot) — only the
**message** inserts were left unstamped, so the practical exposure there is
narrower (the fallback DEFAULT happens to already be nycmaid, which is also
what the platform-owner bot uses), but leaving it implicit was still the same
gap for the per-tenant bot route, where the tenant is never nycmaid.

## Fix

Added `tenant_id` to each insert, using the tenant already resolved in scope
at that call site — never caller-supplied:

- `sms/route.ts` — `tenantId` (authenticated via `requirePermission`).
- `webhooks/telnyx/route.ts` — `tenantId` (resolved from the verified
  event's `to` phone number match against `tenants.telnyx_phone`).
- `webhooks/telegram/route.ts` — `NYCMAID_TENANT_ID` (same sentinel the
  route already uses for the conversation row).
- `webhooks/telegram/[tenant]/route.ts` — `tenant.id` (resolved from the
  URL slug via `loadTenantBot`, verified against `verifyTelegramWebhook`).

## Verification

- 5 new regression tests (`route.msg-tenant-tag.test.ts` in each of the 4
  route directories, 2 tests for telnyx covering both the new-conversation
  and ongoing-conversation chatbot branches) assert every insert payload
  carries the correct `tenant_id`.
- Mutation-verified: reverted the 4 source fixes only (tests untouched) via
  `git diff` / `git apply -R` (worker git-stash is blocked across worktrees
  sharing one `.git`), confirmed all 5 new tests RED
  (`expected undefined to be 'tenant-msg-tag'` / the nycmaid sentinel),
  restored via `git apply`, confirmed all 5 GREEN.
- Full suite for `sms/`, `webhooks/telnyx/`, `webhooks/telegram/`: 14 files /
  29 tests, all green (includes pre-existing signature-verification,
  isolation, opt-out, and confirm-race tests for these same routes — none
  broke).
- `npx tsc --noEmit`: clean except the same 3 pre-existing, unrelated
  baseline errors already called out in the prior W4 report
  (`bookings/broadcast/route.xss.test.ts` mock-typing issue,
  `sunnyside-clean-nyc/_lib/site-nav.ts` export-name mismatch) — untouched
  files.

## Not touched (standing rules)

File-only + code fix in this worktree; no push/deploy/DB migration. No prod
writes.
