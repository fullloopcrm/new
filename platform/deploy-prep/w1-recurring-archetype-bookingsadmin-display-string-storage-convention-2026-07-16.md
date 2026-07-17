# Gap: BookingsAdmin.tsx stores a human display string in bookings.recurring_type, not the shared enum key

Date: 2026-07-16, W1

## What's true today

Every recurring-schedule creation/edit path in the app (admin/recurring-schedules,
dashboard/schedules, client/recurring, CSV import, sale-to-recurring.ts, the quote
builder) persists `recurring_type` as the plain `RecurringType` enum key from
`lib/recurring.ts`: `weekly` / `biweekly` / `triweekly` / `monthly_date` /
`monthly_weekday` / `daily` / `custom`.

`src/app/dashboard/bookings/BookingsAdmin.tsx` — the primary admin/operator booking
screen — does not. Its "repeat" feature computes
`recurringType = getRecurringDisplayName(form.repeat_type, form.start_date)`
(`dashboard/bookings/_recurring.ts`) and writes **that human label** straight into
`recurring_type` on every booking it creates/edits with repeat enabled (call sites:
BookingsAdmin.tsx:839, 862, 914, 970, 1012, 1039, 1068). So a repeat booking made
through this screen gets `recurring_type` values like `"Weekly"`, `"Bi-weekly"`,
`"Monthly"`, or — for the monthly-on-the-Nth-weekday pattern — `"1st Mon"` / `"3rd
Fri"`, never the enum key. The file has to `reverseRecurringType()` (line ~1203) to
map the stored display string back to a form value when re-editing, which only exists
because of this convention split — no other part of the codebase needs a reverse-map.

This is a genuinely different, self-consistent local sub-system (its own
`generateRecurringDates`/`getRecurringDisplayName`/`getIntervalDays` in
`_recurring.ts`, forked again per-tenant in `nyc-mobile-salon`, `wash-and-fold-hoboken`,
`wash-and-fold-nyc` — same known per-tenant-clone debt platform/CLAUDE.md already
flags). It does not create a `recurring_schedules` row, so `cron/generate-recurring`
never continues these bookings past what BookingsAdmin.tsx itself inserts up front —
a narrower version of the already-documented "no manual regenerate from this surface"
gap.

## Confirmed real (not theoretical) consequence, fixed narrowly this round (b835afa7)

`recurringDiscountPct()` (checkout discount) lowercases its input, so `"Weekly"` /
`"Bi-weekly"` / `"Monthly"` happened to still resolve to the right tier by accident.
The monthly-weekday shape (`"1st Mon"`) did not match anything and silently returned
0% instead of the 10% every other monthly-tier booking gets — fixed with a narrow
regex addition, not by touching the storage convention.

## Why not fixed at the root this round

Swapping BookingsAdmin.tsx's write paths to store the real enum key would be the
"correct" fix, but the SAME file reads `recurring_type` back as a ready-to-render
label in multiple places assuming it's already human-readable (badges at lines 1738,
1891, 1954-1955, 2406, plus the `reverseRecurringType()` edit-form round-trip) — all
of those would need to route through a display-formatter in the same pass, or the
admin screen's own UI breaks. That's a real, scoped refactor (one file family, but
touches every read+write site in it), not a one-line patch — leaving it for
leader/Jeff to prioritize rather than guessing at the blast radius here.

## FIXED this round (commit 8a6eeedc): raw-enum leaking to customers

Unrelated root cause, same symptom class (a recurring-type string reaching a human
without formatting) — the *opposite* direction: `booking.recurring_type` values that
ARE the correct enum key (`monthly_date`, `monthly_weekday`, `triweekly`) were
rendering **raw** in several customer-facing surfaces instead of a label:
- `infoRow('Schedule', booking.recurring_type)` in the confirmation email — 4 copies:
  `lib/nycmaid/email-templates.ts:283`, `app/site/nyc-mobile-salon/_lib/email-templates.ts:169`,
  `app/site/wash-and-fold-hoboken/_lib/email-templates.ts:169`,
  `app/site/wash-and-fold-nyc/_lib/email-templates.ts:170`.
- `{booking.recurring_type}` (only `className="capitalize"`, which does nothing for
  an underscore) in the client portal/dashboard "Schedule" row — 5 copies:
  `app/portal/page.tsx:802`, `app/site/wash-and-fold-hoboken/(app)/book/dashboard/page.tsx:607`,
  `app/site/the-florida-maid/clients/dashboard/page.tsx:607`,
  `app/site/book/dashboard/page.tsx:618`, `app/site/wash-and-fold-nyc/(app)/book/dashboard/page.tsx:607`.

A monthly client would have seen "Schedule: monthly_date" in their confirmation email.
Fixed by adding `formatRecurringLabel()` to `lib/recurring.ts` (falls back to the raw
value, never blank) plus a `monthly_weekday` case in `getRecurringDisplayName` (it only
had `monthly_day`, BookingsAdmin.tsx's own repeat_type convention, not the real
persisted enum value — same drift class documented above, just the opposite
direction), and wiring it into all 9 call sites. tsc clean, full suite green
(480/480 -> 480/480 files, +4 tests), mutation-verified (git diff/apply per the
established convention).

Also fixed a 10th same-symptom instance found alongside this one:
`CalendarBoard.tsx:639` (operator-facing admin calendar side-panel badge) rendered
`panelBooking.recurring_type` raw too — same one-line `formatRecurringLabel` fix,
bundled into the same commit since it's the identical call shape in the same
investigation.

## Still open (not built) — leader/Jeff to prioritize

BookingsAdmin.tsx storage-convention migration (bigger, touches one file family's
read+write sites) — store the enum key, format for display at every read site.
Unlike the customer-facing fix above, this one's blast radius is real (many read
call sites in the same file assume `recurring_type` is already a label) and hasn't
been scoped/estimated yet.
