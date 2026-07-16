# W4 broad-hunt — 2026-07-16 09:51 order

## Finding: sales-applications approve/delete gated on team.view instead of team.edit

`PUT`/`DELETE /api/sales-applications` (approve/reject/remove a commission
sales-partner application) required only `team.view`, while the two sibling
routes that hold the identical class of applicant PII and perform the
identical status-change/delete action — `/api/team-applications` and
`/api/management-applications` — both correctly require `team.edit` (the
latter has an explicit comment: "matches the identical sibling ... gated the
same way").

Per `src/lib/rbac.ts`, `manager` and `staff` roles both have `team.view` by
default but NOT `team.edit` — they're meant to be read-only on team/HR
matters. Because of the wrong permission string, a manager or staff-role
tenant member (view-only by design) could approve, reject, or delete sales
applications — a real write action that provisions a commission-based sales
partner and triggers admin notifications, not something a view-only role
should be able to do.

## Fix

`src/app/api/sales-applications/route.ts`: changed `PUT` and `DELETE` from
`requirePermission('team.view')` to `requirePermission('team.edit')`,
matching the sibling routes. `GET` (list) correctly stays on `team.view`.

## Verification

- New regression test `route.permission-gate.test.ts` (4 tests): staff
  403s on approve, manager (has team.view but not team.edit) 403s on
  approve, staff 403s on delete, admin (has team.edit) succeeds on both.
- Mutation-verified: stashed the route.ts change alone and reran — 3 of 4
  tests failed as expected (staff/manager could approve/delete pre-fix),
  confirming the test actually catches the bug. Restored the fix afterward.
- `npx tsc --noEmit --pretty false`: clean except the one pre-existing,
  unrelated failure in `bookings/broadcast/route.xss.test.ts` (present
  before this change too, already flagged by other workers this session).
- `npx vitest run src/app/api/sales-applications/`: 2 files, 6/6 tests pass.

## Note on git stash (no data lost, but flagging for transparency)

While mutation-testing, a `git stash push -- <tracked-file> <untracked-file>`
failed outright (pathspec doesn't match untracked files without `-u`), and
the chained `git stash pop` that followed it then popped the wrong,
pre-existing stash (`stash@{0}`, labeled "Jeff's order 2026-07-09,
other-session WIP" — not mine). That pop **failed** (blocked by untracked
file conflicts) before applying anything, so nothing was overwritten;
`git stash list` still shows all 3 pre-existing stash entries intact and
untouched. My own route.ts fix was verified intact via `git diff --stat`
immediately after. No cleanup action taken — flagging only for visibility.

File-only, no push/deploy/DB.
