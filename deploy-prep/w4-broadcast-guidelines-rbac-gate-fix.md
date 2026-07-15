# W4 — broadcast-guidelines missing RBAC gate + no TEST_MODE cap

**Commit:** 76f00c7b
**Branch:** p1-w4
**Status:** File-only. Not pushed/deployed. No DB writes.

## Finding

`POST /api/admin/broadcast-guidelines` called `getTenantForRequest()` with
zero permission check. Any authenticated tenant member, including `staff`
(which lacks `team.edit` by default), could trigger an SMS blast to every
active team member. Each text includes that member's own clock-in PIN and a
portal link.

Unlike the analogous mass-broadcast routes already gated this session
(`find-cleaner/send`, `message-applicants/send`), this route has **no
TEST_MODE cap** — it fires for real, to the entire active roster, every
time it's called, with no confirmation step.

## Fix

Gated on `team.edit`, matching `message-applicants/send`'s team-broadcast
permission class.

## Verification

- New `route.permission-gate.test.ts`: staff 403s (asserts zero `notify()`
  calls), admin passes and sends.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 341/342 files, 1440/1444 tests pass. The 1 failing file
  is the pre-existing unrelated `cron/tenant-health` RED test, unchanged by
  this commit.

## Noticed, not fixed (out of scope)

`src/app/dashboard/settings/page.tsx` POSTs to `/api/settings/broadcast-guidelines`,
a path that doesn't exist — the real route is `/api/admin/broadcast-guidelines`.
The Settings UI button that's supposed to trigger this currently 404s. This
is a separate functional bug, unrelated to the RBAC gap, and wasn't fixed
here since it's outside this pass's scope (and doesn't reduce the API-level
exposure — the route is still directly reachable regardless of the UI bug).

## Not touched

referrers/referral-commissions routes (per leader instruction). No DB
migrations, no push, no deploy.
