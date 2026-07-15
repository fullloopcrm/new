# W4 fresh-area finding: GET /api/team + GET /api/team/[id] missing RBAC gate

## Bug

`GET /api/team` and `GET /api/team/[id]` (`platform/src/app/api/team/route.ts`, `platform/src/app/api/team/[id]/route.ts`) called `getTenantForRequest()` directly with **no `requirePermission` check**, while their own siblings in the same files were already gated:

- `POST /api/team` → `requirePermission('team.create')`
- `PUT /api/team/[id]` → `requirePermission('team.edit')`
- `DELETE /api/team/[id]` → `requirePermission('team.delete')`

Same asymmetric-gating class as the prior fixes this session (`/api/crews`, `/api/dashboard/import/analyze`, `/api/team-members/[id]/stripe-status`, `/api/google/posts`, `/api/social/posts`, etc.): any authenticated tenant member could hit the unguarded GET, even a role that has had `team.view` explicitly revoked via the tenant's own RBAC customization (`selena_config.role_permissions` override).

Both routes `select('*')` from `team_members`, so the leaked payload includes:
- the 4-digit team-portal PIN (`pin` column, used by the team-portal check-in/check-out auth flow)
- `hourly_rate` / `pay_rate` (payroll data)
- `phone` / `email` / `address` (PII)

Note: this is **not** one of the excluded team-PIN routes (`pin-reset`, `team-portal/auth/*`, `admin/users/[id]/pin`) — it's the generic legacy team-member CRUD endpoint that happens to leak the `pin` field as a side effect of `select('*')`.

## Fix

Gated both `GET` handlers on `requirePermission('team.view')`, matching the sibling `/api/cleaners` route (which was already correctly gated) and the file's own POST/PUT/DELETE. Removed the now-unused `getTenantForRequest` import from both files (kept `AuthError`, still used in each file's try/catch).

Files:
- `platform/src/app/api/team/route.ts`
- `platform/src/app/api/team/[id]/route.ts`

## Verification

- All 4 built-in roles (`owner`, `admin`, `manager`, `staff`) already have `team.view` by default per `rbac.ts` — this fix does not change behavior for any standard-role dashboard consumer (`dashboard-map.tsx`, `CalendarBoard.tsx`, `BookingsAdmin.tsx`, `schedules/page.tsx`, `dashboard/team/[id]/page.tsx`, etc.). It only closes the gap for a role that's had `team.view` revoked via RBAC override.
- Checked `getTenantForRequest()` — it already requires an authenticated operator/admin session (Clerk cookie, admin PIN token, or signed tenant header token) in every code path; there was no truly-anonymous access pre-fix. The legacy `wash-and-fold-hoboken/nyc` per-tenant clone pages that call `/api/team/${token}` (`(app)/team/[token]/page.tsx`) route through this same global handler via middleware's custom-domain rewrite, but since that handler already required an authenticated session, this fix doesn't newly break that flow — it was already gated on session presence, just not on the `team.view` permission specifically.
- New `route.permission-gate.test.ts` in both `team/` and `team/[id]/`, mutation-verified: `git stash`'d the fix, confirmed both new tests go RED (200 instead of 403), restored, confirmed GREEN.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 286/287 files, 1291/1295 tests pass. The 1 failing test (`cron/tenant-health/status-coverage-divergence.test.ts`) is a pre-existing self-documented "RED until fixed" invariant test, unrelated to this change (flagged repeatedly by W4 earlier this session).

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
