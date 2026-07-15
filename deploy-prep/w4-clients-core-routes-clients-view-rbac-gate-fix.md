# W4 fresh-area finding: core clients routes missing RBAC gate

## Bug

`GET /api/clients`, `GET /api/clients/[id]`, `GET /api/clients/analytics`, `GET /api/clients/enriched`, and `GET /api/clients/stats` (`platform/src/app/api/clients/{route.ts,[id]/route.ts,analytics/route.ts,enriched/route.ts,stats/route.ts}`) all called `getTenantForRequest()` directly with **no `requirePermission` check** — despite `clients.view` being a defined RBAC permission that every sibling route on the same table already enforces: `POST /api/clients` (`clients.create`), `PUT`/`DELETE /api/clients/[id]` (`clients.edit`/`clients.delete`), and `GET /api/clients/[id]/{activity,contacts,export,transcript}` plus `POST /api/clients/import` (all `clients.view`/`clients.create`/`clients.edit`).

Same asymmetric-gating class as this session's other fixes (`/api/leads/*`, `/api/schedules/*`, `/api/team`, `/api/management-applications`): any authenticated tenant member whose role has had `clients.view` explicitly revoked via the tenant's own RBAC customization (`selena_config.role_permissions` override) could still:
- list every client with search/filter (`GET /api/clients`) — name, email, phone
- read a single client's full record (`GET /api/clients/[id]`) — includes notes, address, `sms_consent`, `preferred_team_member_id`
- pull tenant-wide LTV and lifecycle classification per client (`GET /api/clients/analytics`)
- pull the full enriched client list — health score, projected LTV, preferred cleaner, recurring schedule (`GET /api/clients/enriched`)
- pull tenant-wide client counts, revenue, and source breakdown (`GET /api/clients/stats`)

`staff` has `clients.view` by default (`platform/src/lib/rbac.ts` — `staff: ['clients.view', 'bookings.view', 'bookings.create', 'team.view', 'schedules.view', 'reviews.view', 'sales.view', 'notifications.view']`), so this is exclusively an RBAC-override gap, not a default-role gap — same shape as the `/api/schedules` fix.

None of these five handlers are in the excluded team-PIN/referrers/referral-commissions set.

## Fix

Gated all five `GET` handlers on `requirePermission('clients.view')`, matching the convention used by every other gated route on this table. Swapped the raw `getTenantForRequest()` call for `requirePermission(...)` in each handler (destructuring `tenantId` off the returned `tenant`). Dropped the now-unused `getTenantForRequest` import from `route.ts`, `[id]/route.ts`, `analytics/route.ts`, and `stats/route.ts` (kept `AuthError`, still referenced by other handlers/catch blocks in the same files); `enriched/route.ts` only had one handler so its import was swapped, not dropped.

Files:
- `platform/src/app/api/clients/route.ts`
- `platform/src/app/api/clients/[id]/route.ts`
- `platform/src/app/api/clients/analytics/route.ts`
- `platform/src/app/api/clients/enriched/route.ts`
- `platform/src/app/api/clients/stats/route.ts`

## Verification

- Confirmed against `platform/src/lib/rbac.ts`: `owner`/`admin`/`manager`/`staff` all have `clients.view` by default. This fix changes behavior only when `clients.view` has been revoked via a tenant's RBAC override — no standard-role dashboard consumer breaks.
- New `route.permission-gate.test.ts` in each of the five locations (10 new tests total) — each asserts a `staff` role with `clients.view` revoked via a `selena_config.role_permissions` override gets 403, and default `staff` (no override, has `clients.view` by default) gets 200 with the expected body shape.
- Mutation-verified: `git stash`'d the five source fixes (tests untouched) and reran — all 5 "revoked → 403" assertions went RED at 200 against the pre-fix code, confirming they actually exercise the vulnerability. Restored via `git stash pop`, reran — all 10 GREEN.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 300/301 files, 1329/1333 tests pass (1 pre-existing self-documented "RED until fixed" `cron/tenant-health/status-coverage-divergence.test.ts` invariant test flagged in prior W4 reports, plus 2 expected-fail + 1 skipped — all unrelated to this change).

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
