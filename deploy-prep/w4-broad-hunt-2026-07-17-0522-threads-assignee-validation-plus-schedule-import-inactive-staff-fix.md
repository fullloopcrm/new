# W4 broad-hunt — 2026-07-17 05:22 EDT

Queue (05:17 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) close own newly-flagged gap — threads PATCH assignee_id unvalidated
(2) pivot fresh-ground hunting to a genuinely different subsystem
(3) keep gap/fluidity current

## (1) — `PATCH /api/admin/comhub/threads/[id]` assignee_id validation (closed)

Fix matches what the 05:11 report flagged and declined to guess at: when
`assignee_id` is a non-null value in the PATCH body, it must now resolve to
a real `tenant_members` row scoped to the caller's tenant, or the route
returns `400 assignee_id is not a member of this tenant` before the update
runs. `null` (clearing the assignee) still passes through with no lookup.
This route sits behind `requireAdmin()` (platform-staff token), not a
tenant-scoped operator role, so this was a data-integrity fix, not a
cross-tenant security bypass — closing it rather than leaving a garbage/
foreign id assignable.

New test: `threads/[id]/route.assignee-validation.test.ts` (3 cases —
rejects unknown id, accepts a real member, allows null-clear with no
lookup). No prior test file existed for this route.

## (2) — fresh ground: schedule bulk-import missed the inactive-team-member fix

Pivoted off comhub/HR/payroll (now dry across multiple sessions) into
scheduling/dispatch, per the leader's suggestion. Found
`POST /api/dashboard/schedules/import` — the CSV-style bulk import that
brings a new tenant's pre-existing appointments into bookings/
recurring_schedules — resolves `staff_name` against `team_members` by
name with **no `status` filter**.

This is the same bug class closed at 02:17 this session
(`w4-broad-hunt-2026-07-17-0217-inactive-team-member-assignment-write-path-fix.md`),
which hardened exactly 3 write paths: `bookings/[id]` PUT, `schedules`
POST, and `jobs/[id]/sessions` POST. The import route is a 4th path that
wasn't in scope of that sweep (it's a rarer bulk-onboarding endpoint, not
one of the ~6 UI dropdowns or 3 write paths audited then) — an inactive/
terminated staff member's name in an import CSV would still resolve to
their id and land on the newly created bookings/recurring schedules.

Fix: excluded `status === 'inactive'` team_members from the name-match map
when building `staffByName`, so an inactive name now behaves exactly like
any other unmatched staff name already does in this route today — the row
imports with `team_member_id: null` (unassigned) rather than erroring or
silently binding to the inactive id. This matches the route's existing
"never guess, report unmatched" philosophy (stated in its own header
comment) better than a hard 400 would, since staff assignment on this
route was already best-effort/optional (unlike the 3 routes fixed at
02:17, which have `team_member_id` as a required field on the request).

New test: `schedules/import/route.inactive-team-member.test.ts` (2 cases —
inactive-named staffer imports as unassigned; active-named staffer still
resolves normally). No prior test file existed for this route.

Rest of scheduling/dispatch spot-checked clean in this pass: `schedule/
calendar` (permission-gated, tenant-scoped read), `schedules/[id]/pause`
(ownership check present). Did not deep-audit `service-area`,
`service-types`, `domain-notes`, `sidebar-counts` — read them for shape
only, all tenant-scoped correctly, no obvious gaps, not exhaustively
tested.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched
  files.
- New tests only (not full suite this pass): both new test files run
  green — 3/3 (threads assignee) + 2/2 (schedule import inactive-staff).
- No push, no deploy, no DB write. Two file diffs:
  `src/app/api/admin/comhub/threads/[id]/route.ts`,
  `src/app/api/dashboard/schedules/import/route.ts`, plus their two new
  test files.

## Gap/fluidity — 1 closed, 0 new opened this pass, all previously carried items unchanged

- **CLOSED**: `PATCH /api/admin/comhub/threads/[id]` assignee_id now
  validated against `tenant_members` for the caller's tenant.
- All other carried items unchanged from the 05:11 report: `voice/cleanup`
  ops-risk flag (dead code, never force-hangs-up Telnyx — still open,
  product/ops question for Jeff); `fake-supabase.ts` no support for
  PostgREST embedded-relation filters (blocks mutation-testing 3
  ledger-report call sites); `admin/cleanup-test-bookings` hardcoded-name
  hard-delete flagged for Jeff, not fixed (product decision); partial-
  refund operational treatment; invoice-linked refund status/
  amount_paid_cents sync; live-DB second-payment ledger-gap audit; crews
  `setMembers()` status-check question; `activate-tenant.ts`
  fragmentation; client-side team-member dropdowns still unfiltered by
  status (6 components, noted 02:17 — server-side guard is the load-
  bearing fix, UI polish left open).
