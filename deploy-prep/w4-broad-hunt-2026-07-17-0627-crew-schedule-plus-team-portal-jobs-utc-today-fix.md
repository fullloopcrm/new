# W4 broad-hunt — 2026-07-17 06:27 EDT

Queue (06:27 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

One finding covers both (1) and (2) — same naive-ET/true-UTC bug class this
session has hardened repeatedly (cron/schedule-monitor, cron/confirmations),
found fresh in two field-staff-facing routes never touched this session.

## (1)+(2) — Two team-portal routes compared true-UTC "now" against naive-ET `start_time`

`bookings.start_time`/`end_time` are `TIMESTAMP` (no tz) columns — confirmed
against `supabase/schema.sql` — storing exactly what was typed in
(`client/book`'s `startTime = \`${date}T${hour}:${minute}:00\`` has no `Z`,
no offset). Both routes below built their day boundary against the SERVER's
clock instead of ET, which on Vercel is UTC — running a full calendar day
ahead of ET for the ~4-5h evening window (8pm–midnight ET).

### `team-portal/crew/schedule` (manager's crew overview, `schedule.view_crew`)

Built the 14-day lower bound via `now.toISOString()` (true UTC) compared as
text against naive-ET `start_time`. During the evening window this pushed
the lower bound hours into the future relative to real ET "now", silently
dropping a crew member's imminent jobs from the manager's own schedule view
for those hours, every evening.

Fixed by formatting `now`/`end` as naive-ET wall-clock strings (`sv-SE`
locale trick: `toLocaleString('sv-SE', {timeZone:'America/New_York'})` →
`"YYYY-MM-DD HH:mm:ss"`, `.replace(' ', 'T')` → matches the naive format
actually stored).

New test: `route.today-boundary-utc-vs-et.test.ts` — fake clock at
2026-01-06T00:30:00Z (7:30pm EST Jan 5), one job at 9pm ET the same evening;
asserts it's still returned. Mutation-verified (`git apply -R`): reverted,
the job vanished from the response — right failure — restored, green.

### `team-portal/jobs` (the field worker's OWN jobs screen — higher-traffic than the manager view above)

Same bug, worse blast radius — this is the actual home screen a cleaner
opens to see today's remaining jobs, the open-claim pool, and their upcoming
schedule. All three GET modes shared one `today.setHours(0,0,0,0)` boundary
built off the server's local calendar:

- **Default (today's jobs)**: `.gte(start_time, today.toISOString())` /
  `.lt(start_time, tomorrow.toISOString())` — during the evening window,
  `today` had already rolled to tomorrow's UTC midnight while it was still
  evening in ET. A cleaner opening the app at 7-11pm ET to check their
  remaining jobs for the night got an **empty list**, even with real jobs
  still ahead of them.
- **`?available=true`** (open-claim pool): same lower bound — unclaimed jobs
  later tonight vanished from the pool a worker could otherwise pick up.
- **`?upcoming=true`** (next-14-days list): same class on both bounds, lower
  severity (a multi-day window absorbs a few hours of drift better than a
  single-day one, but still wrong on the exact edges).

Fixed by porting the exact pattern already established in
`cron/schedule-monitor` this session: `toLocaleDateString('en-CA',
{timeZone:'America/New_York'})` for the calendar day, then pure
`Date.UTC(y, m-1, d+N)` arithmetic for `tomorrow`/`futureEnd` so DST/server-tz
dependency can't creep back in through date-math.

New test: `route.today-boundary-utc-vs-et.test.ts` — same fake clock, one
job assigned to the caller at 9pm ET and one unclaimed job at 9:30pm ET;
asserts both the default-mode list and the `?available=true` pool still
return them. Mutation-verified: reverted, both assertions failed with an
empty list — right failure — restored, green.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched files.
- Scoped runs: `team-portal/crew/schedule` — 2/2 pass. `team-portal/jobs` —
  5 files/29/29 pass.
- Full suite: `npx vitest run` — 496/498 files, 1955/1959 tests, 2 failures,
  both pre-existing/unrelated: (a) `cron/tenant-health/status-coverage-
  divergence.test.ts`, the same explicitly-named "RED until fixed" Fortress
  placeholder every prior report this session has hit; (b) `cron/generate-
  recurring/route.duplicate-occurrence-race.test.ts` — re-confirmed
  genuinely flaky under the full parallel run (failed once, then passed 3/3
  standalone re-runs in a row), same file/same flake noted in the 06:07 and
  06:27 prior reports, not touched this pass, not a regression.
- No push, no deploy, no DB write. 2 commits, 4 files (2 source, 2 test).

## Gap/fluidity — 2 closed this pass, 2 new same-class items opened, all prior carried items unchanged

- **CLOSED**: `team-portal/crew/schedule`'s 14-day lower bound now compares
  naive-ET "now" against naive-ET `start_time` instead of true-UTC "now".
- **CLOSED**: `team-portal/jobs`'s 3 GET modes (default/`available`/
  `upcoming`) now all use the ET-calendar-day boundary pattern.
- **NEW, NOT FIXED**: `admin/calendar` (month-view widget) builds `from`/`to`
  via `new Date(now.getFullYear(), now.getMonth(), 1).toISOString()` — same
  server-local-vs-ET class, but an operator-facing month display, not a
  scheduling/money-critical path; boundary drift only misplaces the
  first/last day's bookings across the month seam. Flagged for next
  scheduling/dispatch-depth pass, not fixed here to avoid diluting this
  report with a much lower-severity instance.
- **NEW, NOT FIXED**: `bookings/stats`'s "this week" widget
  (`weekEnd`/`monthStart` via local `Date` getters + `now.toISOString()`
  lower bound) — same class, same low-severity operator-dashboard-widget
  reasoning as above. Flagged, not fixed.
- All other carried items unchanged: `[id]/pause/route.ts` (recurring-
  schedules) confirmed dead code; `voice/cleanup` ops-risk flag (dead code,
  open, product/ops question for Jeff); `fake-supabase.ts` no PostgREST
  embedded-relation-filter support; `admin/cleanup-test-bookings` hardcoded-
  name hard-delete flagged for Jeff, not fixed; partial-refund operational
  treatment; invoice-linked refund status/amount_paid_cents sync; live-DB
  second-payment ledger-gap audit; `activate-tenant.ts` fragmentation
  (432-line file, noted repeatedly, not a bug); client-side team-member
  dropdowns still unfiltered by status (6 components); `team-portal/photo-
  upload` route explicitly PROPOSED/unwired (companion migration not
  applied — safe to leave); `cron/confirmations`'s 3-attempt escalation
  counts attempts across all assignees, not per-current-assignee (cosmetic,
  fires one attempt early after a reassign); `cron/schedule-monitor`'s
  NYC-Maid `nowT.toISOString()` block still needs the cross-branch merge
  with `e380a403` from another worker's branch when branches come together.
