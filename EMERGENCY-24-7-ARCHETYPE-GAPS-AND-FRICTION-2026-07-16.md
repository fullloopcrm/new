# Emergency/24-7 archetype — missing-feature gaps + UX friction (status roundup)

Source: LEADER 19:16 3-deep queue item (3), W3. Per Jeff's standing 3-track
rule (bugs / missing-features / UX-friction), this rounds up the two named
items plus fresh friction found today, scoped to the plumbing/HVAC/
restoration/tree-service "emergency, same-day, 24/7" archetype this session's
P11.x series has been tracking in `scripts/sim-all-trades.ts`. File-only,
no push/deploy/DB — this is a status report, not new code (one fresh item
below is a genuine, unfixed finding).

## (1) Scheduled-campaign dead end — still open, confirmed

`POST /api/campaigns` no longer silently drops `scheduled_at` (fixed this
session, `2ce9d6a3`) — a campaign can now actually be *created* with a
future send time. But nothing in the codebase ever acts on it: re-grepped
every file under `src/app/api/cron/*` for anything that reads
`campaigns.status === 'scheduled'` and finds none, and
`/api/campaigns/[id]/send` still only accepts `status === 'draft'` for the
manual "Send Now" action. A tenant who sets a schedule date on a campaign
today gets: the date saved, a "Scheduled" tab/counter that can populate, and
then **nothing** — no cron ever flips `scheduled → sending` and dispatches
it. This is a real missing feature, not a bug fix — needs either a new
`cron/campaign-dispatch` route (mirroring the existing `cron/reminders`,
`cron/outreach` pattern) or a product call that scheduling isn't supported
yet and the UI shouldn't offer the date picker until it is.

## (2) HVAC emergency-tier preset — CLOSED, already shipped

This was flagged open in an earlier queue pass; re-checked today and it's
done. `src/lib/industry-presets.ts:336` has `Emergency HVAC` ($175/2hr,
sort_order 5) — landed in commit `d4822042`, matching the pattern already
used by `Emergency Plumbing` and restoration's `Storm Damage`. HVAC's intake
checklist (`stdChecklist` for `hvac`) also already includes an `Emergency`
option. No further action — correcting the queue item's premise rather than
re-doing already-shipped work.

## (3) UX-friction items, emergency/24-7 archetype specifically

**Still open — 24/7 hours has no real settings path (P11.9, unchanged).**
`src/app/dashboard/settings/page.tsx:179-208` — `BUSINESS_HOURS_START_OPTIONS`
still caps at 06:00, `BUSINESS_HOURS_END_OPTIONS` still caps at 22:00hrs
worth of range (checked today, byte-identical to the earlier finding). An
owner running a genuine 24/7 emergency-response business has **no UI path**
to configure it — the only way `business_hours_start/end` ever reached a
true round-the-clock value was P11.0 writing straight to the `tenants` row
via Supabase, bypassing Settings entirely. Compounding: the hours control
lives on the **Scheduling** tab while the paired `emergency_rate`/
`emergency_available` premium lives on the unrelated **Selena** tab's
Services & Pricing section — an owner has to already know both settings
exist and that they're meant to work together. Suggested fix (still not
applied, product/design call): extend both dropdowns to a true 00:00-23:30
range (or add a one-click "24/7" shortcut), and add a single "Emergency /
24-7 Service" toggle that sets the hours and surfaces the rate field inline
instead of two disconnected settings on two tabs.

**New today — zero price/rate transparency in the customer's own booking
confirmation.** Traced what a customer actually receives the moment their
same-day emergency booking is created. `bookingReceivedEmail()`
(`src/lib/email-templates.ts` — the "urgent" variant added by this
session's P11.14 fix, `e1d85e7b`) takes `serviceName`, `dateTime`, and
`isEmergency` (which now correctly changes the tone/copy to acknowledge
urgency) — but **no `price` field at all**. Compare to the sibling
booking-*confirmed* template a few lines up in the same file, which does
carry an optional `price` field. So the very first message a customer gets
after calling in a burst pipe or no-heat emergency tells them their request
was received and sounds appropriately urgent, but never states that
same-day service carries a premium rate or what it costs — they find out
later, on the invoice/payment step, after the job is already done. For an
archetype where the emergency rate is routinely 2-2.5x the routine rate
(`$175/hr` vs `$69-135/hr` across the presets checked in item 2 above), this
is a real chargeback/dispute risk, not just a nicety — the customer accepted
an *urgent job*, not necessarily an *urgent price*. Not fixed — flagging as
a concrete product gap: the booking-received confirmation should either
show the price when `is_emergency` is true, or explicitly say "emergency/
after-hours rate applies" so the surcharge isn't a surprise. Formalized today
as `P11.19` in `scripts/sim-all-trades.ts` (reads `bookingReceivedEmail`'s
type signature directly, then calls the live function with
`isEmergency: true` and greps the rendered HTML for $/price/rate/surcharge/
premium/fee wording — same dual verify-by-source-and-by-call method P11.14
already used). Still not fixed.

## (4) New today — unassigned same-day jobs have no push path to any tech

Fresh ground, distinct from the P11.10/P11.11 owner-notification gaps already
in this report: those are about the *owner* never getting an urgency-aware
alert. This is about the *techs*. P11.12 (prior session) already established
that a same-day-accepted quote's booking lands with `team_member_id` null —
nobody dispatched — and P11.13 found the fallback is the self-claim pool
(`GET /team-portal/jobs?available=true`), a **pull** model: techs have to
open the app and check for new unclaimed jobs themselves. Checked today
whether *anything* proactively pages a tech when an unassigned job appears.
It doesn't. `/api/team-portal/jobs/claim/route.ts` (the claim endpoint
itself) has zero `notify`/SMS calls anywhere in the file — it only processes
a claim a tech already initiated, it never announces new availability. The
one system-wide sweep that even looks for unassigned bookings is the
`schedule-monitor` cron (14-day lookahead) — it does find them
(`type: 'unassigned'`), but only ever at `severity: 'warning'` (same tier as
`stuck_pending`/`payment_overdue`), and the finding is written to
`schedule_issues` for the **owner's** dashboard to display later — itself a
pull surface, and still nothing tech-facing; that cron file also has zero
notify/SMS calls anywhere in it. Net effect: a same-day emergency booking
that lands with no assigned tech (the exact state P11.12 proved this
archetype's automated create path produces) has no push/SMS to any tech
telling them a job is open to claim — the only route to pickup is a tech
voluntarily refreshing the open-jobs screen on their own initiative. For a
genuinely urgent same-day dispatch (burst pipe, no AC with a newborn in the
house) this is a real response-time risk layered on top of the already-
documented P11.10-13 chain, not a duplicate of it. Added as `P11.18` in
`scripts/sim-all-trades.ts` (verified by reading both source files directly,
same "read the source" methodology as P11.8-P11.17 since this session's
worktree has no `.env.local`/Supabase env to run the harness live). Not
fixed — needs a product call on what the push mechanism should be (SMS
blast to all on-call/available techs? A single most-likely-available tech?)
before building it.

## (5) New today — SMS confirmation has the identical price-transparency gap as the email (P11.19)

Same shape of gap as item (3)'s P11.19 finding, different channel: `smsBookingReceived()`
(`src/lib/sms-templates.ts`) takes `is_emergency` and correctly renders
"URGENT request received...We're treating this as a priority" (the P11.14
fix), but its signature has no price/rate field at all, so there is no code
path by which it could ever mention cost. Called live (not mocked):
`is_emergency:true` → `"Acme Plumbing: URGENT request received for Thu, Jul
16 at 8:23 PM. We're treating this as a priority and working to confirm
ASAP."` — no `$`/price/rate/surcharge wording, same as the email. This is
arguably the more consequential of the two gaps: a customer is more likely
to read the SMS than open the email. Formalized today as `P11.20` in
`scripts/sim-all-trades.ts` (tsc clean; verified by reading the signature
and calling the live, DB-free `smsBookingReceived()` function directly —
this worktree still has no `.env.local`/Supabase env to run the full sim
harness, same constraint as P11.8-19). Not fixed — same product call as
P11.19 (show the rate when `is_emergency`, or state "emergency/after-hours
rate applies").

## (6) New today — the primary Bookings admin page has been silently no-oping team-member writes

Diff-method sweep, not archetype-specific but directly touches this
archetype's dispatch chain (P11.10-13, P11.18): `BookingsAdmin.tsx`
(`src/app/dashboard/bookings/`, the main "Bookings" admin page — the single
most-used operator screen in the app) has been reading/writing a `bookings`
table using **wrong field names inherited from an old nycmaid-era naming
scheme** — `cleaner_id`/`cleaner_pay`/`cleaner_paid`/`cleaner_token`/
`suggested_cleaner_id`/`cleaners` (join alias) — none of which are real
columns. Verified via three independent sources: the base `bookings` table
definition (`supabase/schema.sql:134`, columns are `team_member_id`,
`team_pay`, `team_paid`, `worker_token`), an explicit migration comment
(`migrations/2026_05_19_ratings_team_bookings.sql:3`: *"cleaner_id →
team_member_id (fullloop convention)"*), and — the clincher — every OTHER
dashboard page that reads the same API response (calendar's `ProjectsView`/
`KanbanView`/`CalendarBoard`, the main dashboard, `bookings/[id]`,
`schedules`, `books`/payroll, `map-view`, `sales/routes`) correctly uses
`.team_members?.name`. Only `BookingsAdmin.tsx` used the stale names. Real
production impact, all silent (no error, no exception — `pick()`
allowlists on the API side just drop unrecognized keys):
- The primary bookings list showed **every booking's assigned tech as
  "Unassigned"** (`b.cleaners?.name || 'Unassigned'`) regardless of whether
  `team_member_id` was actually set, in 4+ places in the list/card views.
- Opening any existing booking to edit reset the "assigned cleaner" field
  to blank every time (reading `booking.cleaner_id`, always `undefined`).
- Check-in / checkout / closeout's computed technician payout
  (`cleaner_pay`) was **never actually saved** to the booking — the UI
  calculated and displayed it, but the PUT body key didn't match the API's
  `pick()` allowlist (`team_pay`), so it silently no-op'd on every job
  closeout. Payroll-accuracy impact for any tenant using this admin flow.
- The "Team Paid" checkbox in the close-out list (`cleaner_paid`) never
  persisted either — same allowlist miss (`team_paid` is the real, already-
  accepted column).
- "Copy team link" copied a broken URL (`undefined`) — reads
  `cleaner_token` instead of the real `worker_token`.
- The "suggested tech" banner (`suggested_cleaner_id`) could never show —
  real column is `suggested_team_member_id`.
- Team-member assignment was silently dropped on booking **creation** too:
  the default "single booking" create flow (`POST /api/bookings/batch`) and
  the "repeat booking" flow (`POST /api/bookings`) both sent `cleaner_id`;
  neither endpoint recognizes that key, only `team_member_id`.
  Multi-worker "extra crew" assignment on save also silently dropped
  (`/api/bookings/[id]/team` PUT expects `extra_team_member_ids`, was sent
  `extra_cleaner_ids`).

**Fixed** (commit pending push, this session, `p1-w3`) — renamed all of the
above to match the real, already-correct API contracts (no DB migration
needed; the correct columns already existed and are already used correctly
by every sibling page). Two admin routes (`/api/admin/recurring-schedules`
and its `/regenerate` sub-route) already had a `cleaner_id` nycmaid-alias
fallback baked in — left untouched, no bug there. Verification: `tsc
--noEmit` clean (the interface rename forced every static reference through
the type checker — used as the change checklist), full existing suite
328/328 files, 1738/1738 tests, zero regressions (no dedicated test existed
for this component before or after — it's a 2700-line client page with no
render-test harness in this repo; verification here is type-level +
manual cross-reference against every target route's actual accepted field
names, not a rendered/clicked end-to-end test).

**Update, later this session — all three siblings below are now FIXED**
(commit `beb99d6c`, `p1-w3`), on re-inspection none actually needed a
schema/product decision — all three were the identical allowlist-omission
bug hitting real, already-existing columns the caller already sends:
- `cleaner_pay_rate`: `bookings.pay_rate` already exists and was already
  read correctly by `POST /api/bookings/batch`'s row-builder
  (`pay_rate: b.pay_rate || null`) — the caller (BookingsAdmin.tsx) just
  never sent it under that name on the plain create path, and
  `POST /api/bookings`'s `validate()` (the emergency-create path) had no
  `pay_rate` field in its allowlist at all. Added the field to that
  allowlist and renamed both callers' `cleaner_pay_rate` body key to the
  real column name `pay_rate`.
- `POST /api/bookings/batch` team_size/extra-crew: `bookings.team_size` and
  the `booking_team_members` junction table both already exist, and
  `PUT /api/bookings/[id]/team` already implements lead+extras+team_size
  assignment correctly (the edit-save path already calls it). Added
  `team_size` (clamped `[1,8]`, matching that same endpoint's own clamp) to
  the batch row-builder, and wired the create path to call
  `/api/bookings/[id]/team` once per newly-created booking when
  `team_size > 1` — reusing the endpoint wholesale rather than duplicating
  its ownership checks/notifications in the batch route.
- Batch series `service_type`/`recurring_type` drop: both are real
  `bookings` columns (`supabase/schema.sql:141,148`) already sent verbatim
  by `BookingsAdmin.tsx`'s "apply to all future bookings" edit. Added both
  to `BATCH_UPDATE_FIELDS`.

Also fixed in the same pass, same mechanism, found while touching the exact
same `POST /api/bookings/batch` row-builder for `team_size`:
`property_id` and `max_hours` were two MORE real columns the create form
already sends on every batch-create row that the row-builder silently
dropped. Added both, plus a `property_id` ownership check alongside the
existing `client_id`/`team_member_id` FK-injection guards (`client_properties`
is deny-all RLS, so a foreign tenant's property id would otherwise attach
silently). `tsc --noEmit` clean, full suite 328/328 files, 1743/1743 tests
(12 new, one per fixed field plus the property_id FK-injection guard).

## (7) New today — even when a tech IS assigned to an emergency job, nothing ever tells them it's urgent or that a pay premium applies

Fresh ground, distinct from (4)/P11.18 (which is about jobs that never get
assigned to anyone at all). This is the opposite case: an admin (or the
smart-schedule scorer) DOES assign a `team_member_id` to a booking — the
normal, working dispatch path, not the broken one — and traced what the tech
actually receives. `PUT /api/bookings/[id]/route.ts:131-163` detects
`team_member_id` changing and fires `teamSmsTemplates(...).jobAssignment({
start_time, hourly_rate, clients, team_members })` — but neither argument
list nor either template implementation takes `is_emergency` or the tech's
own `pay_rate` at all. Confirmed on both branches `teamSmsTemplates()` can
resolve to:
- `src/lib/messaging/team-sms.ts` `jobAssignment()` (cleaning-industry
  tenants) — signature is `(brand, booking: { start_time, hourly_rate,
  clients, team_members })`; the only thing `hourly_rate` is used for is a
  `$49 → "labor only, bring no supplies"` convention check, never rendered as
  a rate or urgency flag.
- `src/lib/sms-templates.ts` `smsJobAssignment()` (all ~23 non-cleaning
  trade tenants — the plumbing/HVAC/restoration/tree-service archetype this
  report tracks) — signature is `(bizName, booking: { start_time, clients })`
  only; `hourly_rate` isn't even in the type, let alone `is_emergency` or
  `pay_rate`. Body is a flat `"{biz}: New job {date} {time} - {client}."` —
  identical whether the job is a routine Tuesday cleaning or a same-day burst
  pipe at 2x pay.

Checked whether urgency reaches the tech through any OTHER channel and it
doesn't, anywhere: grepped the entire `team-portal` surface (portal pages +
`/api/team-portal/*`) for `is_emergency` — zero matches. The self-claim
open-jobs listing itself, `GET /api/team-portal/jobs?available=true`
(`src/app/api/team-portal/jobs/route.ts:45`), doesn't even `SELECT
is_emergency` from `bookings` — so a tech voluntarily browsing the open-jobs
screen (P11.13's pull-model fallback) has no way to see which open jobs are
urgent even if they wanted to prioritize their own pickup order. Net effect,
combined with (4)/P11.18: **no channel in this codebase — push, pull, or
direct assignment — ever surfaces job urgency or the emergency pay premium
to a tech.** This is the team-facing mirror of items (3)/(5)'s customer-side
price-transparency gap (P11.19/P11.20): same shape of bug (a real,
already-tracked `is_emergency`/pay-premium concept that stops at the
booking record and never reaches the message a person actually reads), just
on the other side of the job. Concrete impact: a tech accepting/working an
assigned same-day emergency job has no signal to treat it as time-critical
(may not reprioritize their day around it) and finds out about any pay
premium only after the fact (payroll/checkout), same "surprise" pattern as
the customer side. Not fixed — same class of product call as P11.19/20:
needs a decision on wording (e.g. prefix "URGENT — " on the SMS and state
the pay rate) before touching the templates, verified by reading
`team-sms.ts`, `sms-templates.ts`, `team-sms-resolver.ts`,
`bookings/[id]/route.ts`, and grepping the full `team-portal` tree directly
(worktree still has no `.env.local`/Supabase env for a live call, same
constraint as P11.8-20).

**Update, later this session — the PULL half is now FIXED (`p1-w3`); the
PUSH half is still open, unchanged.** Of the two channels named above,
direct-assignment SMS (`jobAssignment()`/`smsJobAssignment()`) genuinely
needs a copy/wording decision before touching the templates — left as-is,
still the open product call described above. But the self-claim open-jobs
listing needed no wording decision, only the same mechanical fix as item
(8): `GET /api/team-portal/jobs?available=true` now selects `is_emergency`
and threads it through the masked response (`route.ts`), and
`team/jobs/page.tsx` (the tech-facing open-jobs screen) now renders a 🚨
badge + red ring on any emergency card in the pool. A tech voluntarily
browsing open jobs can now see which ones are urgent and prioritize their
own claim order; a tech who's *pushed* an assignment via SMS still gets no
urgency signal in that message. 2 new tests
(`route.emergency-flag.test.ts`), mutation-verified. `tsc --noEmit` clean,
full suite 329/329 files, 1745/1745 tests, zero regressions.

**Update, later this session — the PUSH half is now FIXED too (`p1-w3`),
closing item (7) completely.** Re-read the "needs a copy/wording decision"
call above and found the decision had already been made elsewhere in this
codebase: `smsUrgentBroadcast()`/`smsUrgentBroadcastES()`
(`src/lib/sms-templates.ts`, the already-shipped find-cleaner broadcast
templates referenced in item (10)) already establish the exact wording —
`"{bizName} URGENT: $X/hr job available..."` bilingual. Ported that same
convention into the two direct-assignment templates instead of opening a
new product decision: `jobAssignment()` (`src/lib/messaging/team-sms.ts`)
and `smsJobAssignment()` (`src/lib/sms-templates.ts`) both now take optional
`is_emergency`/`pay_rate` fields on their booking param and prefix
`"URGENT — "` / `"URGENTE — "` plus a `" Pay: $X/hr."` line when
`is_emergency` is true (omitted when `pay_rate` isn't set, so the prefix
alone still lands even if pay isn't priced yet). Wired at both real call
sites that fire this SMS on a live `team_member_id` assignment: `PUT
/api/bookings/[id]/route.ts` (reassignment — the path item (7) originally
traced) and `POST /api/bookings` (the emergency-create path referenced
throughout items (3)/(5)/(9) — an admin-created same-day booking can already
carry an assigned tech at creation time, which was the same blind spot).
`POST /api/bookings/batch` (recurring/multi-booking series) was left
untouched — verified its row-builder never sets `is_emergency` on a batch
row at all, since that flag is exclusively the single-booking create
dialog's one-time toggle per item (8)'s finding, so there's nothing for the
new wording to key off there; not a gap. 9 new tests across
`team-sms-resolver.test.ts` (both the cleaning-brand and generic/trade
branches) and a new `sms-templates.emergency-rate-wording.test.ts`,
covering: emergency-with-rate, emergency-with-no-rate-on-record (prefix
still fires, rate line omitted), and the routine-job control (byte-identical
to before, no regression for the ~99% non-emergency case). `tsc --noEmit`
clean, full suite 330/330 files, 1754/1754 tests, zero regressions.
Verification method unchanged from the rest of this doc: this worktree still
has no `.env.local`/Supabase env for a live send, so this was confirmed via
the actual unit tests calling the live, DB-free template functions directly
with an emergency-shaped booking and asserting on the real rendered string
(not mocked), same as every P11.x check in `scripts/sim-all-trades.ts`.

## (8) New today — the operator's own admin UI never visually flags an emergency booking either — NOW FIXED

Third and final leg of items (7)'s "who ever finds out this job is
urgent" question, this time for the person actually running the
schedule. `GET /api/bookings` selects `'*'` (`route.ts:43`), so
`is_emergency` is already present on every booking object every
dashboard surface already receives — checked whether anything renders
it. Scanned the primary Bookings admin page (`BookingsAdmin.tsx`) plus
every Calendar view (`CalendarBoard`, `KanbanView`, `ProjectsView`,
`TimelineView`, `CalendarShell`), Schedules, and the Map view for a
read of an *existing* booking's `is_emergency` — as opposed to the
create-dialog's own `createForm.is_emergency` local state, which is
just the one-time toggle at creation time, not a standing marker on
the saved booking. Zero matches anywhere outside that create-form
state. The only place the flag has any visible effect at all is the
create dialog's own red "🚨 Broadcasts to all team - first to claim
gets it" banner — which disappears the instant the booking is saved.
Net effect, combined with (3)/(5)/(7): **no surface in this codebase —
customer confirmation, tech assignment, tech self-claim pool, or the
operator's own Bookings/Calendar/Schedules/Map views — ever visually
distinguishes an emergency job from a routine one once it exists as a
booking row.** Concrete impact: an owner or dispatcher scanning
today's schedule to triage or re-prioritize (the exact workflow this
archetype exists for) has to open each booking individually to find
out which ones are same-day emergencies — there's no color, badge, or
icon to scan for. Not fixed — this one doesn't need a product/copy
call the way (3)/(5)/(7) do (no wording decision required, just a
visual marker), so it's the most mechanically straightforward of the
four to close: add an `is_emergency` badge/highlight to the shared
booking-card renderer(s) in the files above. Formalized today as
`P11.22` in `scripts/sim-all-trades.ts` (verified by reading all 11
source files directly and confirming `GET /api/bookings`'s `select('*')`
already exposes the field; sanity-checked the exact regex/select-star
logic against the real files in a standalone `node -e` run before
committing — same "read the source" methodology as P11.8-21, worktree
still has no `.env.local`/Supabase env for a live render check).

**Update, later this session — FIXED (`p1-w3`).** Added an `is_emergency`
🚨 badge/highlight to every read surface identified above that renders an
*existing* booking (the create-form's own toggle already had one and was
untouched): `BookingsAdmin.tsx`'s main table row (client-name cell) and its
"Pending Approval" panel, `CalendarBoard.tsx`'s FullCalendar event title
prefix + the side-panel status row, `KanbanView.tsx`'s card (badge chip +
a red ring on the card itself so it reads at a glance without opening it),
and `TimelineView.tsx`'s per-day dispatch block (icon + red ring + updated
hover title) — the last of these is explicitly "the daily driver for slot
trades," i.e. the exact triage view item (8) describes an owner/dispatcher
scanning. `ProjectsView.tsx` and the Map view were left untouched: Projects
structurally only ever shows `duration_class in (multiday, project)` jobs,
which this archetype's same-day emergency bookings can't be by definition,
and Map's badge would need a second marker icon/shape (not just a color
swap, since marker color already encodes `status`) — flagging Map as the
one still-open surface rather than rushing a marker change un-verified.
Added `is_emergency?: boolean` to each component's local `Booking`
interface (all four already receive it — `GET /api/bookings` selects `'*'`,
confirmed in the original finding above — this was purely a type+render
gap, no API change needed). `tsc --noEmit` clean. No dedicated render-test
harness exists for any of these four files (same as `BookingsAdmin.tsx`'s
precedent elsewhere in this doc — 2700+/760/169/215-line client pages with
no render-test setup in this repo), so verification is type-level plus
direct re-read of each diff against its surrounding JSX; full existing
suite re-run clean at 328/328 files, 1743/1743 tests, zero regressions
(expected — none of these four files had prior test coverage to regress).

**Update, later this session — Map view is now FIXED too (`p1-w3`), closing
item (8) completely.** The open question left above was a non-color marker
treatment, since marker color already encodes `status`
(`src/app/dashboard/map/map-view.tsx`'s `statusIcon()`). Resolved it the
same way `KanbanView.tsx` did (badge chip + red ring, not a color swap):
`statusIcon()` now takes an `isEmergency` param and, when true, renders the
same status-colored circle with a red `border` + red-tinted `box-shadow`
ring plus a small 🚨 badge overlaid at the marker's corner — status color
and emergency state are both visible at a glance, neither overwrites the
other. `GeocodedBooking` (`map-view.tsx`) and `Booking` (`page.tsx`) both
gained `is_emergency?: boolean | null` (same "already in the `'*'`
response, just not in the local type" pattern as the other three surfaces).
Popup content also gained a `🚨 Emergency` line, and the sidebar Legend got
a one-line explainer (`🚨 Emergency (red ring)`) so the new marker treatment
isn't undocumented on the one page that explains what markers mean.
`ProjectsView.tsx` remains untouched — still structurally excluded per the
original finding (multiday/project jobs only, this archetype's same-day
bookings can't reach it). `tsc --noEmit` clean, full suite 330/330 files,
1754/1754 tests, zero regressions (no render-test harness for this file
either, same precedent as above — verified type-level plus direct re-read
of the diff).

## (9) New today — the actual payment receipt never reaches the client at all; the one template that would show a breakdown is dead code for client delivery

Fresh ground, extending the (3)/(5)/(7)/(8) price-transparency trilogy past
the *booking* stage to the *payment* stage — the moment of financial truth,
after the emergency-rate-inflated card charge has already gone through.
Traced every real caller of `notify({ type: 'payment_received', ... })`:
`src/lib/payment-processor.ts:361`, `src/app/api/webhooks/stripe/route.ts`
(in-app insert only, doesn't even call `notify()`), `src/app/api/admin/
payments/confirm-match/route.ts` (in-app insert only), `src/app/api/email/
monitor/route.ts` (in-app insert only), and `src/app/api/cron/reminders/
route.ts:309` (a "Payment Due Soon" *reminder*, misusing the same type
constant). **Every single one either passes `recipientType: 'admin'`
explicitly or omits it, and `notify()`'s own default is `recipientType =
'admin'`** (`src/lib/notify.ts:78`). Zero call sites anywhere in the
codebase pass `recipientType: 'client'` for this type. Net effect:
`paymentReceiptEmail()` (`src/lib/email-templates.ts:336`) — the one
template in the whole codebase with an actual line-item table (Service /
Amount / Date / Method) — is wired into `notify()`'s switch but is **dead
code for client delivery**; it only ever lands in the tenant's own admin
inbox, addressed to the business, not the customer who paid.

What the client actually gets instead, verified by reading the real
send calls directly: a bare, unformatted SMS — `payment-processor.ts:335`
(`"Payment confirmed — $X received via {method}. Thank you, {name}!"`),
`email/monitor/route.ts:112` (`"Got your {method} payment of $X — thank
you!"`) — a flat dollar total with **zero line-item breakdown, zero mention
of an emergency/after-hours premium**, sent via direct `sendSMS()` calls
that bypass `notify()`/`paymentReceiptEmail()` entirely. Two compounding
gaps on top of the "no breakdown" pattern already established in (3)/(5):
- `payment-processor.ts:328` gates this client SMS on `clientRecord?.phone`
  only — no `sms_consent` check (the sibling team-member SMS four lines up,
  `:309`, does check `sms_consent !== false`). Whether that's intentional
  (payment confirmations may be considered transactional, consent-exempt)
  or an oversight wasn't chased further here — flagging, not asserting a bug.
- If a client has no phone on file at all, they receive **no confirmation
  of any kind** for a payment that already left their card — no SMS (no
  phone to send to), no email (the only email-capable template,
  `paymentReceiptEmail`, never targets them per above).

Combined with (3)/(5)/(7)/(8): for the emergency/24-7 archetype specifically
(routine emergency-rate premium of 2-2.5x per item 2's presets), a customer
who accepted an urgent job with no price shown at booking (P11.19/20) now
also gets no itemized receipt explaining the final charge — the first and
only number they see is a bare total in a text message, with no paper trail
to reference if they dispute it. Not fixed — this is two separable
product/eng calls: (a) should `paymentReceiptEmail` actually reach the
client — needs a `recipientType: 'client'` + `recipientId` wired into at
least the two real payment-confirmation call sites (`payment-processor.ts`,
`webhooks/stripe/route.ts`), and (b) should the emergency premium be called
out as its own line item once it does. Verified by reading
`notify.ts`, `payment-processor.ts`, `webhooks/stripe/route.ts`,
`email-templates.ts`, `confirm-match/route.ts`, `email/monitor/route.ts`,
and `cron/reminders/route.ts` directly (worktree still has no
`.env.local`/Supabase env for a live send, same constraint as P11.8-22).

## (10) New today — a working tech-broadcast dispatch mechanism already exists in the codebase, fully built, and is completely dormant

Fresh ground, and directly closes the open question item (4)/P11.18 left
hanging ("needs a product call on what the push mechanism should be — SMS
blast to all on-call/available techs? A single most-likely-available
tech?"). Went looking for any existing SMS-broadcast machinery anywhere in
the codebase (grepped for `cleaner_id`/`cleaner_` patterns outside the
already-fixed `BookingsAdmin.tsx`/ComHub scope) and found one:
`/api/admin/find-cleaner/{preview,send,recent}` + a full 145-line dashboard
page (`src/app/dashboard/find-cleaner/page.tsx`) that does exactly what
P11.18 asked for — an admin picks a date/time/zone, `preview` returns
eligible team members (filtered by `working_days`/`schedule`/
`unavailable_dates`/`service_zones`/`max_jobs_per_day` via
`src/lib/day-availability.ts`), `send` mass-texts the selected ones an
"Available {date} {time}? Reply YES" broadcast (capped at `BROADCAST_CAP=50`
recipients, `TEST_MODE=true` hard-coded in `preview/route.ts:8-10` per the
`feedback_no_mass_sms` guard), and `recent` shows broadcast history with
per-recipient delivery/reply status. RBAC is already gated (`campaigns.send`
permission, has its own `.rbac.test.ts` probes for both `send` and
`recent`). This is a real, tested, permission-checked feature — not a stub.

It is completely unreachable and non-functional as shipped, for two
independent reasons, both verified directly:
- **No nav link anywhere.** Grepped every `.tsx` in the repo for the string
  `find-cleaner` outside the feature's own three files — zero hits in
  `dashboard/layout.tsx` or any other component. The only way to reach
  `/dashboard/find-cleaner` today is typing the URL directly.
- **Its two backing tables are explicitly documented as not in prod.**
  `src/lib/migrations/008_cleaner_broadcasts.sql:1-2`: *"find-cleaner /
  cleaner-dispatch broadcast tables (ported from standalone nycmaid). Tenant-
  scoped. NOT YET APPLIED to prod — apply explicitly before enabling
  /api/admin/find-cleaner/send."* If an admin found the URL anyway and hit
  Send, the `cleaner_broadcasts` insert in `send/route.ts:148-163` would
  fail outright (relation does not exist) on any tenant where migration 008
  was never run — this worktree has no `.env.local`/Supabase env to confirm
  live, but the migration file's own header is explicit that this is the
  expected state, not a hypothesis.

Net effect: this session spent real analysis in item (4) treating "no push
mechanism exists" as an open product question requiring new design work —
it doesn't need new design work, it needs activation. A ready-built,
already-tested, already-permission-gated SMS broadcast feature has been
sitting dormant since it was ported from nycmaid, one migration + one nav
link away from closing the P11.18 gap. Not fixed here — migration 008 is
real prod DDL (needs Jeff's approval per standing rule) and flipping
`TEST_MODE` off is an explicit mass-SMS decision per `feedback_no_mass_sms`,
so this is a decision doc, not a code change:
`FIND-CLEANER-BROADCAST-ACTIVATION-OPTIONS.md`. Verified by reading
`find-cleaner/{preview,send,recent}/route.ts`, `find-cleaner/page.tsx`,
`day-availability.ts`, `008_cleaner_broadcasts.sql`, and both `.rbac.test.ts`
probes directly, plus confirming via `grep -rn "find-cleaner"` across all
`.ts`/`.tsx`/`.json` that no nav config references it anywhere in the repo.

## (11) New today — the reschedule-into-same-day path had the identical team-SMS urgency gap as item (7), on a third code path item (7) never traced

Found while closing item (7)'s push half above: `PUT
/api/client/reschedule/[id]/route.ts` has its own `becomesEmergency`
recomputation (`:74-90`, the reschedule-path twin of the create-path
same-day-is-emergency rule documented at P11.8/16/17) — if a client moves an
existing routine booking to today, this route flips `is_emergency` true and
recalculates `hourly_rate`/`price` at the tenant's configured emergency
rate. But the assigned tech's notification for this event is
`smsJobRescheduled()` (`src/lib/sms-templates.ts`), a third, separate
template from the two item (7) already covered
(`jobAssignment()`/`smsJobAssignment()`) — its signature had no
`is_emergency`/`pay_rate` field either, so a tech whose routine job just got
moved into a same-day emergency by the client got the exact same
"Rescheduled - {client} moved to {date} {time}" text as any routine
reschedule, with no signal that the job is now urgent or that a pay premium
now applies. Same root cause and same shape as (7), just a path (7)'s
original trace didn't reach since it only read `PUT /api/bookings/[id]` and
`POST /api/bookings`, not the client-facing reschedule endpoint.

**Fixed** (`p1-w3`), same convention as item (7)'s push-half fix (ported
from the already-shipped `smsUrgentBroadcast()` wording, no new decision
needed): `smsJobRescheduled()` now takes optional `is_emergency`/`pay_rate`
fields and prefixes `"URGENT — "`/`"URGENTE — "` plus a pay-rate line under
the same rules as the other two templates. No call-site change was needed
beyond the template itself — `reschedule/[id]/route.ts:161` already passes
the whole `updated` row (the post-update `.select('*', ...)` result, which
already carries `is_emergency`/`pay_rate` since this same route just wrote
them) into `smsJobRescheduled(tenant.name, updated)`; only the function's
own signature was blind to those fields before this fix. Confirmed only one
real (non-legacy-clone) call site of `smsJobRescheduled` exists in the
codebase. 5 new tests in `src/lib/sms-templates.emergency-rate-wording.test.ts`
(routine control, emergency-with-rate, and the same coverage for
`smsJobAssignment`), calling the live functions directly (no
`.env.local`/Supabase env in this worktree, same constraint as every other
item in this doc). `tsc --noEmit` clean, full suite 330/330 files,
1754/1754 tests, zero regressions.

## (12) New today — the client-portal self-book route had zero notification wiring at all — NOW FIXED

Archetype depth, and the most severe of this session's price-transparency /
notification findings so far: not "the message doesn't mention the premium"
(items 3/5/7/9) but "there is no message." Traced `POST
/api/portal/bookings` (`src/app/portal/book/page.tsx`'s "book another
appointment" flow — the logged-in client portal's self-book route, distinct
from the public `POST /api/client/book` widget) end to end and found zero
`notify()`/`sendEmail()`/`sendSMS()` calls anywhere in the file, vs. its
sibling `client/book` which fires an admin `notify()` alert plus a client
email + SMS confirmation on every booking. This route is also the exact one
that gained same-day/emergency pricing logic earlier this session (see the
`route.emergency-rate.test.ts` already in the tree) — so a returning client
who logs into their own portal and books a burst-pipe/no-heat same-day
emergency gets billed correctly at the emergency rate, but **nobody finds out
a booking exists**: no confirmation to the client, and critically, no alert
to the owner/dispatcher that a new (possibly urgent) job just landed. No DB
trigger or other mechanism covers the gap — confirmed via `grep -n "CREATE
TRIGGER"` against `supabase/schema.sql`, no hits. For a same-day emergency
this is a response-time risk strictly worse than item (4)'s "no push to any
tech" gap, since here even the human who'd dispatch a tech never learns the
job exists until they happen to check the dashboard.

**Fixed** (`p1-w3`) — ported `client/book`'s core notify+email+SMS block
(not its public-widget-specific extras: referral credit, attribution,
smart-schedule auto-suggestion — those are a different feature and out of
scope for closing a notification gap): an admin `notify({type:
'new_booking', ...})` alert now fires on every portal-created booking
(`notify()` degrades gracefully — `skipped` status, no throw — when a tenant
has no email/SMS provider configured, so this is safe even in the ~untested
provider-less case), and the client gets the same `bookingReceivedEmail()` /
`clientSmsTemplates().bookingReceived()` confirmation `client/book` already
sends, gated on the tenant having Resend/Telnyx configured. Client contact
info (`clients.name/phone/email`) is fetched via `tenantDb(auth.tid)` (not
`supabaseAdmin` directly) specifically to keep the query
`tenant_id`-scoped — this repo has an automated IDOR ratchet test
(`src/lib/idor-route-guard.test.ts`) that flagged the first draft of this fix
for reading `clients` by id without a sibling tenant filter, even though
`auth.id`/`auth.tid` are already bound together in one HMAC-signed portal
token (not independently spoofable) — fixed to match this file's own
existing convention rather than relying on that non-obviously-safe exception.
4 new tests (`route.notify.test.ts`): admin notify fires on every booking
regardless of email/SMS config, client email fires only when Resend is
configured, client SMS fires only when Telnyx is configured, and a
notify/email/SMS throw doesn't fail the booking creation itself (the whole
block is `try/catch`-wrapped, matching `client/book`'s fire-and-forget
tolerance). `tsc --noEmit` clean, full suite 331/331 files, 1758/1758 tests,
zero regressions.

## (13) New today — the smart-schedule tech-suggestion scorer is completely blind to job urgency

Fresh ground: a code path none of items 1-12 have touched.
`scoreTeamForBooking()` (`src/lib/smart-schedule.ts`) is the one automated
"who should do this job" mechanism in the codebase — it powers the
"suggested tech" banner on every booking-creation surface (confirmed 4 real
call sites: `POST /api/admin/smart-schedule`, `POST
/api/client/smart-schedule`, `POST /api/client/book`, and
`cron/generate-recurring`). Read its full scoring logic and grepped both the
function and all 4 call sites for `is_emergency`/`isEmergency` — zero
matches anywhere. The `opts` object it accepts has no urgency field at all,
so it structurally cannot factor same-day/emergency status into its
suggestion even if a caller wanted it to.

What it optimizes for instead, per the scoring weights read directly:
`+200` for the client's preferred tech, `+50`/`-30` for zone match, `-100`
for a labor-only mismatch, up to `+30` scaled by proximity to the job,
`+20` scaled by clustering with the tech's *other jobs that day* (i.e.
route efficiency across their whole schedule), and a hard reject
(`reason: 'conflict'`) if their day is already booked solid. This is a
sensible algorithm for **routine, plannable** scheduling — minimize a
tech's daily drive time, respect zone assignments, keep clients with their
preferred pro — but it is close to the opposite of what an actual emergency
dispatch needs: the fastest-available person regardless of whether picking
them wrecks their otherwise-efficient day, with zone-clustering and
preferred-tech weighting being secondary (or irrelevant) concerns for a
burst pipe. Net effect: for this session's emergency/24-7 archetype
specifically, the one piece of dispatch automation the app has treats a
same-day emergency exactly like a routine booking made three weeks out —
same weights, same "would this wreck their day" conflict rejection, no
"who's truly free right now" boost. An owner triaging an incoming emergency
call and glancing at the suggested-tech banner (already established in item
(6)/(8) as informational-only, not auto-assigned) has no reason to trust
it's actually surfacing the fastest responder.

Not fixed — this is a genuine algorithm/product call, same class as items
(3)/(5)/(7)/(9): should emergency jobs skip zone-clustering weight entirely?
Should the hard "day already booked" conflict-reject become a soft penalty
instead (a tech might reasonably bump a routine job for a true emergency)?
Should there be a distinct "nearest available right now" mode rather than
reusing the existing day-optimized scorer? Any of these changes the
suggestion an owner sees and shouldn't be guessed at without a decision.
Verified by reading `smart-schedule.ts` in full (the entire scoring block,
not excerpted) plus all 4 call sites directly (worktree still has no
`.env.local`/Supabase env for a live call, same constraint as every other
item in this doc).

## (14) New today — the AI/SMS bot's own reschedule tool had the same emergency-rate gap item (11) fixed on the human-facing reschedule path — NOW FIXED

Archetype depth, direct continuation of the price-transparency/urgency
trilogy onto a channel item (11) never traced: both `reschedule_booking`
tool handlers — `handleRescheduleBooking` in `src/lib/selena/core.ts`
(Yinez, the nycmaid bot) and in `src/lib/selena-legacy-handlers.ts` (the
multi-tenant legacy bot) — already had the *notice-period* guard (7 days /
tenant-configured `reschedule_notice_days`), but neither ever touched
`is_emergency`/`hourly_rate`/`price` on the row they updated, only
`start_time`/`end_time`/`notes`. Both files' sibling `handleCreateBooking`
already force the same-day emergency rate server-side (P11.16/17,
`core.ts`'s own comment at the fix site cites this exact precedent) — the
reschedule tool was the one entry point in each file that fell through that
net, same shape as item (11)'s finding on `PUT
/api/client/reschedule/[id]`'s `smsJobRescheduled` gap, just one layer
earlier (the booking row itself, not just its SMS wording). Net effect: a
client asking the AI bot to move an existing routine booking to today got
the move confirmed at the original $69/$59 rate, with `is_emergency` left
`false` — silently skipping the emergency rate and leaving every downstream
`is_emergency`-reading consumer (admin badges, urgent SMS wording,
schedule-monitor) blind to the fact that this is now a same-day job.

**Fixed** (`p1-w3`) — both handlers now compute `isEmergency = (new_date ===
today)` server-side and set `is_emergency` on every reschedule; when it
lands on today, `core.ts` applies its own hardcoded $89/hr (matching its
`handleCreateBooking` convention for the single-tenant nycmaid bot), and the
legacy handler reads `tenant.selena_config.emergency_rate` off the same
`tenants(...)` join already used for `reschedule_notice_days` (matching
`selena-legacy.ts`'s `handleCreateBooking` convention for the
multi-tenant bot) — if a tenant has no emergency rate configured,
`is_emergency` still flips true but the rate is left untouched, same
graceful-degradation shape as the human-facing route. 5 new tests across
both files (same-day forces the rate, far-future leaves it alone, and for
the legacy handler a no-emergency-config case). `tsc --noEmit` clean, full
suite 333/333 files, 1763/1763 tests, zero regressions. Commit `00485307`.

## (15) New today — the reschedule notice-period guard checks the wrong date entirely, on both AI bot handlers

Fresh ground, found while fixing (14) and deliberately left alone —
touching it is a live customer-facing bot-policy change, not a code-quality
fix. Both `handleRescheduleBooking` implementations compute `daysUntil` from
`booking.start_time` — the booking's **current, pre-change** date — and
reject the reschedule if that's under the notice threshold (`7` days in
`core.ts`, tenant's `reschedule_notice_days` in the legacy handler,
default `2`). Read literally, the guard's own error message ("Booking is in
`daysUntil` days. Need `N` days notice.") describes protecting the
**original** appointment from a last-minute change — and the code as
written does do that correctly. What it never checks at all is the
**target** date the client is asking to move *to*. Concretely: a weekly
recurring client's booking sitting 20 days out passes the notice check
easily (20 ≥ 7), and the bot will happily move it to **today** with zero
friction — no notice-days rejection of any kind, since `new_date`'s
proximity to now is never evaluated, only the old booking's. Item (14)
above makes that landing correctly priced/flagged as an emergency now, but
whether the bot *should even allow* a zero-notice same-day reschedule
through this low-friction channel in the first place — versus requiring the
same notice period on the new date, or routing it to a human — is a real
policy call (this session's already-decided precedent, `PUT
/api/client/reschedule/[id]`, has no notice-period gate on this axis at
all, so "block it" isn't obviously correct either; it might be exactly the
self-service convenience the bot exists for). Not fixed — flagging with
both code sites named (`selena/core.ts:handleRescheduleBooking`,
`selena-legacy-handlers.ts:handleRescheduleBooking`) rather than guessing
which date the notice policy is supposed to protect.

## (16) New today — the client's own "My Bookings" page never showed the emergency badge item (8) already added everywhere else — NOW FIXED

Archetype depth, direct continuation of item (8) (admin UI) and item (7)/(11)
(tech-facing SMS): `GET /api/client/bookings` already `select('*')`s the
booking row, so `is_emergency` was in every response the client's own
portal received — but the three client-facing "My Bookings" pages
(`site/book/dashboard/page.tsx` and its two tenant clones,
`wash-and-fold-hoboken/(app)/book/dashboard/page.tsx` and
`wash-and-fold-nyc/(app)/book/dashboard/page.tsx` — byte-identical render
logic, confirmed by diff) never declared `is_emergency` on their local
`Booking` interface and never rendered it. A client looking at their own
upcoming booking saw a price with no explanation of why it was higher than
usual on a same-day job — the exact price-transparency gap items (5)/(9)
already fixed on the confirmation channels, just one screen later, on the
one surface the client is most likely to actually revisit.

**Fixed** (`p1-w3`) — all three files: added `is_emergency?: boolean | null`
to the `Booking` interface, a small "🚨 Emergency" badge next to the
existing status pill (collapsed card header), and a "(emergency rate)"
note next to the price in the expanded detail grid — same 🚨 visual
language item (8)'s admin-side fix already established. No new API
wiring needed since the field was already being returned, just never
read. `tsc --noEmit` clean; no existing tests covered these pages
(client-portal pages, not previously under test) so none were at risk.

## (17) New today, fresh ground (not archetype-specific, but hits the archetype hardest) — cancelling a booking from the operator dashboard told the assigned tech nothing — NOW FIXED

Not part of the emergency-rate/price-transparency thread above — found
while hunting a different surface entirely (the booking lifecycle/
notification layer) — but the harm concentrates hardest on same-day
emergency jobs, where there's the least buffer for a tech to notice a
cancellation some other way before showing up. `PATCH
/api/bookings/[id]/status` — the transition the operator dashboard's
"Cancel" button (`src/app/dashboard/bookings/[id]/page.tsx`,
`STATUS_ACTIONS`) calls — updates the row's status and syncs the mirrored
deal stage, but fires zero notifications of any kind. Its sibling client-
facing path, `PUT /api/portal/bookings/[id]` (client-portal self-cancel,
fixed earlier this session per item (12)'s wiring pass), already SMS's the
assigned team member the moment a *client* cancels — this endpoint is the
operator-initiated mirror of that exact same action, and it never got the
same treatment. Net effect: an admin cancelling a same-day emergency job
from the dashboard — the most likely reason to cancel same-day at all —
left the assigned tech with no signal their job was gone short of manually
checking the portal.

**Fixed** (`p1-w3`) — on `status === 'cancelled'` with a `team_member_id`
present, fires the identical `notify()` call the portal route already
uses (`type: 'booking_cancelled'`, `channel: 'sms'`,
`recipientType: 'team_member'`), wrapped in the same non-blocking
try/catch shape the route's existing deal-sync step already uses so a
notify failure can't fail the cancellation itself. 4 new tests
(`route.cancel-notify.test.ts`): notifies on cancel-with-assignee, skips
when unassigned, skips on non-cancellation transitions, and doesn't fail
the request if `notify()` throws. `tsc --noEmit` clean, full suite
334/334 files, 1767/1767 tests, zero regressions (one pre-existing,
unrelated `tenant-scope` guard warning on `src/app/api/fixture/route.ts`
predates this session's diff — not touched here).

## (18) New today, archetype depth — the no-show cron could silently orphan an unassigned same-day emergency booking out of the tech self-claim pool forever — NOW FIXED

Fresh ground within the archetype, and a genuinely severe compounding
consequence on top of the already-documented P11.12/13/18 chain (a same-day
booking can land with `team_member_id` null, and the only pull-model
fallback for that is the tech self-claim pool). Traced what else in the
codebase touches a booking sitting unassigned past its start time and found
`cron/no-show-check/route.ts` (runs every 15 min): its candidate query
selected any booking with `status in ('scheduled','confirmed','pending')`,
`check_in_time IS NULL`, and `start_time` more than 45 minutes in the past —
**with no `team_member_id IS NOT NULL` filter**. Confirmed
`POST /api/bookings`'s default status (`settings.default_booking_status ||
'scheduled'`, or `'confirmed'` under auto-confirm) lands squarely inside
that status set, so an unassigned same-day emergency booking (P11.12's
established gap) is a live candidate here too. 45 minutes after its
`start_time`, this cron flips it to `status='no_show'` — but "no show"
literally means someone who was supposed to show up didn't; nobody was ever
assigned, so this mislabels a dispatch failure as a client/tech attendance
failure. Worse than mislabeling: `GET /api/team-portal/jobs?available=true`
(the self-claim pool, `route.ts:45`) queries
`.is('team_member_id', null).in('status', ['scheduled', 'confirmed'])` —
once the cron flips status to `no_show`, the booking silently vanishes from
every tech's open-jobs screen with **no path back**. Net effect: the one
fallback dispatch mechanism this archetype's whole notification chain
(items 4/12/13/18) relies on has a 45-minute self-destruct timer buried in
an unrelated cron job — an urgent, unassigned, same-day emergency job that
no tech happens to claim within 45 minutes doesn't just stay stuck, it
becomes permanently unclaimable, with an admin notification worded like a
routine no-show ("team member unassigned did not check in") rather than a
dispatch-failure alert. Verified by reading `cron/no-show-check/route.ts`,
`team-portal/jobs/route.ts`, and `POST /api/bookings`'s status-default logic
directly (worktree still has no `.env.local`/Supabase env for a live run).

**Fixed** (`p1-w3`) — added `.not('team_member_id', 'is', null)` to the
no-show-check cron's candidate query. This needed no product/wording
decision (unlike most open items in this doc): "no show" is a category
error for a job nobody was ever dispatched to, and the unassigned case is
already surfaced separately, if imperfectly, by `schedule-monitor`'s own
`type: 'unassigned'` warning (item 4's finding) — this fix just stops the
no-show cron from destroying the self-claim pool's only path to recovering
one. No dedicated test added: this repo has zero test files under any
`src/app/api/cron/*` route (checked directly, no precedent to follow), same
as every other DB-writing cron route in this codebase. `tsc --noEmit`
clean, full suite 334/334 files, 1767/1767 tests, zero regressions
(unaffected — no existing test touches this route).

## (19) New today, fresh ground outside the archetype — the client-SMS opt-out batch tool checks a column the STOP-reply webhook never writes to — NOW FIXED

Not archetype-specific — a codebase-wide compliance gap found while auditing
how SMS consent actually flows end to end, since `clients` turns out to
carry two separate boolean consent columns: `sms_opt_in` (original schema,
`supabase/schema.sql:107`, default `true`) and `sms_consent` (added later by
two overlapping migrations, `src/lib/migrations/007_missing_tables.sql:206`
and `013_full_parity.sql:16`, also default `true`). Traced the real
STOP/START opt-out pipeline (`webhooks/telnyx/route.ts:148-248`, the
industry-standard SMS compliance flow) and confirmed it reads/writes
`clients.sms_consent` exclusively — a client texting STOP gets
`sms_consent: false` and a confirmation text. Grepped every other
client-SMS-consent check in the codebase (`campaigns/[id]/send/route.ts`,
`campaigns/send/route.ts`, `cron/outreach/route.ts`, `cron/retention/route.ts`,
`selena/tools.ts`'s broadcast helper) and all five correctly gate on
`sms_consent !== false` — matching the webhook. `sms_opt_in`, by contrast,
is written **nowhere** in the codebase after its `true` default (confirmed
via a full-repo grep for any `.update(...)`/`.insert(...)` touching it — zero
hits outside its own column definition); the only place it's read at all is
a read-only display on the admin client detail page and, until this fix,
`admin/send-apology-batch/route.ts:56`'s `if (c.sms_opt_in === false) { ...
skip }` guard — the one call site in the whole app whose explicit job is to
respect an opt-out. Net effect: a client who explicitly texts STOP — the
one action a customer takes that's supposed to universally silence SMS from
a business — could still receive this batch tool's apology-credit SMS,
because the check it runs against was structurally incapable of ever being
`false`. A real TCPA-exposure gap (STOP compliance is federally mandated,
not just good UX), not a hypothetical: verified the STOP handler's write
target and this route's read target are two different, non-syncing columns
by reading both files directly, not by inference.

**Fixed** (`p1-w3`) — `send-apology-batch/route.ts` now selects and checks
`sms_consent` instead of `sms_opt_in`, matching the convention already
established at the five sibling call sites above; no wording/product
decision needed, this corrects a wrong-column bug to the codebase's own
existing pattern. 1 new test (`route.consent.test.ts`): seeds a client with
`sms_consent: false` (STOP-reply shape) alongside `sms_consent: true` and
`sms_consent: null` (never-opted-out) clients, asserts the opted-out client
is skipped (`skipped_opt_out: 1`) and never appears in the SMS send list
while the other two do. Did not touch the separate, still-live question of
whether `sms_opt_in` itself is now genuinely dead code worth removing from
the schema/UI — flagging, not deciding, since that's a data-model cleanup
call outside this fix's scope. `tsc --noEmit` clean, full suite 335/335
files, 1768/1768 tests, zero regressions.

## (20) New today, archetype depth — schedule-monitor's unassigned-booking check treated a same-day emergency exactly like a routine gap three weeks out — NOW FIXED

Direct continuation of item (4)/P11.18's finding that `cron/schedule-monitor`
is the one proactive sweep that catches an unassigned booking at all, but
only writes it to `schedule_issues` at `severity: 'warning'` — the same tier
as `over_max_jobs`/`tight_buffer`, well below `'critical'` (already used for
`day_off`/`time_conflict`/`no_car`/`duplicate_client`, all real operational
risks). Checked whether the cron's bookings query even reads `is_emergency`
at all — `route.ts:44`'s `select(...)` didn't. Net effect: an unassigned
same-day burst-pipe emergency and an unassigned booking sitting three weeks
out produced byte-identical dashboard signal — same severity label, same
position in the "Fix now" group, nothing for an owner scanning
`ScheduleIssues.tsx`'s counts to distinguish urgency by.

**Fixed** (`p1-w3`) — added `is_emergency` to the bookings `select()` and,
in the `unassigned` check specifically, escalate to `severity: 'critical'`
plus a `"🚨 EMERGENCY — "` message prefix when true (routine unassigned
bookings unchanged at `'warning'`, no wording prefix). This needed no
product/copy call, same class as item (8)'s fix: severity is an existing
three-tier enum already used to encode real operational risk, and the 🚨
prefix reuses the visual convention item (8)/(16) already established
everywhere else in the app rather than inventing new wording. Does **not**
close item (4)'s still-open finding — this only fixes the *owner's* pull
dashboard prioritization; there is still no push/SMS to any tech when a job
lands unassigned. Verified via a standalone `node -e` sanity check of the
exact severity/message logic (emergency → critical + prefix, routine/no-flag
→ warning + no prefix, same "read the source, call the real logic"
methodology as every other item in this doc — worktree still has no
`.env.local`/Supabase env for a live cron run). `tsc --noEmit` clean, full
suite 335/335 files, 1768/1768 tests, zero regressions (no test added — this
repo has zero test files under any `src/app/api/cron/*` route, confirmed
directly, same precedent item (18) already established for this exact
file's sibling no-show-check cron).

## (21) New today, fresh ground outside the archetype — the client payment-confirmation SMS was the one client-SMS call site that didn't check sms_consent — NOW FIXED

Found while re-checking item (9)'s flagged-not-asserted observation that
`payment-processor.ts`'s client confirmation SMS (`:335-345`) has no
`sms_consent` gate, unlike the sibling team-member SMS four lines above it
(`:309`) which does. Item (19) (this same session, `send-apology-batch`)
already established the definitive codebase-wide convention while fixing
its own wrong-column TCPA bug: every real client-SMS call site —
`campaigns/[id]/send`, `campaigns/send`, `cron/outreach`, `cron/retention`,
`selena/tools`'s broadcast helper, and now this file's own team-member
branch — gates on `sms_consent !== false`, matching what the STOP-reply
webhook (`webhooks/telnyx/route.ts`) actually writes. The client payment SMS
was the one exception: a client who explicitly texted STOP could still
receive this specific SMS, because the query selecting `clientRecord` never
fetched `sms_consent` in the first place.

**Fixed** (`p1-w3`) — added `sms_consent` to the `clients` select and gated
the send on `clientRecord.sms_consent !== false`, same convention as every
sibling call site. No wording/product decision needed, same shape as item
(19)'s fix: this corrects an inconsistency to the codebase's own
already-established pattern rather than opening the "are payment
confirmations consent-exempt" question item (9) originally flagged — the
codebase has already answered that question the same way for every other
client SMS, so this makes the one outlier consistent rather than deciding
policy fresh. `tsc --noEmit` clean, full suite 335/335 files, 1768/1768
tests, zero regressions (no dedicated test existed for this function before
or after — `payment-processor.test.ts` exists but doesn't cover this code
path, confirmed by grepping for `sms_consent`/`clientRecord` in it before
concluding no test was at risk).

## Not re-litigated here (already tracked elsewhere, still open)

- Urgency-blind +3-day booking placeholder on quote-accept — full options
  doc already exists at `URGENCY-BLIND-BOOKING-PLACEHOLDER-FIX-OPTIONS.md`,
  awaiting Jeff's call.
- Reschedule-OUT-of-same-day-back-to-future pricing revert — new options
  doc from item (1) of this same queue,
  `RESCHEDULE-OUT-OF-EMERGENCY-PRICING-REVERT-OPTIONS.md`.
- Dispatch-on-convert (owner notify / self-claim pool / broadcast never
  firing for an auto-converted same-day quote-accept, P11.10-13) — reported
  in the 13:23-13:37 window today, still unwired; connects two already-
  working code paths, a wiring/product call, not re-verified again today
  since nothing in this session's diffs touched `createBookingFromQuote`'s
  dispatch path.
- Dormant find-cleaner broadcast dispatch (item 10 above) — activation
  options doc at `FIND-CLEANER-BROADCAST-ACTIVATION-OPTIONS.md`, awaiting
  Jeff's call on migration 008 + `TEST_MODE` flip.
