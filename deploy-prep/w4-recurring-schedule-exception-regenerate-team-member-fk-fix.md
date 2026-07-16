# Broad-hunt fix — 20:16 order — W4, 2026-07-15

File-only. Continued into fresh surface: cross-referenced all 501 `route.ts`
files against every prior W4 report to find paths with zero mentions, then
triaged the ~120 hits for the bug classes already fixed repeatedly this
session (IDOR, missing tenant scope, unvalidated FK).

## Found and fixed

`admin/recurring-schedules/[id]/exception` (POST, `type: 'reassign'`) and
`admin/recurring-schedules/[id]/regenerate` (POST) both write a
caller-supplied team-member id (`new_team_member_id` / `team_member_id`)
straight onto `bookings.team_member_id` (and, on the exception route, onto
`recurring_exceptions.new_team_member_id`) with no check that the id
belongs to the caller's own tenant.

This is the exact bug class already found and fixed on two direct siblings
in the same feature:

- **Base route** `admin/recurring-schedules/route.ts` (POST, schedule
  creation) — validates `team_member_id` against `tenant_id` before writing,
  with an inline comment citing the precedent fix `4c0e3635` on the plain
  `schedules` route.
- **`admin/recurring-schedules/[id]/route.ts`** (PUT) — has its own
  dedicated regression test,
  `route.team-member-ownership.test.ts`, for precisely this: "a
  caller-supplied team_member_id/cleaner_id was never checked against the
  caller's own tenant before being attached to the schedule."

The two `[id]/exception` and `[id]/regenerate` routes are the only write
paths in this feature that skipped the check — both require `schedules.edit`
(authenticated tenant staff, not anonymous), but an authenticated caller
could plant a foreign tenant's `team_member_id` UUID onto their own tenant's
bookings, which then resurfaces that other tenant's team member's
name/phone/rate through the `team_members()` joins used elsewhere (job
sessions, finance summary, dashboard) — a cross-tenant PII leak via the same
mechanism, not a new one.

**Fix:** added the identical ownership check used by the base route and the
sibling PUT route — `team_members.select('id').eq('id', <id>).eq('tenant_id',
tenantId).single()`, 404 `Team member not found` if absent — before either
route writes the id anywhere.

## Verification

- `npx tsc --noEmit`: clean.
- Added `exception/route.team-member-ownership.test.ts` and
  `regenerate/route.team-member-ownership.test.ts` (new files, matching the
  existing sibling's naming/style and the shared `fake-supabase` two-tenant
  harness).
- Mutation-verified: `git stash`'d both route fixes, reran — both new
  "rejects a team_member_id belonging to a different tenant" assertions went
  RED (200 instead of 404, row written), confirming they'd have caught the
  pre-fix code; restored the fix, reran — all 10 tests across the 4
  recurring-schedules test files GREEN.
- Full suite: 354/355 files, 1482/1485 tests pass (1 pre-existing expected
  fail — `cron/tenant-health/status-coverage-divergence.test.ts`, a
  deliberately-RED tracked gap, same baseline noted in every prior W4
  report this session).

## Also committed this pass

Found finished-but-uncommitted work already sitting in the tree at session
start: the comhub contact context/notes tenant-scope fix (its own report,
`w4-comhub-contact-context-tenant-scope-fix.md`, was already written and
described the change as done/tsc-clean/tested). Re-verified `tsc --noEmit`
and its two test files (7/7 passing) before committing — no changes made to
the fix itself, just re-checked it was genuinely finished before adding it
to history.

File-only, no push/deploy/DB. Continuing broad-hunt.
