# W4 broad-hunt: ported unmerged RBAC-gate fixes (crews/bookings/quotes/finance/settings)

Refilling per LEADER order 01:18 ("continuing broad-hunt, fresh area, file-only").
Excluded per standing instruction: referrers, referral-commissions, team-PIN routes.

## Background

Reviewed `src/app/api/crews/route.ts` and found POST/PATCH/DELETE called only
`getTenantForRequest()` — no `requirePermission()` check at all. Any
authenticated tenant member, including the lowest-privilege `staff` role
(which has zero crew-related permission by default), could create, rename,
delete, or re-staff any crew.

Ran `git log --all --oneline -- src/app/api/crews/route.ts` to check for
drift (same technique that found the finance FK-injection family last
session) and found sibling-branch commit `120dd9ff` — "gate
crews/quotes/recurring-expenses/settings.services on RBAC + lock down
journal-entry RPC grant" — already fixes this exact gap plus 6 more routes
with the same pattern. Confirmed `120dd9ff` is **not** an ancestor of HEAD on
p1-w4 (`git merge-base --is-ancestor` returned false).

## Ported (7 files, RBAC gate added, matching sibling branch exactly)

All previously called `getTenantForRequest()` directly with no permission
check; all now call `requirePermission(<perm>)` first:

| Route | Method(s) | Permission |
|---|---|---|
| `crews/route.ts` | GET / POST / PATCH / DELETE | `schedules.view` / `schedules.create` / `schedules.edit` / `schedules.edit` |
| `bookings/[id]/reset/route.ts` | POST | `bookings.edit` |
| `bookings/[id]/team/route.ts` | GET / PUT | `bookings.view` / `bookings.edit` |
| `quote-templates/route.ts` | GET / POST | `sales.view` / `sales.edit` |
| `recurring-expenses/route.ts` | GET / POST | `finance.view` / `finance.expenses` |
| `recurring-expenses/[id]/route.ts` | PATCH / DELETE | `finance.expenses` |
| `settings/services/[id]/route.ts` | PUT / DELETE | `settings.edit` |

`import-clients`, `quote-templates`'s sibling `quotes/*` routes,
`quotes/[id]/convert(-to-job)`, and `quotes/[id]/send` — also touched by
`120dd9ff` — were checked and are **already gated** on this branch (confirmed
by reading current file content); no change needed there.

## Test fallout fixed

Two existing tests mocked `getTenantForRequest` to return `{ tenantId }`
with no `role` field:
- `crews/crews-authz.isolation.test.ts`
- `bookings/[id]/team/route.client-scope.test.ts`

Once the routes call `requirePermission()`, `hasPermission(undefined, ...)`
resolves false for every permission → every request 403s → both tests would
have failed. Added `role: 'owner'` to both mocks (mirrors the sibling
branch's own fix to its `crews/route.test.ts`). Verified both still pass and
still prove what they were written to prove (R-1 cross-tenant crew_members
guard, FK-injection guard on booking team assignment).

## New witness tests (permission-gate coverage)

Added `route.permission-gate.test.ts` next to each of the 6 routes that had
no existing permission-boundary test (`crews`, `bookings/[id]/reset`,
`quote-templates`, `recurring-expenses`, `recurring-expenses/[id]`,
`settings/services/[id]`). Each proves: `staff` (or whichever role lacks the
new permission) gets 403 with the underlying row untouched, and a role that
does have the permission succeeds. Followed the existing
`bookings/[id]/payment/route.permission-gate.test.ts` convention on this
branch.

Note: `staff` already has `schedules.view` and `sales.view` by default, so
the crews-GET and quote-templates-GET tests assert **200** for staff (only
the create/edit/delete actions are 403'd) — verified against `rbac.ts`
`ROLE_PERMISSIONS.staff` before writing the assertions, not guessed.

## Checked, not a gap — already covered

`120dd9ff` also revokes the `authenticated`-role EXECUTE grant on
`post_journal_entry` (SECURITY DEFINER RPC, tenant_id passed as a plain arg,
no caller check — any authenticated user could otherwise forge journal
entries into another tenant's books). p1-w4 doesn't have a
`064_unique_journal_entries.sql` file at all, but its own
`2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql` already contains
the identical `REVOKE ... FROM authenticated/PUBLIC; GRANT ... TO
service_role` fix, staged as `_PROPOSED` (not yet run — awaiting the
leader/Jeff DDL-approval step per standing rules). No action taken; flagging
only so it isn't mistaken for an open gap.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` on every touched/added test file (17 tests across 8
  files: crews ×2, bookings/[id]/reset, bookings/[id]/team ×2,
  quote-templates, recurring-expenses ×2, settings/services/[id]) — all
  pass.
- File-only: no DB writes, no migrations run, no push/deploy.
