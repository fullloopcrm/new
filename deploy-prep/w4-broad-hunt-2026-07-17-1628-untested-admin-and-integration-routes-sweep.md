# W4 broad hunt — 16:28 pass: untested admin + integration route sweep

**Scope selection.** Cross-referenced every top-level `/api` directory (403
`route.ts` files) against the filenames of all prior `deploy-prep/*.md` docs
this session (303 files) to find directories with zero prior audit trail.
Then, within promising directories, prioritized files with **zero sibling
`.test.ts`** while neighboring files in the same directory *did* have tests —
a strong signal a file was ported/added after the rest of its siblings were
already hardened and reviewed.

## Files reviewed (clean, no changes)

Platform admin surfaces (`/api/admin/*`) — `impersonate`, `admin-auth`
(`verifyAdminToken`/`verifyTenantAdminToken`), `users` + `users/[id]` +
`users/[id]/pin` (owner-escalation guard confirmed live), `businesses`,
`territories`, `prospects`, `activity`, `geocode-backfill`, `cleanup-phones`,
`cleanup-test-bookings`, `team-availability-batch`, `travel-time(s)`,
`send-apology-batch`, `message-applicants/{preview,send}` (all
`requirePermission`-gated — an earlier grep pass mistakenly flagged these as
ungated because it only matched the literal string `requireAdmin`, not
`requirePermission`; corrected before reporting).

Impersonation chain specifically: `lib/impersonation.ts` (HMAC-signed cookie,
embedded `exp`, `timingSafeEqual` compare) → `lib/tenant.ts`
(`getAdminImpersonatedTenant`/`getClerkImpersonatedTenant`, both require a
valid `admin_token` or super-admin Clerk id in addition to the impersonation
cookie) — no gap found.

Other directories: `inquiry` (rate-limited, HTML-escaped, already hardened),
`service-area`, `service-types`, `setup-checklist`, `permissions/me`,
`user/preferences` (own-member-scoped via Clerk session), `tenant-sitemap`
(public by design, no secrets in payload), `leads` + `leads/verify` +
`leads/block` (rate-limited / permission-gated / tenant-scoped),
`management-applications/{draft,upload,signed-url}` (already carry the
same upload-prefix + content-type validation as their sibling `route.ts` —
just missing a dedicated test file, not missing the fix), `google/auth` +
`google/callback` (signed OAuth state, CWE-352 comment confirms prior
review), `google/posts`, `google/reviews` GET/PUT, `social/posts`,
`jobs/[id]/payments`, `deals/[id]/activities`, `import-clients` (see below).

## Fix applied

**`google/reviews/route.ts` POST — reply-save UPDATE missing tenant scope.**
The handler verifies `reviewId` belongs to the caller's tenant via a
tenant-scoped SELECT early in the function, but the final local-save UPDATE
after posting to Google only filtered on `.eq('id', reviewId)`, dropping the
`tenant_id` filter every sibling write in the same route (and everywhere
else this session) carries. **Not live-exploitable** — confirmed via RED/GREEN
(`git apply -R`, not stash): a new test asserting a cross-tenant reviewId is
rejected passed identically on both the pre-fix and post-fix code, because
the earlier ownership-verified SELECT already 404s before the UPDATE is ever
reached. Fixed anyway as defense-in-depth to close the one write in this
route that wasn't scoped like its neighbors — same posture as every
tenant_id/entity_id threading fix landed earlier today. Added
`route.tenant-scope.test.ts` (2 tests) to lock in the scoped-write behavior
going forward.

RED/GREEN: `git diff > patch && git apply -R patch` to strip the fix, ran the
new test (passed on both — confirming non-exploitable), `git apply patch` to
restore. `npx vitest run src/app/api/google` (3 files, 6 tests) green.
Full suite: 591/593 files, 2129/2133 tests pass — the 2 failures
(`bookings/broadcast/route.xss.test.ts`, `cron/tenant-health/status-coverage-
divergence.test.ts`) are pre-existing and untouched by this pass (confirmed
via `git log` — neither file is in this session's diff). `npx tsc --noEmit`
clean of new errors (same 3 pre-existing unrelated errors as every prior
pass this session, plus 2 unrelated pre-existing errors in
`sunnyside-clean-nyc/_lib/site-nav.ts`).

## Noted, not fixed (no live exploit, informational only)

`/api/import-clients` (singular-hyphenated path, distinct from the actively
used `/api/clients/import`) has zero live frontend callers (grepped for
fetch call sites — none found) but **is already RBAC-gated**
(`requirePermission('clients.create')`, commit `0493bce5`, 2026-07-14) unlike
the dead-code landmines flagged earlier today (site-clone `auth.ts`,
`lead-media/signed-url`) which were fully unauthenticated. This one lacks
the sibling's array-size cap and concurrent-duplicate (23505) handling, but
since it requires an authenticated tenant member with client-create
permission and has no UI entry point, it's a stale duplicate rather than a
security landmine — not escalating to the JEFF-MORNING-QUEUE dead-code item,
just recording it here in case someone later wires a caller to it.

No push/deploy/DB. File-only.
