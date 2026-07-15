# W4 fresh-area finding: leads analytics/attribution routes missing RBAC gate

## Bug

`GET /api/leads/attribution`, `GET /api/leads/domains`, `GET /api/leads/feed`, and `GET /api/leads/visits` (`platform/src/app/api/leads/{attribution,domains,feed,visits}/route.ts`) all called `getTenantForRequest()` directly with **no `requirePermission` check** — despite sibling routes on the same data (`POST /api/leads/override`, `leads/block`, `leads/verify`) already gating on `leads.view`.

Same asymmetric-gating class as this session's other fixes (`/api/leads/override`, `/api/management-applications`, `/api/team`, `/api/schedules`): any authenticated tenant member — including a role that's had `leads.view` explicitly revoked via the tenant's own RBAC customization (`selena_config.role_permissions` override) — could:
- pull tenant-wide lead source attribution data (`leads/attribution`)
- list every tracked domain for the tenant (`leads/domains`)
- read the live lead feed (`leads/feed`)
- read visitor-level website analytics: sessions, device breakdown, top pages, referrer sources, and a recent visit feed (`leads/visits`) — the last of these also exposed via `POST` as a public unauthenticated tracking-pixel endpoint (`t.js`), which was left untouched since it's intentionally public.

None of these four handlers are in the excluded team-PIN/referrers/referral-commissions set.

## Fix

Gated all four `GET` handlers on `requirePermission('leads.view')`, matching `leads/override`, `leads/block`, `leads/verify`. Swapped the raw `getTenantForRequest()` call for `requirePermission(...)` in each handler (destructuring `tenantId` off the returned `tenant`). `leads/visits/route.ts` additionally had its `GET` body de-indented out of a now-unnecessary `try { ... } catch (e) { if (e instanceof AuthError) ... }` block — `requirePermission` returns a `NextResponse` on auth failure instead of throwing, so the manual `AuthError` catch was dead for the gated path; the `POST` tracking-pixel handler below it is unchanged.

Files:
- `platform/src/app/api/leads/attribution/route.ts`
- `platform/src/app/api/leads/domains/route.ts`
- `platform/src/app/api/leads/feed/route.ts`
- `platform/src/app/api/leads/visits/route.ts`

## Verification

- Confirmed against `platform/src/lib/rbac.ts`: `owner`/`admin`/`manager` all have `leads.view` by default; `staff`'s default permission set (`clients.view`, `bookings.view`/`create`, `team.view`, `schedules.view`, `reviews.view`, `sales.view`, `notifications.view`) does **not** include `leads.view` — same as the `leads/override` precedent. This closes the gap for the default `staff` role, not just RBAC-override cases.
- New `route.permission-gate.test.ts` in each of the four directories (8 new tests total) — each asserts a `staff` role (no `leads.view`) gets 403 and a `manager` role (has `leads.view`) gets 200 with the expected body shape.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 295/296 files, 1319/1323 tests pass (1 expected-fail is the pre-existing self-documented "RED until fixed" `cron/tenant-health/status-coverage-divergence.test.ts` invariant test flagged in prior W4 reports — unrelated to this change).

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
