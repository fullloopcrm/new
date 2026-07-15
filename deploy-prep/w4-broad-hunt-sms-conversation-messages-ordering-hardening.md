# W4 broad-hunt — GET /api/sms?conversation_id fragile-ordering hardening

**Author:** W4 · **Date:** 2026-07-15 · **Trigger:** LEADER 17:31 order — continue
broad-hunt on lower-risk surface, file-only, no push/deploy/DB.

## What this closes

`deploy-prep/idor-scan-note.md` (2026-07-12) flagged this exact route as **P1
fragile-but-currently-guarded**: `GET /api/sms?conversation_id` fetched
`sms_conversation_messages` by `conversation_id` **before** verifying the
conversation belonged to the caller's tenant. Not a live leak — the tenant
ownership check ran afterward and gated the `return` — but correctness
depended entirely on statement order, so a future edit (return moved earlier,
messages fetched inside a `Promise.all`, etc.) would silently reopen the same
cross-tenant leak class already fixed once in `/api/selena` (commit
`722ed11d`) and `/api/client/collect` (commit `ef0d8f54`).

## Fix

`platform/src/app/api/sms/route.ts` — reordered the `GET` handler so the
tenant-ownership check (`sms_conversations` by `id` + `tenant_id`) runs and
returns 404 on mismatch **before** the `sms_conversation_messages` read ever
executes. Correctness no longer depends on code order below the ownership
gate — a cross-tenant `conversation_id` never reaches the messages query at
all now.

Chose reorder-before-read over adding `.eq('tenant_id', tenantId)` directly to
the messages query: `sms_conversation_messages.tenant_id` is populated via a
DB-level `DEFAULT` on insert (per `2026_05_09_tenant_id_core.sql`), and the
same audit's P2 finding flagged at least one insert path
(`POST /api/selena` reset) that doesn't set it explicitly. Filtering the
messages read on that column would inherit that mis-tagging risk once a
second tenant onboards; gating on the already-correct `sms_conversations`
ownership check has no such dependency.

## Verification

- `npx tsc --noEmit --pretty false` — clean, no errors introduced.
- Read-through of the full `GET`/`POST` handlers in this file: `POST` already
  had a correct caller-supplied-`conversation_id` ownership check
  (`.eq('tenant_id', tenantId).eq('client_id', client_id)`) — untouched.
- Did not run the dev server / hit the endpoint live (file-only lane, no
  running services touched this session per LEADER order).

## Broader sweep this session (no other findings)

Re-checked the coverage gaps this branch's own `idor-scan-note.md` and
`postgrest-filter-injection-branch-audit.md` explicitly called out as
unswept (`.in()`/`.or()`/`.rpc()`/dynamic-table reads, PostgREST filter-grammar
injection):

- All `.in(...)` id-list reads outside `/admin` and `/cron` on tenant-facing
  routes (`campaigns/send`, `documents/[id]/fields`, `client/recurring`,
  `bookings/[id]/team`, `team-applications/bulk-approve`,
  `finance/bank-transactions/accept-suggestions`, `notifications`) were
  read line-by-line — each either carries its own `.eq('tenant_id', …)` on
  the same query or explicitly validates caller-supplied ids against a
  tenant-scoped set before use, several with in-file comments documenting the
  exact same threat model. No gap found.
- PostgREST filter-grammar injection (`postgrest-filter-injection-branch-audit.md`,
  logged as "Absent" on this branch at audit time): already closed on this
  branch — `sanitizePostgrestValue()` (`lib/postgrest-safe.ts`) exists and is
  wired into all 8 previously-RAW `.or()` call sites (commit `3daefc2b`,
  2026-07-13, predates this session). Confirmed via `grep -rn
  sanitizePostgrestValue src/app/api` — 21 call sites.
- Webhook signature verification (`telegram`, `telegram/[tenant]`,
  `telegram/jefe`, `telnyx`, `telnyx-voice`, `resend`, `clerk`, `stripe`,
  `stripe-platform`): all verify before use; `isWebhookVerifyDisabled()` is
  hard-disabled whenever `NODE_ENV === 'production'` regardless of the env
  flag value — no bypass.
- Outbound `fetch()` calls from tenant/user-reachable routes: all target
  fixed hardcoded hosts (Telnyx, Google, Facebook/Instagram, Nominatim,
  IndexNow) — no SSRF via caller-controlled destination host found.
- New untracked SEO-manager marketing-site surface (`src/app/site/
  nycroadsideemergencyassistance/*`, `src/app/site/theroadsidehelper/*`,
  `src/lib/seo/*`): public, unauthenticated, mostly static content pages.
  The two form components (`BookingForm`, `JobApplicationForm`) post to the
  existing, already-rate-limited `/api/contact` (`rateLimitDb`, 3/10min per
  tenant+IP). `AddressAutocomplete` calls Nominatim directly client-side with
  no API key exposure. No new attack surface introduced.

## Files changed

- `platform/src/app/api/sms/route.ts` (reorder only, no behavior change for
  legitimate same-tenant callers)

No push, no deploy, no DB migration run. File-only per LEADER order.
