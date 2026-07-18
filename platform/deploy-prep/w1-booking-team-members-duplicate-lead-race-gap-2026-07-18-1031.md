# booking_team_members had no DB backstop for "at most one is_lead per booking" (2026-07-18 10:31)

## Bug
`booking_team_members.is_lead` (migration `050_nycmaid_parity_2026_04_29.sql`)
carries the exact same invariant shape already found and fixed twice this
session for `tenant_domains.is_primary` and `client_properties.is_primary`:
every reader assumes AT MOST ONE `is_lead = true` row per booking, but no DB
constraint has ever enforced it — only a unique `(booking_id, team_member_id)`
composite, which does nothing to stop two DIFFERENT members from both being
marked lead.

Two independent write paths touch this flag with zero coordination between
them:
- `PUT /api/bookings/[id]/team` — deletes ALL `booking_team_members` rows for
  the booking, then inserts a fresh set (at most one `is_lead=true` row BY
  CONSTRUCTION of a single call, but the delete+insert pair is not atomic,
  and the `bookings.team_member_id` write alongside it had **no CAS at all**
  — a blind `.update(...).eq('id', id)`, unlike every other
  `team_member_id` write site fixed earlier this session, including this
  route's own sibling `team-portal/jobs/reassign` (fixed at 09:57 today).
- `POST /api/team-portal/jobs/reassign` — deletes only the `is_lead=true`
  row(s), then upserts a single new one.

Two concurrent calls — either two hits on `PUT .../team` for the same
booking, or one of each route racing on the same booking — can interleave
their delete+insert/upsert pairs so BOTH land an `is_lead=true` row for the
same `booking_id`, pointed at different members. `GET /api/bookings/[id]/team`
and `closeout-summary` both resolve the lead via `.find(r => r.is_lead)`, so
which row "wins" as the displayed/paid lead becomes row-order-dependent —
unspecified, not deliberate.

**Compounding gap, found auditing the two racing routes:** `reassign`'s own
`booking_team_members` upsert error was **never checked** —
`await supabaseAdmin.from('booking_team_members').upsert(...)` with the
result discarded. If that upsert ever failed (for any reason, not just this
race), the booking was left with the just-deleted lead row gone and no
replacement — `closeout-summary` only falls back to `bookings.team_member_id`
when `booking_team_members` has **zero rows for the booking**, not merely
zero `is_lead` rows, so a multi-tech job (lead + extras) in that state would
silently misattribute the lead's tip-share remainder to nobody in the payout
math (`member.is_lead ? tipShareRemainder : 0`). The identical
ignored-upsert-error pattern was also present in
`team-portal/jobs/claim/route.ts` and the `reassign`-type branch of
`admin/recurring-schedules/[id]/exception/route.ts` — same fire-and-forget
write, same silent-failure risk, both reachable independently of the
`PUT .../team` race.

## Fix (file-only, no push/deploy/DB)

**DB backstop — `2026_07_18_booking_team_members_one_lead_per_booking.sql`:**
Same discipline as `2026_07_17_tenant_domains_one_primary_per_tenant.sql` and
`2026_07_18_client_properties_one_primary_per_client.sql`: dedupe-first (for
any booking currently violating the invariant, keep the `is_lead` row whose
`team_member_id` matches the booking's own `bookings.team_member_id` —
the authoritative single-lead column every non-multi-tech write path still
maintains — then lowest `position`, then oldest `created_at`, then lowest
`id`; demote the rest), then `CREATE UNIQUE INDEX
booking_team_members_one_lead_per_booking ON booking_team_members
(booking_id) WHERE is_lead = true`. File-only, not applied — needs Jeff's
approval + the leader to run it.

**`PUT /api/bookings/[id]/team`:**
- CAS on the `bookings.team_member_id` write: reads the booking's current
  `team_member_id` (in parallel with the existing `booking_team_members`
  snapshot) and re-asserts it in the update's own WHERE (`.is(...)` when
  previously unassigned, `.eq(...)` otherwise — mirrors `reassign`'s own
  null-handling). Returns 409 with the real current assignee on a lost race,
  instead of silently clobbering a concurrent winner.
- The `booking_team_members` insert now checks its error: a `23505` from the
  new unique index (a losing racer against another `PUT` or `reassign`)
  returns 409 instead of a raw 500.
- Added a 404 for a nonexistent/wrong-tenant booking (previously relied on
  the CAS-less blind update's `.single()` erroring implicitly).

**`POST /api/team-portal/jobs/reassign`:** captures the upsert's error
(previously discarded) and retries once (delete `is_lead` rows again, then
upsert again) — the collision is a transient leftover from a writer that
just finished, so a single retry clears it; if the retry also fails, logs
loudly via `console.error` rather than swallowing it. The bookings write
already committed by this point (CAS'd), so a lead-sync failure after retry
does not fail the whole request — same best-effort-with-visibility contract
used elsewhere this session (e.g. `job_payments`' reversal call).

**Swept for siblings, found and fixed the same ignored-error shape in:**
- `team-portal/jobs/claim/route.ts` — same capture + retry-once + log
  pattern applied to its own previously-unchecked upsert.
- `admin/recurring-schedules/[id]/exception/route.ts`'s `reassign` branch —
  same fix applied.

`team-portal/jobs/release/route.ts` only deletes (no insert/upsert, no
23505 surface — untouched). The remaining `is_lead`-writing call sites
(`bookings/route.ts`, `bookings/batch/route.ts`, `bookings/batch-update/route.ts`,
`client/book/route.ts`, `cron/generate-recurring/route.ts`,
`admin/recurring-schedules/[id]/regenerate/route.ts`,
`dashboard/schedules/import/route.ts`, `lib/import-staging.ts`,
`lib/selena/tools.ts`) are booking-**creation** paths inserting a single
fresh row for a booking that cannot yet have any `booking_team_members` row —
not touched; the new DB index does not change their behavior since no prior
`is_lead` row can exist to collide with at creation time.

## Tests
- `src/app/api/bookings/[id]/team/route.race.test.ts` (new, 5 tests): CAS
  rejects a concurrent write with 409 and leaves the winner's state intact;
  no-regression normal-case write; `.is()` null-handling for a
  previously-unassigned booking; a simulated 23505 from the insert surfaces
  as 409 not 500; 404 for a nonexistent booking.
- `src/app/api/team-portal/jobs/reassign/route.lead-sync-retry.test.ts` (new,
  3 tests): retries once and succeeds on a transient conflict; logs (doesn't
  swallow) and still returns 200 if the retry also fails; no-regression
  normal case.
- `src/app/api/team-portal/jobs/claim/route.lead-sync-retry.test.ts` (new, 2
  tests): same retry/log coverage for claim.
- `src/app/api/admin/recurring-schedules/[id]/exception/route.lead-sync-retry.test.ts`
  (new, 2 tests): same retry/log coverage for the exception reassign branch.
- RED-confirmed all four: `git stash push` on each touched route file
  individually, re-ran its new test(s) — every test failed for the exact
  predicted reason (409 got 200/500, 404 got 500, empty lead-row assertions,
  "called" assertions on an untouched `console.error` spy). Restored via
  `git stash pop` after each, all green again.
- Full `bookings` + `team-portal` + `admin/recurring-schedules` suites: 52
  files, 212 tests, all passing, 0 regressions.
- Full suite (pre-existing baseline run before these edits): 685 files, 3531
  passed + 1 pre-existing expected-fail, 0 regressions.
- `tsc --noEmit`: clean on every touched/new file. Pre-existing baseline
  noise only (`admin-auth` route-typing quirk, 2 unrelated test-file
  arg-count errors, 2 from the untracked `sunnyside-clean-nyc/site-nav.ts`
  outside this lane) — none newly introduced, none reference the files this
  pass touched.
- `eslint`: 0 warnings on every touched/new file.

## Not touched
- Whether `PUT /api/bookings/[id]/team`'s delete-all+insert-all should become
  a single atomic upsert-and-prune instead of two statements — the CAS +
  unique-index backstop already make the race safe (409 on collision instead
  of silent corruption); a fully atomic rewrite is a larger refactor with no
  correctness gap left to close, flagging as a possible follow-up rather than
  building it now (YAGNI, same discipline as this session's other
  "not every theoretical edge needs its own guard" calls).
- The booking-creation write sites listed above — genuinely out of the new
  index's reach (see "Swept for siblings").
