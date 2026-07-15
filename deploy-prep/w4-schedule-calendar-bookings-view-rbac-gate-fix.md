# W4 — GET /api/schedule/calendar missing bookings.view RBAC gate

## Finding

`GET /api/schedule/calendar` (the monthly ops calendar: per-day booking events with
client names, per-team-member schedule/conflict detection, weekly revenue, team
utilization %, and a "live ops" feed of today's jobs) called `getTenantForRequest()`
directly with **zero permission check**.

Every sibling data endpoint in the same domain already gates on the matching
permission:
- `GET /api/bookings`, `/api/bookings/[id]`, `/api/bookings/stats` → `bookings.view`
- `GET /api/schedules`, `/api/recurring-schedules` → `schedules.view`
- `GET /api/team-availability` → `bookings.view`

This route was the odd one out, exposing the same class of data (client names,
booking pricing, team member assignments) with no gate at all.

## Impact

`staff` has `bookings.view` by default, so out of the box this is an
**RBAC-override-only gap**: any tenant that has customized its role permissions
(e.g. revoked `bookings.view` from `staff` via `selena_config.role_permissions`)
would still have that gap silently bypassed on this one endpoint — same shape as
this session's `schedules`/`clients`/`campaigns` fixes.

## Fix

Gated `GET` on `bookings.view` (matches `/api/bookings` and `/api/team-availability`,
the two closest sibling endpoints exposing the same booking/client data), using the
same `requirePermission()` helper.

## Verification

- New `route.permission-gate.test.ts`: RED confirmed against pre-fix code via
  cp-based backup/restore (a role with no `bookings.view` got 200 instead of 403),
  GREEN after restoring the fix.
- `npx tsc --noEmit`: clean.
- Full `vitest run`: 307/308 files, 1349/1353 tests pass. 1 failure is the
  pre-existing, self-documented RED-until-fixed
  `cron/tenant-health/status-coverage-divergence.test.ts` invariant, unrelated to
  this change and flagged repeatedly by other workers this session.

File-only. No push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN
routes.
