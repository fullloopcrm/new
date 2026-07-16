# Broad-hunt — W4, 2026-07-16 04:51 order

File-only, no push/deploy/DB. Continuing broad-hunt on a lower-risk surface
per LEADER instruction.

## Carried over from prior session (now committed)

The `/api/track` `tenant_id`-spoofing fix from the 04:37 report was verified
(`tsc --noEmit` clean of new errors, `vitest run
route.email-bomb.test.ts` 2/2 passed) but had been left uncommitted in the
worktree. Committed this pass as `5bd00d72`.

## Surfaces checked this pass (all clean, no changes needed)

- **IDOR / tenant-scoping on mutation endpoints** — read every `DELETE`
  handler in `src/app/api` (`clients/[id]`, `bookings/[id]`,
  `invoices/[id]`, `quotes/[id]`, `team/[id]`, `cleaners/[id]`,
  `deals/[id]`, `finance/bank-accounts/[id]`, `finance/entities/[id]`,
  `clients/[id]/contacts/[contactId]`, `admin/users/[id]`). Every one scopes
  its delete/update by both `id` AND `tenant_id` (or the equivalent
  ownership check first) — no cross-tenant delete/edit via a guessed or
  forged id.
- **Mass assignment via unlisted body spread** — grepped for
  `.update({...body})` / `.insert(body)` patterns across all API routes.
  Only hit was `admin/settings/route.ts`, which spreads an
  already-allow-listed+encrypted object (`EDITABLE_TENANT_COLUMNS` filters
  the input first) — not a raw body spread.
- **Admin impersonation** (`admin/impersonate`) — `requireAdmin()` gated,
  signed cookie (`signImpersonation`, `ADMIN_TOKEN_SECRET`), verifies the
  target tenant exists before minting, logs a security event on start/stop.
- **Comhub voice token minting** (`admin/comhub/voice/token`) — admin-gated,
  Telnyx credential/token operations scoped to the resolved tenant's own
  `apiKey`, so a delete request can only ever act within that tenant's own
  Telnyx account regardless of the `credential_id` passed.
- **Vercel deploy-hook** (`internal/deploy-hook`) — HMAC-SHA1 signature over
  the raw body, `timingSafeEqual` compare, fails closed (503) if secrets
  aren't configured. No exec/injection risk — deployment ID and target are
  read from the verified payload only.
- **Test harness** (`test/email-selena`) — hard-gated behind
  `SELENA_TEST_TOKEN` env var (404s if unset) plus `safeEqual` token check
  in the body; not reachable in a deployment that hasn't explicitly opted
  in.
- **Yinez public web-chat** (`api/yinez`) — already hardened: signed
  `x-tenant-id`/`x-tenant-sig` header verification before trusting any
  tenant context, exact (non-substring) phone match before linking a
  client record, session/conversation reuse rejected unless proven owned by
  the verified tenant, per-tenant+IP rate limit (20/min) on the
  Anthropic-backed reply.
- **Client error-reporting endpoint** (`api/errors`) — same signed-header
  tenant verification pattern as yinez/chat, 30/min per-IP rate limit,
  known-transient error patterns short-circuited before hitting
  `trackError`.
- **Audit log / docs / changelog GET endpoints** — `audit` requires
  `audit.view` permission and scopes by `tenant.tenantId`; `docs` requires
  `settings.view` and only returns env var *names* (no values) plus static
  platform metadata; `changelog` + `changelog/[id]` require an authenticated
  tenant session and only return `published: true` announcement rows.

## Result

No new exploitable gap found this pass. One carried-over fix committed
(`5bd00d72`). This codebase has now had ~100 broad-hunt passes across prior
W4 sessions covering webhook auth, injection, XSS, SSRF, rate limiting,
token entropy, tenant isolation, and mass assignment — this pass's surfaces
(IDOR on mutation endpoints, admin-only routes, internal/test-only routes)
were all already correctly hardened. tsc re-run only for the committed fix;
no other code was changed this pass.
