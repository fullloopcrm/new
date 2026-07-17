# chat/yinez agent routes: sms_conversation_messages write-side tenant-tag gap closed

**Author:** W4 · **Date:** 2026-07-17
**Trigger:** LEADER 13:31 order, queue item (3) "chat/yinez agent routes."

## Summary

Swept `/api/chat`, `/api/yinez`, `/api/admin-chat`, `/api/selena`,
`/api/admin/selena` against the tenant-isolation bug class already tracked in
`deploy-prep/idor-remediation-status.md` (P2, "write-side siblings — not
individually swept"). Found and fixed the remaining unstamped
`sms_conversation_messages` inserts in `chat/route.ts`, `yinez/route.ts`,
`admin-chat/route.ts`, and `admin/selena/route.ts`'s reset handler.

## The gap

`sms_conversation_messages.tenant_id` carries a column `DEFAULT` of nycmaid's
UUID (`migrations/2026_05_09_tenant_id_core.sql`, "rollout safety net"). Any
insert that omits `tenant_id` silently gets that default instead of NULL. The
four routes above all logged inbound/outbound chat messages via a bare
`supabaseAdmin.from('sms_conversation_messages').insert({conversation_id,
direction, message})` — no `tenant_id` — carrying an inline comment
("tenant-scope-ok: row-scoped by conversation_id") that was true for
write-integrity but not for the row's own tag.

Effect for any tenant other than nycmaid: every chat/yinez/admin-chat message
gets mis-tagged `tenant_id = nycmaid`. Two consequences:

1. **Self-visibility bug** — that tenant's own admin console
   (`GET /api/selena?convoId=`, tenant-scoped since commit `722ed11d`) can no
   longer see its own conversation transcript — it always comes back empty,
   because the row's real tag never matches the caller's tenant.
2. **Latent disclosure toward nycmaid** — since the mis-tag is a real value
   (`nycmaid`) rather than NULL, a nycmaid operator who already knows a
   foreign conversation id would match those rows on the same tenant-scoped
   read.

This is the identical pattern already fixed on `selena/route.ts`'s reset
insert (LEADER order 19:42, regression-locked in
`route.reset-insert-tenant-tag.witness.test.ts`) — that fix covered one
insert; the sibling inserts in chat/yinez/admin-chat/admin-selena were flagged
in the tracker as out-of-lane and unswept until now.

## Fix

Added `tenant_id: <verified-tenant-in-scope>` to each insert:

- `chat/route.ts` — `tenantId` (middleware-signed `x-tenant-id`/`x-tenant-sig`, verified before use).
- `yinez/route.ts` — `reqTenantId` when the caller's header is verified; omitted (not stamped with a bogus value) when unverified, matching how the conversation row itself is tagged in that case.
- `admin-chat/route.ts` — `tenant.tenantId` (authenticated via `requirePermission`).
- `admin/selena/route.ts` reset handler — `tenantId` (authenticated via `requirePermission`), mirroring the already-fixed `selena/route.ts` sibling.

## Verification

- 4 new regression tests (`route.msg-tenant-tag.test.ts` in each of the four
  route directories) assert the insert payload carries the correct
  `tenant_id` (or, for yinez's unverified case, that it's omitted rather than
  wrong). Mutation-verified: stashed the fix, confirmed all 4 RED
  (`expected undefined to be 'tenant-msg-tag'`), restored, confirmed GREEN.
- Full suite for `chat`, `yinez`, `admin-chat`, `selena`, `admin/selena`,
  `sms`: 19 files / 48 tests, all green (includes the pre-existing
  cross-tenant witness/isolation tests for these same routes — none broke).
- `npx tsc --noEmit`: clean except 3 pre-existing, unrelated baseline errors
  (`bookings/broadcast/route.xss.test.ts` mock-typing issue,
  `sunnyside-clean-nyc/_lib/site-nav.ts` export-name mismatch) — untouched
  files, same as prior reports.

## Not touched (flagging, not fixing — out of today's "chat/yinez" queue)

Same DEFAULT-fallback gap exists on these `sms_conversation_messages` insert
sites, which the idor-remediation-status.md tracker already calls out as
unswept "write-side siblings" but which sit outside today's queue (portal/
team-portal, quotes/invoices/documents public tokens, chat/yinez):

- `src/app/api/sms/route.ts` (separate legacy SMS admin API, not a chat/yinez agent route)
- `src/app/api/webhooks/telnyx/route.ts` (3 insert sites)
- `src/app/api/webhooks/telegram/route.ts` and `webhooks/telegram/[tenant]/route.ts`

These share the identical fix shape (stamp `tenant_id` from the
webhook-resolved tenant already in scope at each call site). Recommend a
dedicated webhooks-lane pass to close the rest of this bug class before
onboarding tenant #2, per the tracker's existing recommendation.

## Standing-rule sweep results (items 1 & 2, no findings)

- **Portal/team-portal subtrees**: read every route under
  `api/portal/*` and `api/team-portal/*` performing a write or serving
  authenticated data (auth, jobs/claim, jobs/reassign, jobs/release,
  photo-upload, update-phone, rating, preferences, messages, notifications,
  connect + connect/unread, bookings, bookings/[id], feedback, notes,
  request, crew/members). All already carry tenant scoping, ownership
  checks, atomic claims, and rate limiting from prior sweeps. No new
  findings.
- **Quotes/invoices/documents public token-auth routes**: read all
  `*/public/[token]/*` routes (documents view/sign/consent/decline,
  invoices view/checkout, quotes view/accept/decline/deposit-checkout).
  All use 192-bit crypto-random tokens (`randomBytes(24).toString('base64url')`),
  atomic compare-and-swap claims on every state transition, and rate limits
  on the Stripe-session-minting endpoints. No new findings.

## Not touched (standing rules)

File-only + code fix in this worktree; no push/deploy/DB migration. No prod
writes.
