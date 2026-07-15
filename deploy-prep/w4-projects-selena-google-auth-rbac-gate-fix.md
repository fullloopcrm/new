# W4 — RBAC gate fixes: projects, selena console, google OAuth connect

**Date:** 2026-07-15
**Branch:** p1-w4 (file-only, not pushed)

## Findings

### 1. `GET /api/projects` — asymmetric gating (RBAC-override-only gap)

`GET /api/projects` called `getTenantForRequest()` with zero permission check
while its own sibling `POST` already requires `bookings.create`. `staff` has
`bookings.view` by default, so this is an RBAC-override-only gap: a tenant
that revokes `bookings.view` from a role via its own permission customization
could still list every project (client name, title, dates, stage) through
this route. Gated `GET` on `bookings.view` to match.

### 2. `GET`+`POST /api/selena` and `GET /api/selena/metrics` — client-side-only gate bypass, default-config priv-esc

Both routes called `getTenantForRequest()` with zero permission check, even
though the dashboard nav (`dashboard-shell.tsx`) only shows the "Selena" page
to roles with `settings.view`. `staff` does **not** have `settings.view` by
default (only owner/admin/manager do) — so this was a real default-config
privilege escalation, not just an override gap: any staff member could hit
the API directly and read every SMS booking conversation's transcript
(customer name/phone/address/email), aggregate stats, and the Selena error
log, or reset a stuck conversation (which also fires a real outbound SMS via
Telnyx). Same bug shape as the earlier `GET /api/audit` fix (client-side nav
gate ≠ server-side authorization). Gated all three handlers on `settings.view`
to match the nav.

### 3. `GET /api/google/auth` — OAuth connect-flow hijack (same class as social/connect fixed last cycle)

`GET /api/google/auth` (mints the Google Business Profile OAuth
connect/consent URL and signs the CSRF state binding it to the tenant) called
`getTenantForRequest()` with zero permission check. Identical bug class to
the `social/connect/{facebook,instagram}` fix from the prior cycle: any
authenticated tenant member, including staff, could initiate/hijack the
OAuth connect flow for the tenant's Google Business Profile. Gated on
`settings.integrations`, matching the Facebook/Instagram connect routes
exactly (both use the same `signOAuthState(tenantId)` CSRF-state pattern).

## Verification

- 4 new `route.permission-gate.test.ts` files, 10 new assertions.
- Mutation-verified: reverted all 4 fixed files to their pre-fix (HEAD)
  content via cp-based backup/restore (`/tmp`, not `git stash`, per the
  08:57 process change), reran the 4 new test files — all 5 negative (403)
  assertions went RED against pre-fix code (200/404 instead of 403),
  restored the fixes, reran — all GREEN.
- `npx tsc --noEmit` clean.
- Full suite: 322/323 files, 1391/1395 tests pass (1 pre-existing unrelated
  intentional-RED invariant test — `cron/tenant-health`
  `status-coverage-divergence.test.ts` — flagged repeatedly by other workers
  this session, unchanged baseline). Zero regressions.

## Scope

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/
team-PIN routes (including `GET /api/team`, `GET /api/team/[id]`,
`GET /api/dashboard`, per standing exclusion).
