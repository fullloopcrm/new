# Broad-hunt — W4, 2026-07-16 05:05 order

File-only, no push/deploy/DB. Continuing broad-hunt on a lower-risk surface
per LEADER instruction.

## Fixed: `POST /api/sales-applications` trusted a client-supplied `tenant_slug`

`src/app/api/sales-applications/route.ts` is a public, unauthenticated form
endpoint. It read `tenant_slug` straight from the JSON body first, falling
back to the middleware-injected `x-tenant-slug` header only if the body
omitted it — same trust-order bug class already fixed on `/api/track`
(client-supplied `tenant_id`, commit 5bd00d72).

Middleware (`middleware.ts`, `APP_ROOT_PREFIXES` includes `/api/`) always
resolves the tenant from the verified Host and calls
`requestHeaders.set('x-tenant-id'|'x-tenant-slug'|'x-tenant-sig', ...)` on
every `/api/*` request — `Headers.set()` overwrites any client-sent copy of
the same header, so by the time the route handler runs, `x-tenant-slug` is
always middleware-authoritative, never attacker-controlled. Reading
`body.tenant_slug` first threw that guarantee away: an anonymous caller
could POST directly to `/api/sales-applications` (any host — the route
never checks Host itself) with an arbitrary tenant's slug and:
- Insert a fake pending row into that tenant's `sales_applications` table
  (dashboard pollution, `SalesAppsTab.tsx`).
- Trigger a real "New Sales Partner Application" admin-notification email
  via `notify()` for that tenant, with attacker-controlled `name`/
  `location`/`why` fields (unwanted-email / social-engineering vector on a
  business that never asked for it).

Grepped every caller (`SalesAppsTab.tsx` — admin GET/PUT/DELETE only;
`site/nycmaid/apply/commission-sales-partner/page.tsx` — the only POST
caller) and confirmed **no legitimate caller sends `tenant_slug` in the
body** for this route — the nycmaid page relies purely on Host-based
middleware resolution. So unlike `/api/team-applications` (see below), there
was nothing to preserve.

**Fix**: `tenant_slug` now comes only from `request.headers.get('x-tenant-slug')`
— the client-body fallback is gone entirely.

## Investigated and left alone: `POST /api/team-applications`

Has the identical body-then-header pattern and I initially made the same
fix — then found `src/app/apply/[slug]/page.tsx`, a **shared, platform-
hosted "apply to any of our businesses" page** (`/apply/<slug>`, rendered on
`homeservicesbusinesscrm.com`, not a tenant's own domain) that explicitly
posts `tenant_slug: slug` in the body to `/api/team-applications`. Because
this page runs on the *main* host, middleware's Host-based resolution
doesn't identify a tenant at all here — the body field is load-bearing for
a real, intentional feature (a public multi-business job board where the
visitor picks which business to apply to by URL param). Trusting an
arbitrary attacker-chosen slug is inherent to that feature, not a bug — the
public UI already lets anyone submit to any listed tenant by design, same
as any generic job board. Reverted my change here (confirmed `git diff` is
empty for this file) rather than force a fix that would break the feature.

## Verification

- `npx tsc --noEmit` — clean (only the pre-existing unrelated
  `bookings/broadcast/route.xss.test.ts` mock-typing error).
- New `src/app/api/sales-applications/route.tenant-slug-spoof.test.ts` (2
  tests): a spoofed body `tenant_slug` is ignored in favor of the header-
  resolved tenant; with no header present at all, the body slug is still
  never trusted (400, not a leak). Mutation-verified: reverted to the
  pre-fix file via `git show HEAD:...`, confirmed both assertions FAIL
  against the old code (spoofed body slug wins → 201 + inserts into the
  attacker-chosen victim tenant; no-header case still succeeds via body),
  restored the fix, re-ran GREEN.
- Full suite: `npx vitest run` — 360/361 files, 1502 passed / 1 expected
  fail / 1 skipped. The 1 failing test
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is a
  pre-existing, deliberately-named "RED until fixed" invariant test,
  unrelated to this change (I didn't touch `cron/tenant-health`).

No push/deploy/DB.
