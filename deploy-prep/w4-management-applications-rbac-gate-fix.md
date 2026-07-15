# W4 — management-applications RBAC gate fix

**Commit:** e66bdf24
**Severity:** HIGH (PII exposure + unauthorized HR-decision tampering)

## Finding

`GET /api/management-applications` and `PUT /api/management-applications` called
`getTenantForRequest()` directly with **zero permission check** — unlike the
identical sibling route `/api/team-applications`, which gates GET on
`team.view` and PUT/DELETE on `team.edit`.

`management_applications` rows hold applicant PII: name, email, phone,
location, resume URL, photo URL, and a selfie video URL, plus free-text
fields (why_this_role, references, notes). Any authenticated tenant member —
including a role that has had `team.view` explicitly revoked via the
tenant's own RBAC override (`selena_config.role_permissions`) — could:

- List every management applicant's full PII via GET (`select('*')`, no
  role check at all).
- Approve or reject applications via PUT (writes `status`/`reviewed_at`)
  with no `team.edit` check, letting e.g. `staff` (view-only by default,
  and lacking `team.edit` entirely per `rbac.ts`) make binding HR decisions.

Same asymmetric-gating bug class as the prior `/api/team` GET fix
(c9b0091c), `/api/crews` fix, and `/api/leads/override` fix (55005aa0) —
POST already existed with a rate limit but no auth requirement was ever
added to the admin-facing GET/PUT siblings.

## Fix

Gated `GET` on `team.view` and `PUT` on `team.edit` via `requirePermission()`,
matching `/api/team-applications` exactly (both routes now share the same
permission scope for the same class of data). `POST` (public applicant
submission from the tenant's careers page, resolved via host header) is
unchanged — it was never meant to require auth.

## Verification

- New `route.permission-gate.test.ts`, 4 tests:
  - GET 403s a role with no permissions; GET 200s for `staff` (has
    `team.view` by default per `rbac.ts`).
  - PUT 403s `manager` (has `team.view` but **not** `team.edit` by
    default) — demonstrates the exact asymmetry the fix closes; PUT 200s
    for `admin` (has `team.edit`).
- Mutation-verified: `git stash`'d the fix, confirmed both the GET-403 and
  PUT-403 assertions went RED (200 instead of 403) against the pre-fix
  code, restored, GREEN again.
- `npx tsc --noEmit`: clean.
- Full suite: 288/289 files, 1297/1301 tests pass. The 1 failing test
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is a
  pre-existing, self-documented RED-until-fixed invariant test unrelated
  to this change (flagged repeatedly this session).

File-only. No push/deploy/DB migration. Did not touch
referrers/referral-commissions/team-PIN routes.
