# W4 broad-hunt — 2026-07-17 05:32 EDT

Queue (05:22 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

## (1) — scheduling/dispatch depth: `POST /api/admin/schedule-issues/fix` applied a stale `day_off` fix

`schedule_issues` rows are written once by `cron/schedule-monitor` and never
auto-resolved except by a self-healing sweep gated to NYC Maid tenants only
(`isNycMaid(tenantId)`). For every other tenant, an open issue just sits
until an admin manually acts on it via `PUT` (acknowledge/dismiss/resolve)
or this `fix` route. Nothing anywhere else in the codebase touches
`schedule_issues` when the underlying booking changes.

The `day_off` fix plan ("member flagged unavailable but booked") always
built the same mutation — unassign `team_member_id` and revert
`status` to `'pending'` — using the booking's *current* row for the `from`
values but with **no check that the booking was still in the state that
triggered the issue**. Two concrete stale-issue scenarios, both real given
the no-auto-resolve gap above:

- Booking gets manually reassigned to a different, available team member
  after the issue fires (the actual fix, done outside this route) — the
  `day_off` issue stays open. Days later an admin clicks "Fix" on the
  stale item and it unassigns the *new*, correctly-assigned member and
  reverts the booking to pending, undoing the real fix.
- Booking gets completed (job actually happened) with the issue still
  open — clicking "Fix" reverts a completed job record back to pending
  and strips the team member, corrupting job history (and anything
  downstream reading `status`, e.g. payroll/completion reporting).

Fixed by re-checking the booking's current `status` (must still be
`scheduled`/`pending`/`confirmed`) and `team_member_id` (must still equal
the id the issue flagged) before building the destructive plan; either
mismatch now falls back to an acknowledge-only no-op ("no longer applies")
instead of overwriting. `price_mismatch`, the other fix type, was already
stale-safe (it recomputes the expected price from the booking's current
values and only proposes a change if a mismatch still exists) — this only
affected `day_off`.

New test: `fix/route.stale-day-off.test.ts` (3 cases — applies normally
when still in the flagged state; falls back to ack-only when reassigned to
a new member; falls back to ack-only when completed).

Also verified (no bug, closing a carried question): the "crews `setMembers()`
status-check" item noted in the 05:22 report — `crews/route.ts`'s
`setMembers()` doesn't filter inactive members out of `crew_members` at
write time, but both real consumers (`jobs/[id]/sessions` POST and
`jobs/[id]/sessions/[sessionId]` PATCH) already filter
`tm?.status !== 'inactive'` when expanding a crew into booking assignees,
and both also filter explicit `team_member_id`/`assignee_ids` via
`.neq('status', 'inactive')`. An inactive member sitting in a crew's
membership list is inert — it never reaches a live booking. Not a gap.

## (2) — fresh ground: `team-applications` approve path re-provisions/re-emails on every repeat call

Pivoted off scheduling into recruiting/onboarding (`team_applications`),
untouched this session. Same double-fire class as the campaign-send /
rating-prompt-cron / bookings-PUT-notify fixes earlier this session:

- `PUT /api/team-applications` (single approve) applied
  `{ status: 'approved' }` unconditionally and re-ran
  `provisionApprovedApplicant()` on every call for that id, regardless of
  whether the row was already approved. `provisionApprovedApplicant()`
  itself dedupes the *team_member* row (reuses an existing one by phone,
  mints a PIN only once), but it unconditionally re-sends the "you're
  approved — here's your PIN" email each time it runs. The dashboard's
  approve button (`dashboard/team/page.tsx`) has no disabled/loading state
  during the fetch, so a double-click — or a retried request on a flaky
  connection — re-emails the applicant.
- `POST /api/team-applications/bulk-approve` had the same gap at fleet
  scale: it SELECTs all `status = 'pending'` rows, bulk-UPDATEs them to
  `'approved'` with no re-check of status in the UPDATE's own WHERE
  clause, then provisions/emails every originally-selected id
  unconditionally. A row claimed by a concurrent single-approve in the
  window between this route's SELECT and UPDATE would get re-provisioned/
  re-emailed here too.

Fixed both with an atomic claim, matching the pattern already used
elsewhere this session (`referral_commissions` PUT, `jobs/[id]` PATCH):
single-approve now does `.neq('status', 'approved')` on the UPDATE and
only provisions when a row actually comes back (an already-approved id
returns the current row with no re-provisioning); bulk-approve now
re-checks `.eq('status', 'pending')` on its UPDATE and only provisions the
ids that update actually flipped, so a row already claimed elsewhere is
skipped.

New tests: `route.approve-double-fire.test.ts` (3 cases — first approve
provisions; second approve on the same id is a no-op for provisioning;
non-approval status change still applies with no provisioning) and
`bulk-approve/route.race-guard.test.ts` (2 cases — normal bulk-approve
provisions everyone; a row claimed mid-flight by a concurrent single-
approve is excluded from provisioning).

Rest of the recruiting/referral surface spot-checked clean this pass:
`referral-commissions` (already hardened this session — session-gated
GET, unique-constraint-backed POST dedup, atomic-claim PUT on `paid`),
`waitlist` (permission-gated GET, DB-backed rate limit on POST),
`cleaners/upload` (public path already filters `status = 'active'` on
`memberId` ownership check), `stripe-platform` webhook + its
`createTenantFromLead` idempotency (existing-lead check + unique
constraint fallback), `google-reviews` auto-reply cron (re-queries
`reply is null` each run — a double-run only double-posts an idempotent
`PUT` reply to Google, no money/data risk, left as-is).

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched
  files.
- Full suite: `npx vitest run` — 487 passed / 1 failed file, 1938 passed /
  1 failed / 1 expected-fail / 1 skipped. The 1 failure
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is a
  pre-existing, explicitly-named "RED until fixed" test tracking a known,
  already-flagged Fortress-monitoring gap — unrelated to anything touched
  this pass, not a regression.
- No push, no deploy, no DB write. Three file diffs:
  `src/app/api/admin/schedule-issues/fix/route.ts`,
  `src/app/api/team-applications/route.ts`,
  `src/app/api/team-applications/bulk-approve/route.ts`, plus their three
  new test files.

## Gap/fluidity — 2 closed, 0 new opened this pass

- **CLOSED**: `POST /api/admin/schedule-issues/fix` `day_off` plan now
  re-validates the booking's current status/assignment before applying
  the unassign+revert mutation.
- **CLOSED**: `team_applications` approve path (single + bulk) now claims
  the status transition atomically before provisioning/emailing.
- **RESOLVED-AS-NON-ISSUE**: crews `setMembers()` inactive-member question
  from the 05:22 report — verified both live consumers filter inactive
  members at assignment-expansion time; no fix needed.
- All other carried items unchanged: `voice/cleanup` ops-risk flag (dead
  code, never force-hangs-up Telnyx — still open, product/ops question for
  Jeff); `fake-supabase.ts` no support for PostgREST embedded-relation
  filters (blocks mutation-testing 3 ledger-report call sites); `admin/
  cleanup-test-bookings` hardcoded-name hard-delete flagged for Jeff, not
  fixed (product decision); partial-refund operational treatment;
  invoice-linked refund status/amount_paid_cents sync; live-DB
  second-payment ledger-gap audit; `activate-tenant.ts` fragmentation
  (432-line file, noted repeatedly, not a bug); client-side team-member
  dropdowns still unfiltered by status (6 components, noted 02:17 —
  server-side guard is the load-bearing fix, UI polish left open);
  `team-portal/photo-upload` route explicitly PROPOSED/unwired (companion
  migration not applied — safe to leave, don't link from UI).
