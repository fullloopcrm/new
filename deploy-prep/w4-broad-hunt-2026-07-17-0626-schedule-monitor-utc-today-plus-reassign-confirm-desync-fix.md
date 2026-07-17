# W4 broad-hunt — 2026-07-17 06:26 EDT

Queue (06:08 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

## (1) — `cron/schedule-monitor`'s "today" boundary read the server's UTC calendar instead of ET

Pivoted off the `'confirmed'`-status-filter vein (exhausted across several
features this session and last) onto the naive-ET/true-UTC bug class
instead — cross-checked via `git log --all` against the other in-flight
worker branches before touching anything, since this class has had heavy,
careful coverage already.

`cron/schedule-monitor` (hourly, feeds the operator "schedule issues"
dashboard — time conflicts, duplicate-client, day-off, zone mismatch,
no-car, unassigned, plus NYC-Maid-specific no-show/stuck-pending/payment-
overdue) built `todayStr` via `new Date().getFullYear()/getMonth()/getDate()`
— local getters that read the server's calendar (UTC on Vercel), not ET.
`bookings.start_time`/`end_time` are stored naive-ET (no tz, literally what
was typed in). During the ~4-5h evening window where UTC has already rolled
to tomorrow's date (8pm–midnight ET), `todayStr` showed tomorrow, so:

- The `.gte('start_time', todayStr + 'T00:00:00')` lower bound on the main
  bookings query silently excluded the rest of today's real ET bookings from
  **every** issue check the cron runs, for that whole window, every day.
- The self-healing reconcile (`i.date < todayStr`) could auto-resolve
  still-open, still-valid issues dated today, since "today" < "tomorrow's
  todayStr" looked true.

Fixed `todayStr` via `toLocaleDateString('en-CA', {timeZone:
'America/New_York'})`, and replaced the `endDate`/`toDateStr` real-Date
`.setDate()` arithmetic for the 14-day window end with pure calendar-day
arithmetic (`Date.UTC` on the extracted Y/M/D components) so it can't
reintroduce the same server-timezone dependency.

New test: `route.today-boundary-utc-vs-et.test.ts` — fake clock at
2026-01-06T02:00:00Z (9pm ET Jan 5, UTC calendar already Jan 6), one
unassigned booking at 10pm ET the same evening; asserts it's still scanned
and an `unassigned` issue is raised. Mutation-verified (`git apply -R`,
re-applied): reverted, the booking was silently dropped from the query and
no issue fired — right failure — restored, green.

**Deliberately left alone**: this same file's `isNycMaid` block still
compares `end_time` (naive-ET) against `nowT.toISOString()` (true-UTC) for
its own no-show/stuck-pending/payment-overdue checks — the identical bug
class, one level down. Checked `git log --all` first: another worker's
branch already has this exact fix (commit `e380a403`, via a `nowNaiveET()`
helper) that hasn't reached this worktree yet. Re-fixing it here would only
produce a duplicate diff for the leader to reconcile at merge, so left as-is
and noted instead of touched.

## (2) — Fresh ground: team confirmation also went stale across a *reassign*, not just a reschedule

Same feature this session's earlier round hardened against reschedules
(`cron/confirmations`'s "already confirmed" check, scoped to
`confirmed_start_time` matching the booking's current `start_time`) had a
sibling gap: it never checked **which member** the confirmation belonged
to. `team-portal/jobs/reassign` moves a job to a different team member
without touching `booking_id` or `start_time` — so a confirmation logged by
the *previous* assignee was silently treated as still covering the job
after being handed to someone new. The new assignee never got the "please
confirm" SMS (the resend saw `confirmedThisSlot: true` and skipped them
entirely), and since no `team_confirm_request` ever got logged under their
name, the 3-attempt admin no-confirm escalation could never fire for them
either.

Fixed by also requiring the `team_confirmed` notification's
`metadata.team_member_id` to match the booking's *current*
`team_member_id` — that field was already being stamped at confirm time
(`webhooks/telnyx`), so this needed no schema change, just closing the gap
in the read side.

New test: `route.stale-team-confirm-across-reassign.test.ts` — seeds a
`team_confirmed` notification from `tm-old` on a slot now assigned to
`tm-new` (same `start_time`, unchanged); asserts the resend SMS still fires
to `tm-new` and a fresh `team_confirm_request` is logged under their id.
Mutation-verified: reverted, 0 SMS sent instead of 1 (stale confirmation
incorrectly covered the new assignee) — right failure — restored, green.

**Noticed, not fixed**: the 3-attempt escalation's `attemptCount` still
counts *all* `team_confirm_request` rows for the `booking_id` regardless of
which member they were sent to — so a reassign after 2 failed attempts by
the old assignee would only need 1 more attempt by the new one to trigger
the "no confirmation after 3 attempts" admin alert, slightly undercounting
the new assignee's own attempts. Low-value edge case (the alert still fires,
just one attempt earlier than its own message literally claims) — flagging
rather than fixing to avoid diluting this report with a cosmetic-count fix.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched files.
- Scoped runs: `schedule-monitor` new test — 1/1 pass. `cron/confirmations`
  both team-confirm tests (reschedule + reassign) — 2/2 pass.
- Full suite: `npx vitest run` — 494/496 files, 1952/1956 tests, 2 failures,
  both pre-existing and unrelated to this pass's changes: (a)
  `cron/tenant-health/status-coverage-divergence.test.ts`, the same
  explicitly-named "RED until fixed" Fortress-monitoring placeholder every
  prior report this session has hit; (b)
  `cron/generate-recurring/route.duplicate-occurrence-race.test.ts`, which
  failed under the full parallel run but passed clean both standalone and
  scoped to the whole `cron/` directory re-run — a flake under parallel
  load (same as the 06:07 report's exact observation of this same file),
  not touched this pass, not a regression.
- No push, no deploy, no DB write. 2 commits, 4 files (2 source, 2 test).

## Gap/fluidity — 2 closed this pass, 1 new noticed item, all prior carried items unchanged

- **CLOSED**: `cron/schedule-monitor`'s `todayStr` now reads the ET
  calendar day instead of the server's UTC calendar day.
- **CLOSED**: `cron/confirmations`'s team-confirm resend no longer treats a
  confirmation from a since-reassigned-away member as covering the new
  assignee.
- **NEW, NOT FIXED**: `cron/confirmations`'s 3-attempt escalation counts
  `team_confirm_request` attempts across *all* assignees of a booking, not
  per-current-assignee — a reassign after prior failed attempts fires the
  admin alert one attempt sooner than its own "after N attempts" message
  states. Cosmetic/minor, not touched.
- **CROSS-BRANCH NOTE**: `cron/schedule-monitor`'s NYC-Maid no_show/
  stuck_pending/payment_overdue block still has the naive-ET/true-UTC
  `nowT.toISOString()` bug in *this* worktree — already fixed on another
  worker's branch (`e380a403`) but not yet merged here. Leader: this file
  will need a 2-way merge (`todayStr` fix here + `nowNaive`/`dayAgoNaive`
  fix there) when branches come together.
- All other carried items unchanged: `[id]/pause/route.ts` (recurring-
  schedules) confirmed dead code, still left alone; `voice/cleanup`
  ops-risk flag (dead code, still open, product/ops question for Jeff);
  `fake-supabase.ts` no PostgREST embedded-relation-filter support (blocks
  mutation-testing 3 ledger-report call sites); `admin/cleanup-test-
  bookings` hardcoded-name hard-delete flagged for Jeff, not fixed (product
  decision); partial-refund operational treatment; invoice-linked refund
  status/amount_paid_cents sync; live-DB second-payment ledger-gap audit;
  `activate-tenant.ts` fragmentation (432-line file, noted repeatedly, not
  a bug); client-side team-member dropdowns still unfiltered by status (6
  components); `team-portal/photo-upload` route explicitly
  PROPOSED/unwired (companion migration not applied — safe to leave).
