# W4 fresh-area finding: recurring-schedules routes missing RBAC gate

## Bug

`GET`/`POST /api/schedules`, `GET`/`PUT`/`DELETE /api/schedules/[id]`, and `POST`/`DELETE /api/schedules/[id]/pause` (`platform/src/app/api/schedules/route.ts`, `platform/src/app/api/schedules/[id]/route.ts`, `platform/src/app/api/schedules/[id]/pause/route.ts`) all called `getTenantForRequest()` directly with **no `requirePermission` check** — despite `schedules.view` / `schedules.create` / `schedules.edit` being defined RBAC permissions (`rbac.ts`) with their own "Schedules" group in the tenant permissions-matrix UI (`PERMISSION_CATALOG`).

Same asymmetric-gating class as this session's other fixes (`/api/management-applications`, `/api/team`, `/api/leads/override`): any authenticated tenant member — including a role that's had `schedules.view`/`schedules.create`/`schedules.edit` explicitly revoked via the tenant's own RBAC customization (`selena_config.role_permissions` override) — could:
- list/read every recurring schedule, including the joined client's `name`/`phone`/`address` (PII)
- create a new recurring schedule and its first 4 weeks of generated bookings
- edit or cancel an existing schedule (cancelling its future bookings)
- pause a schedule (cancels bookings in the pause window + sends the client an SMS if Telnyx is configured) or resume one early

None of these six handlers are in the excluded team-PIN/referrers/referral-commissions set.

## Fix

Gated:
- `GET /api/schedules` and `GET /api/schedules/[id]` → `requirePermission('schedules.view')`
- `POST /api/schedules` → `requirePermission('schedules.create')`
- `PUT`/`DELETE /api/schedules/[id]` and `POST`/`DELETE /api/schedules/[id]/pause` → `requirePermission('schedules.edit')`

Swapped the raw `getTenantForRequest()` call for `requirePermission(...)` in each handler (destructuring `tenantId` off the returned `tenant`), matching the pattern already used by every other gated route in this codebase. Left `AuthError` imports/catch blocks in place — `getTenantForRequest()` inside `requirePermission()` can still throw it.

Files:
- `platform/src/app/api/schedules/route.ts`
- `platform/src/app/api/schedules/[id]/route.ts`
- `platform/src/app/api/schedules/[id]/pause/route.ts`

## Verification

- All 4 built-in roles already have `schedules.view` by default; `manager`/`admin`/`owner` also have `schedules.create`/`schedules.edit` by default (`staff` does not have create/edit — matches the UI's "Staff: view-only, can create bookings" description). This fix does not change behavior for any standard-role dashboard consumer (`dashboard/schedules/page.tsx`, `dashboard/schedules/[id]/page.tsx`). It only closes the gap for a role that's had one of these permissions revoked via RBAC override.
- New `route.permission-gate.test.ts` in `schedules/`, `schedules/[id]/`, and `schedules/[id]/pause/` (20 new tests total) — each asserts a role lacking the relevant permission gets 403 and a role with it gets the expected 2xx. Confirmed RED pre-fix by construction (staff has `schedules.view` but not `schedules.create`/`schedules.edit`, so those cases only pass once the corresponding handler is actually gated).
- Two pre-existing tests (`route.client-scope.test.ts`, `[id]/route.mass-assign.test.ts`) mocked `getTenantForRequest()` without a `role` field, which now trips the new gate (role `undefined` → 403 instead of exercising their own scoping/mass-assignment logic). Updated both mocks to `role: 'owner'` so they keep testing what they were written to test.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 291/292 files, 1311/1315 tests pass (2 expected-fail, 1 skipped). The 1 failing file (`cron/tenant-health/status-coverage-divergence.test.ts`) is the same pre-existing self-documented "RED until fixed" invariant test flagged in prior W4 reports — unrelated to this change.

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
