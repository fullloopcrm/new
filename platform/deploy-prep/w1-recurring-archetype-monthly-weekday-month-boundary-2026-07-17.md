# Recurring archetype depth + fresh-ground — monthly_weekday month-boundary drift (fixed) + a residual doc-accuracy nit (not fixed)

Scope: 00:54 queue items (1) archetype depth and (2) fresh-ground hunting.

## Fixed this pass: `monthly_weekday` 5th-occurrence anchor could drift into the wrong month

`generateRecurringDates`'s `monthly_weekday` case (`src/lib/recurring.ts`) searched
day-by-day for the nth occurrence of a weekday with **no month boundary** on the
search. For a schedule anchored on a month's 5th occurrence of a weekday (e.g. "5th
Friday of May"), any later target month that only has 4 occurrences of that weekday
(most months — only 4-5 months a year have a 5th occurrence of any given weekday)
made the day-by-day count keep advancing past that month's end until it accumulated
5 occurrences total, landing the computed visit in the **following** month instead
of resolving within the intended one.

This function backs both initial batch generation (admin recurring-schedules POST,
sale-to-recurring, client recurring signup) and the cron refill path
(`nextOccurrenceDates`, `cron/generate-recurring`) — same switch case, so the bug
hit every writer that ever computes a `monthly_weekday` occurrence past the anchor
month.

Fixed by bounding the occurrence search to the target month and falling back to
that month's last occurrence when it has fewer than `weekOfMonth`. Verified against
`cron/generate-recurring/route.ts` — it passes `schedule.day_of_week` and the last
real occurrence as the anchor separately, so the fix's month-bounded recompute
integrates cleanly with the real call site. Regression test added (May 5th-Friday
anchor → June has no 5th Friday, falls back to June's last Friday → July resolves
back to its real 5th Friday). Full suite 485/485 files, 2805/2806 passed (1
pre-existing expected-fail), 0 regressions. Commit `f2d15a9a`.

## Fresh-ground sweep: re-checked every remaining `recurring_type`/`recurringType` read+write site

Grepped every file under `src/app` and `src/lib` referencing `recurring_type` /
`recurringType` / `RecurringType` (37 files) that hadn't already been touched by
this session's prior fixes (client/book, portal/bookings, CSV import wizard,
import-staging, BookingsAdmin.tsx, dashboard calendar badge, client health/LTV
dashboard, Yinez/Selena create_booking × 4 files, quotes routes). Confirmed clean:

- `src/app/api/dashboard/schedules/import/route.ts` + `src/lib/import-staging.ts` —
  already carry the `'monthly' → 'monthly_date'` normalization from an earlier pass
  this session (self-documented in their own comments); re-verified live, still correct.
- `src/app/api/quotes/route.ts` / `quotes/[id]/route.ts` — validate against the full
  5-value `RecurringType` enum (`weekly/biweekly/triweekly/monthly_date/monthly_weekday`),
  never accept bare `'monthly'`. No gap.
- `src/app/api/clients/enriched/route.ts`, `src/lib/nycmaid/recurring-discount.ts`,
  `src/lib/nycmaid/email-templates.ts`, `src/lib/nycmaid/sms-templates.ts`,
  `src/lib/messaging/sms-cleaning.ts`, `src/app/api/cron/schedule-monitor/route.ts`,
  `src/app/api/admin/campaigns/preview/route.ts`, `src/app/api/admin/ai-chat/route.ts` —
  all read-only consumers of the stored value (booleans / display), nothing to normalize.
- `src/lib/selena-legacy-handlers.ts` — read-only (lookup/reschedule/cancel checks),
  has no `create_booking` write path of its own; not exposed to the sentinel bug class.

## Residual finding, NOT fixed (doc-accuracy nit, not a live bug)

`src/lib/selena/agent.ts`'s `create_booking` tool description (the live Yinez agent)
still tells the model `recurring_type (... weekly/biweekly/monthly for a recurring
cadence)` — bare `'monthly'` is still offered as an example. The 23:57 fix this
session (`a1791f1d`) removed `'one_time'` from this description and its commit
message claims it *also* removed the bare-`'monthly'` example ("agent.ts's tool
description no longer offers ... bare 'monthly' as an example") — checked the
actual diff (`git show a1791f1d -- src/lib/selena/agent.ts`) and that part of the
commit message doesn't match what was actually changed; the word "monthly" is
still there verbatim.

Not a functional bug: `runTool` (`src/lib/selena/tools.ts`) dispatches
`create_booking` to `core.ts`'s `handleCreateBooking`, which already normalizes a
bare `'monthly'` input to `'monthly_date'` (same `a1791f1d` commit) — defense-in-depth
that doesn't depend on this description's wording. The only real cost is that the
model is never told `monthly_weekday` ("every 2nd Tuesday") is expressible at all —
every "monthly" cadence request the model hears gets funneled to a fixed-date
cadence regardless of what the client actually asked for. That's a product/prompt
completeness gap, not a data-integrity bug, so left as a flag rather than a
unilateral prompt change (tool descriptions are load-bearing for live agent
behavior — worth a deliberate wording pass, not a drive-by edit).
