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

## (22) New today, archetype depth — a tech releasing their own job back to the pool told nobody, admin included — NOW FIXED

Third trigger on the "job falls back to unassigned" chain items (4)/(18)/(20)
already documented (unassigned-at-creation and no-show-cron orphaning), this
one via voluntary tech release. `/api/team-portal/jobs/release` (a member
handing their OWN job back, e.g. sick that morning) fired zero notifications
of any kind — no admin alert, no dedicated push — unlike its sibling
`/reassign` (`jobs/reassign/route.ts:104-111`), which already pushes both the
outgoing and incoming tech on every reassignment. A same-day emergency job
that a tech released 20 minutes before start had no signal to anyone that it
had gone back to unassigned short of an admin happening to refresh the
dashboard.

**Fixed** (`p1-w3`) — fires `sendPushToTenantAdmins()` on every successful
release, reusing the exact tech-triggered admin-push convention
`running-late/route.ts` already established (SMS-adjacent operational event,
tech self-reports, admin gets pushed). Escalates to `"🚨 Emergency Job
Released"` wording when `is_emergency` is true, matching the severity
convention item (20)/schedule-monitor already set for this exact
unassigned-booking risk. No wording/product decision needed — both
conventions already existed in the codebase, this just ports them to a third
trigger neither had reached. 3 new tests (`route.notify.test.ts`),
mutation-verified (reverted the fix, both new-behavior tests went RED,
negative control unaffected, restored). `tsc --noEmit` clean, full suite
336/336 files, 1771/1771 tests, zero regressions. Commit `d3489603`.

## (23) New today, fresh ground outside the archetype — six more client-SMS call sites never checked sms_consent

Codebase-wide compliance sweep, same class of gap as items (19)/(21) (a
client who explicitly texted STOP should never get another SMS from any
call site, transactional or not — that's what the STOP webhook's
`sms_consent: false` write is for). Went looking for every remaining
client-facing `sendSMS()` call site not already covered by items (19)/(21)'s
established convention (`campaigns/send`, `campaigns/[id]/send`,
`cron/outreach`, `cron/retention`, `selena/tools`'s broadcast helper,
`send-apology-batch`, `payment-processor`) and found six more real senders
that never adopted it, none previously audited against the convention:

- `cron/reminders` — day-based + 2-hour booking reminder SMS (2 sites)
- `cron/confirmations` — day-before confirmation SMS, the message that
  literally contains *"Reply STOP to opt out"* in its own body
- `cron/payment-reminder` — unpaid-booking client nudge (the sibling admin
  overdue-escalation branch was deliberately left ungated — different
  recipient, still needs to fire regardless of the client's own opt-out)
- `cron/post-job-followup` — review-request SMS for both standalone bookings
  and completed jobs (2 sites), also contains *"Reply STOP to opt out"*
- `cron/payment-followup-daily` — up to 3x/day, up to 100 clients/run payment
  chase
- `reviews/request` — the admin dashboard's manual "Request Review" button

Net effect: a client who texted STOP could still receive any of these six —
real, ongoing TCPA exposure spread across the highest-volume automated SMS
paths in the app (reminders and confirmations fire for essentially every
booking), not a one-off outlier the way (21) was.

**Fixed** (`p1-w3`) — all six gated on `sms_consent !== false`, matching the
codebase's own already-established convention, same reasoning item (21)
used: no wording/product decision needed, this corrects an inconsistency to
an existing pattern rather than opening a new policy question. Added
`sms_consent` to `ClientRecord` (`src/lib/types.ts`) plus two new
consent-carrying `Pick<>` variants (`ClientNamePhoneConsent`,
`ClientNamePhoneEmailConsent`) so the field travels with the client join in
every typed query that conditionally SMS's them, instead of being fetched ad
hoc per call site. Deliberately left untouched (different consent question,
not the same pattern): OTP/auth codes, client-initiated document/invoice/
quote sends, and `cron/late-check-in` (never SMS's the client at all, only
team + admin). This repo has zero test files under any `src/app/api/cron/*`
route (same precedent items 18/20 already established) — the five cron
fixes rely on `tsc --noEmit` + full-suite verification, not new unit tests;
`reviews/request` is a regular API route, not cron, so it got 2 new tests
(`route.consent.test.ts`), mutation-verified the same way as item (22).
`tsc --noEmit` clean, full suite 337/337 files, 1773/1773 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched). Commit `5dc38572`.

## (24) New today, archetype depth — the admin's own "new booking" notifications were structurally blind to emergency status — NOW FIXED

Direct continuation of items (7)/(8)/(11)/(20)'s "who ever finds out this job
is urgent" thread, on a trigger none of them traced: the very first admin
notification fired at booking creation, before the schedule-monitor dashboard
(item 20) or the tech-facing channels (items 7/11) even exist yet. Traced
every real caller of `notify({ type: 'new_booking', ... })` and the sibling
`adminNewBookingRequestEmail()`/`emailAdmins()` template and found both are
structurally blind to `is_emergency` — same "the type signature has no field
for it" root cause as items 7/9's original findings:
- `POST /api/client/book` (the public marketing-site booking widget, the
  primary creation path for the actual 23-tenant plumbing/HVAC/restoration/
  tree-service archetype this whole doc tracks) already computes
  `bkIsEmergency` server-side (P11.8/16/17) — but neither its
  `notify('new_booking', ...)` call nor its `adminNewBookingRequestEmail()`
  call passed it through. Its own file has a bespoke NYC-Maid-only branch
  (`isNycMaid(tenant.id) && bkIsEmergency` → a special `🚨 EMERGENCY` SMS via
  `nmSmsAdmins`) proving the codebase already recognizes this exact gap for
  one tenant — just never generalized it to the archetype tenants who don't
  get that bolt-on.
- `POST /api/portal/bookings` (item (12)'s fix, the client-portal self-book
  route) ported `client/book`'s `notify('new_booking', ...)` call verbatim —
  which means it inherited the same blindness, despite the route computing
  its own `isEmergency` two lines earlier in the same file for pricing.

Net effect: for the actual archetype (non-NYC-Maid) tenants, the owner's
first-ever signal that a new job exists — sent over the slowest channel
(plain branded email, `channel` defaults to `'email'`, no push/SMS) — never
mentioned urgency at all. Subject line, body, and HTML banner were
byte-identical for a same-day burst-pipe emergency and a routine booking
made three weeks out.

**Fixed** (`p1-w3`) — ported the same 🚨/"URGENT — " convention items
(7)/(8)/(11)/(20) already established: `adminNewBookingRequestEmail()` now
takes an optional `isEmergency` field, prefixing the subject
(`"🚨 URGENT — New Booking: {name}"`) and adding the same red-banner treatment
`bookingReceivedEmail()`'s client-facing urgent variant already uses ("Same-
day emergency — dispatch ASAP."). Both real call sites
(`client/book/route.ts`, `portal/bookings/route.ts`) now pass their
already-computed emergency flag through to both `notify()` (title + a
`"🚨 EMERGENCY — "` message prefix) and `adminNewBookingRequestEmail()`. NYC
Maid's existing bespoke SMS branch is untouched — this closes the gap for the
tenants that branch never covered, it doesn't replace it. 5 new tests across
`email-templates.admin-emergency-wording.test.ts` (routine vs. urgent
wording, direct unit test of the template function),
`client/book/route.emergency-notify.test.ts` (both real notify/email call
sites, urgent vs. routine), and one new case added to the existing
`portal/bookings/route.notify.test.ts`. `tsc --noEmit` clean, full suite
341/341 files, 1783/1783 tests, zero regressions (one pre-existing, unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, same
precedent as items 17/23).

## (25) New today, fresh ground outside the archetype — the campaign email "Unsubscribe" link was non-functional on one send path and entirely absent on the other — NOW FIXED

Codebase-wide CAN-SPAM compliance gap, same class of real legal exposure as
the sms_consent TCPA sweep (items 19/21/23) but on the email side and,
distinctly, not a wrong-column bug — the actual signed-token unsubscribe
mechanism (`signUnsubscribeToken`/`verifyUnsubscribeToken`/`unsubscribeUrl()`
in `src/lib/unsubscribe-token.ts`, `/api/unsubscribe` POST, `/unsubscribe`
page) is fully built, tested-by-construction (HMAC-signed, tenant-scoped),
and **already wired into `email-templates.ts`'s shared `baseTemplate()`**
(`TemplateData.unsubscribeUrl`, rendered as a footer link whenever set) —
grepping every real caller of `unsubscribeUrl()` found zero outside its own
definition. Traced both real campaign-email send paths and found each fails
differently:
- `POST /api/campaigns/[id]/send` built its own ad hoc footer link pointing
  at `/unsubscribe?email=<address>` — but `/unsubscribe` (`src/app/
  unsubscribe/page.tsx`) only ever reads a `?t=<signed token>` param
  (`useSearchParams().get('t')`), and its "Confirm unsubscribe" button is
  `disabled={!token}`. A client clicking this link landed on a page with
  `token = null` and a **permanently disabled** button — no code path by
  which the click could ever complete. `email_marketing_opt_out` (correctly
  checked before every send on this path) could only ever be set by an admin
  manually, never by the client themself via the link the footer claims to
  provide.
- `POST /api/campaigns/send` (the other real campaign send path, admin-side
  bulk send with per-recipient `campaign_recipients` tracking) routes emails
  through the shared `notify({ type: 'campaign_sent', ... })` — but
  `'campaign_sent'` wasn't a handled case in `notify()`'s template switch, so
  it fell through to the generic `<p>{message}</p>` fallback: no branded
  shell, no footer, no unsubscribe link of any kind, not even a broken one.

**Fixed** (`p1-w3`) — mechanical fix, no wording/product decision (the
mechanism already existed and was already designed for exactly this): `POST
/api/campaigns/[id]/send` now builds its footer link with the real
`unsubscribeUrl()` (signed `{clientId, tenantId, channel:'email'}`, matching
what `/api/unsubscribe` actually verifies). `notify.ts` gained a
`'campaign_sent'` case that wraps the campaign body in `baseTemplate()` with
a real per-recipient `unsubscribeUrl` when `recipientType === 'client'`,
closing the second path's total absence of one. Both call sites wrap the
signing call in try/catch — `unsubscribeUrl()` throws if
`PORTAL_SECRET`/`ADMIN_TOKEN_SECRET` is unset, and a misconfigured secret
must never take down the whole campaign send; on a signing failure the email
still sends, just without the link, same degraded-not-broken shape `notify()`
itself already uses elsewhere. 5 new tests:
`campaigns/[id]/send/route.unsubscribe.test.ts` (link carries a token
`verifyUnsubscribeToken` actually accepts and resolves to the right
client/tenant; signing-failure fallback doesn't crash the send) and
`notify.campaign-unsubscribe.test.ts` (same two cases for the `notify()`
path, plus a control proving routine non-campaign notify types are
unaffected). `tsc --noEmit` clean, full suite 341/341 files, 1783/1783
tests, zero regressions.

## (26) New today, archetype depth — extras on a multi-tech emergency job never got the urgency signal, only the lead did — NOW FIXED

Direct continuation of item (7)/P11.22's fix, which ported `is_emergency`/
`pay_rate` into `jobAssignment()`'s signature so an assigned tech could
learn a job was urgent and that a pay premium applied. That fix wired the
new fields into the ONE call site that existed at the time — the
lead-assignment path in `/api/bookings/[id]/route.ts`. This route
(`/api/bookings/[id]/team`, multi-tech "extras" management — add/remove
additional techs on top of the lead) has its own separate
`jobAssignment()` call site that never got the same wiring, despite
already fetching the booking row (`select('*, clients(*)')`) with both
fields present on it.

Net effect: on a multi-tech emergency job, the lead's SMS said "URGENT
—" with the pay premium; every EXTRA team member added alongside them
got a byte-identical SMS to a routine job — no urgency signal, no
premium-pay line — plus a plain (non-🚨) push/in-app notification title,
the same convention items (20)/(24)/P11.27 already established
elsewhere.

**Fixed** (`p1-w3`) — wired `bookingFull.pay_rate`/`is_emergency` through
to the real `jobAssignment()` call, applied the same 🚨 title convention
to the push notification. 2 new tests
(`route.emergency-sms.test.ts`), mutation-verified (reverted the fix, the
emergency-case test went RED reproducing the exact byte-identical-SMS
symptom, the routine-job control test was unaffected, restored). `tsc
--noEmit` clean, full suite 342/342 files, 1785/1785 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items 17/23/24).

## (27) New today, fresh ground outside the archetype — client/referrer analytics silently dropped a booking the instant bulk payroll paid its team member out — NOW FIXED

`'paid'` is a real `bookings.status` value — `POST /api/finance/payroll`
flips a completed booking to `'paid'` once the assigned team member's
wage has been paid out (`src/app/api/finance/payroll/route.ts:101`,
confirmed as the only two real writers of this status alongside
`src/lib/selena/tools.ts`'s equivalent tool). Three client/referrer
reporting routes only ever matched `status === 'completed'` when pulling
a client's booking history:

- `GET /api/client-analytics` — `totalSpent`/`bookingCount`/lifecycle
  status (active vs. new/inactive) per client
- `GET /api/clients/analytics` — LTV + lifecycle classification per
  client
- `GET /api/referrers/analytics` — `completedReferredBookings` count

Net effect: the instant bulk payroll ran on a client's (or referred
client's) booking, that booking vanished from all three reports — a
client whose only booking got paid out looked like they'd never booked
at all (status `'new'`, $0 LTV, dropped from `client-analytics`
entirely), and a referrer's real conversion undercounted every time
payroll touched one of their referrals.

**Fixed** (`p1-w3`) — all three now match `status IN ('completed',
'paid')`; a `'paid'` booking is still a completed, revenue-generating
job, just one whose labor cost has since been settled. Mechanical fix,
no product decision — `'paid'` is strictly a terminal state past
`'completed'` on the same booking, never a distinct outcome. (Found
half-fixed as uncommitted WIP already sitting in the worktree;
independently re-verified the change was correct by grepping every real
`status: 'paid'` writer before adopting it, then extended it with tests
and mutation verification.) 3 new tests (`route.paid-status.test.ts`, one
per route), mutation-verified (reverted each fix individually, each test
went RED with the exact symptom described above, restored). `tsc
--noEmit` clean, full suite 345/345 files, 1788/1788 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items 17/23/24/26).

Deliberately NOT extended to the ~15 other `status === 'completed'`-only
queries found in `finance/summary`, `finance/pnl`,
`finance/payroll-prep`, `finance/cleaner-income`, `finance/ar-aging`,
`admin/analytics`, `leads/feed`, `deals/at-risk`,
`admin/campaigns/preview`, and others — those mix in payroll-pending/
unpaid-labor semantics where `'paid'` legitimately should stay excluded
(e.g. `finance/payroll`'s own GET query, which specifically wants
"completed but NOT yet paid out" to build the payroll queue). Blanket-
including `'paid'` there would double up or misclassify money the
tenant hasn't been shown as settled yet — a real per-query product call,
not a mechanical fix, and out of scope here.

## (28) New today, fresh ground outside the archetype — self-claiming an open job silently overwrote its own pay_rate with the claimant's default — NOW FIXED

`POST /api/team-portal/jobs/claim` unconditionally set `pay_rate:
member.pay_rate` on every claim, discarding any per-job rate already sitting
on the booking. A job open for self-claim can already carry one: `/api/
bookings/broadcast` (the live, wired-up "Emergency: single booking +
broadcast" flow off `BookingsAdmin.tsx`'s create form) advertises exactly
`booking.pay_rate` as the "$X/hr — first to claim gets it!" promise in the
SMS/email it sends to every active team member, and `.../jobs/release`
(a member handing their own job back to the pool) never touches `pay_rate`
at all, so a released job keeps whatever rate it had.

Net effect: `finance/payroll/route.ts:35` already treats `booking.pay_rate`
as authoritative over the member's own default
(`b.pay_rate || member.pay_rate`) precisely so per-job overrides like an
emergency premium survive to payout — but the claim endpoint clobbered that
override the instant someone claimed the job, before payroll ever got to
read it. A cleaner who answered a "$89/hr" broadcast and claimed it got paid
their own standard rate at payout time instead, with no error, no signal,
nothing in the UI showing the promised rate ever applied.

**Fixed** (`p1-w3`) — claim now only falls back to the claiming member's own
`pay_rate` when the booking doesn't already carry one; an existing per-job
rate (broadcast premium or a survived-release rate) is preserved. 2 new
tests (`route.pay-rate.test.ts`), mutation-verified (reverted the fix, the
premium-preservation test went RED reproducing the exact 89→25 symptom,
restored). `tsc --noEmit` clean, full suite 346/346 files, 1790/1790 tests,
zero regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items 17/23/24/26/27).

Deliberately NOT extended to `.../jobs/reassign/route.ts`, which has the
identical pattern (`pay_rate: target.pay_rate` on reassignment) — there a
lead/manager is making an explicit choice to move a job to a different
member, and paying that member their own standard rate going forward is a
plausible intended design, not an unambiguous bait-and-switch like claim's
broadcast-then-discard case. Real product question for Jeff's call, not
auto-fixed — listed below.

## (29) New today, archetype depth — running-late report on a same-day emergency job got the same non-urgent admin alert as a routine one — NOW FIXED

`POST /api/team-portal/running-late` never looked at `bookings.is_emergency`
at all — the route's own `SELECT` didn't even fetch the column. A team
member reporting late on a same-day emergency job produced a byte-identical
"Running Late" `notify()` title/push/admin-SMS as a routine job running a
few minutes behind. Same class of admin-notify blind spot as items
(20)/(24)/(26) (schedule-monitor severity escalation, admin new-booking
emergency-blindness, multi-tech extras SMS): the owner's first glance at
this alert carried no signal that the job already involved is time-critical
— exactly the moment a delay matters most and the owner is most likely to
want to intervene (reassign, call the client, etc.) rather than just note it.

**Fixed** (`p1-w3`) — added `is_emergency` to the route's `SELECT`; admin
`notify()`/push/SMS now carry a 🚨/URGENT escalation on an emergency booking
(title, message, and `smsRunningLateAdmin`'s new optional `isEmergency`
param), matching the convention already established elsewhere. Client-facing
SMS/push left untouched, deliberately — same precedent as prior items: the
client already knows their own booking is an emergency, and "running late"
is routine logistics info to them either way. 2 new tests
(`route.emergency-escalation.test.ts`: escalation case + non-emergency
control), mutation-verified (reverted both files, the escalation test went
RED reproducing the exact missing-🚨 symptom, restored). `tsc --noEmit`
clean, full suite 347/347 files, 1792/1792 tests, zero regressions (one
pre-existing, unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, same precedent as items 17/23/24/26/27/28).

## (30) New today, archetype depth — manager-initiated reassignment push notifications were is_emergency-blind, same class as items (20)/(22)/(24)/(26) — NOW FIXED

Found while re-checking `.../jobs/reassign/route.ts` for item (28)'s
`pay_rate` fix (now flagged separately below, not re-decided). The route
already notifies both sides of a reassignment (`sendPushToTeamMember` to the
incoming tech, and to the outgoing tech if different) — but its booking
`select()` never fetched `is_emergency`, and both push titles were
hardcoded plain strings (`'New job assigned'` / `'Job reassigned'`)
regardless of urgency. Same root pattern as items (20) (schedule-monitor
severity), (22) (release push), (24) (admin new-booking notify), and (26)
(multi-tech extras SMS): a manager-initiated action on a same-day emergency
job produced byte-identical notification wording to a routine reassignment
three weeks out, with no signal to either tech that the job they're
gaining/losing is urgent.

**Fixed** (`p1-w3`) — added `is_emergency` to the route's booking `select()`
and escalated both push titles to `'🚨 Urgent job assigned'` /
`'🚨 Urgent job reassigned'` when true, reusing the same 🚨 convention
already established at every sibling call site above rather than inventing
new wording — no product/copy call needed. 2 new tests
(`route.emergency-push.test.ts`: escalation case asserting both push titles,
routine-job control), mutation-verified (reverted the fix, the escalation
test went RED reproducing the exact plain-title symptom, restored). `tsc
--noEmit` clean, full suite 348/348 files, 1794/1794 tests, zero regressions
(one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items 17/23/24/26/27/28/29).

## (31) New today, fresh ground outside the archetype — three more client-facing SMS confirmation sites never checked sms_consent — NOW FIXED

Continuation of the codebase-wide TCPA compliance sweep begun by items
(19)/(21)/(23) (that convention: every real client-SMS call site gates on
`sms_consent !== false`, matching what the STOP-reply webhook actually
writes — transactional or not, a client who texted STOP shouldn't get
another SMS). Went looking for any client-facing `sendSMS()` call site not
already covered by items (19)/(21)/(23)'s seven audited sites and found
three more real senders that never adopted the convention, all using the
generic multi-tenant `@/lib/sms` wrapper (a bare Telnyx call with no
built-in consent logic, confirmed by reading the module directly):

- `POST /api/client/book` — the public booking widget's own "booking
  received" confirmation, the very first SMS a client ever gets from the
  app (`:469-475`). `data.clients` already carried `sms_consent` via its
  existing `clients(*)` select — the field was fetched, just never checked.
- `POST /api/portal/bookings` — item (12)'s notify+email+SMS fix ported
  `client/book`'s confirmation block verbatim, inheriting the same
  blindness. Its `clients` select only fetched `name, phone, email` — had
  to add `sms_consent` to the select before it could be gated.
- `PUT /api/client/reschedule/[id]` — the reschedule-confirmation SMS
  (`:134-140`). Already had `sms_consent` via `clients(*)`, just unchecked.

Deliberately investigated and left alone, not the same pattern:
- `POST /api/client/confirm/[token]` — its `sendSMS()` call is from a
  *different* module, `@/lib/nycmaid/sms` (the NYC-Maid-specific bot's SMS
  lib), which has its own built-in consent gate keyed on
  `options.recipientType`/`recipientId`, and explicitly passes
  `skipConsent: true` for this one message type (`terms_accepted` — a
  direct reply to the client's own action of tapping a link they were just
  sent). That's a considered, existing design decision baked into the
  wrapper itself, not an oversight — confirmed by reading
  `nycmaid/sms.ts`'s consent-gate logic directly before ruling this one out.
- `portal/collect/route.ts` — a conversational SMS reply inside an
  in-progress two-way texting flow the client themself just sent a message
  into (the "recap" reply after they text back their booking details).
  Whether STOP-consent should gate a direct reply inside an active
  conversation the client initiated is a genuine policy question, not a
  clean match for the "send a confirmation after a form submit" pattern
  the other three fixes share — flagging, not auto-fixing.

**Fixed** (`p1-w3`) — all three gated on `sms_consent !== false`, matching
the codebase's own established convention; no wording/product decision
needed. 6 new tests across three new files (`route.sms-consent.test.ts` in
each of `client/book`, `portal/bookings`, `client/reschedule/[id]`: one
opted-out-skips-the-send case + one not-opted-out-still-sends control per
route), mutation-verified (reverted all three fixes together, all three
opted-out tests went RED reproducing the exact still-sends symptom,
controls unaffected, restored). `tsc --noEmit` clean, full suite 351/351
files, 1800/1800 tests, zero regressions (one pre-existing, unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, same
precedent as items 17/23/24/26/27/28/29/30).

## (32) New today, archetype depth — late-check-in cron's admin alerts were is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30) — NOW FIXED

`GET /api/cron/late-check-in` is the proactive sweep that catches a team
member who never checked in (10+ min overdue) or never checked out (30+
min after the 15-min payment alert) — but its own `SELECT`s for both
checks never fetched `bookings.is_emergency`, so a team member late to
check in/out on a same-day emergency job produced a byte-identical "Late
Check-In"/"Late Check-Out" push, admin SMS, and in-app notification as one
running late on a routine job three weeks out. Same root pattern as items
(20) (schedule-monitor severity), (24) (admin new-booking notify), (26)
(multi-tech extras SMS), (29) (running-late report), and (30) (reassign
push): the owner's first glance at the alert carried no signal that the
job already involved is time-critical — exactly the moment a delay
matters most.

Also found: the admin SMS templates behind this route
(`lateCheckInAdmin`/`lateCheckOutAdmin` in `src/lib/messaging/team-sms.ts`
for cleaning tenants, `smsLateCheckInAdmin`/`smsLateCheckOutAdmin` in
`src/lib/sms-templates.ts` for the other ~23 tenants) had no `is_emergency`
parameter at all, unlike `smsJobAssignment`/`jobAssignment` which already
established the `URGENT — ` prefix convention for this exact scenario
(item (7)/P11.22).

**Fixed** (`p1-w3`) — added `is_emergency` to both cron selects; push
title, in-app notification title/message, and all four admin SMS template
functions now carry a `URGENT — `/`🚨` escalation when true, reusing the
established convention rather than inventing new wording. Team-member-
facing late-reminder SMS left untouched, deliberately — same precedent as
item (29) leaving client-facing copy alone.

Zero test files exist under any `src/app/api/cron/*` route in this repo
(same precedent items 18/20/22 already established) — relies on `tsc
--noEmit` + full-suite verification, not new unit tests. `tsc --noEmit`
clean, full suite 351/351 files, 1800/1800 tests, zero regressions (one
pre-existing, unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, same precedent as items 17/23/24/26/27/28/29/30/31).

## (33) New today, fresh ground outside the archetype — team-portal running-late's client SMS never checked sms_consent, missed by the prior sweep — NOW FIXED

Continuation of the codebase-wide TCPA compliance sweep begun by items
(19)/(21)/(23)/(31) (that convention: every real client-SMS call site
gates on `sms_consent !== false`, matching what the STOP-reply webhook
actually writes). `POST /api/team-portal/running-late`'s client SMS
(`smsRunningLateClient`, sent when a team member reports running late on
their own job) never adopted that convention — the route's booking
`select()` didn't even fetch `sms_consent`. This one specifically slipped
past item (23)'s sweep because that commit's own writeup explicitly noted
"the late-check-in cron never SMS's the client at all, only team+admin" as
a deliberate exclusion — true for the cron, but this sibling team-portal
route (found while re-checking the same file for item (32) above) *does*
SMS the client directly and was never separately audited against the
convention.

**Fixed** (`p1-w3`) — added `sms_consent` to the booking's `clients()`
select and gated the client SMS on `sms_consent !== false`; admin SMS
untouched. 2 new tests (`route.sms-consent.test.ts`: opted-out-skips-the-
send case + not-opted-out control), mutation-verified (reverted the fix,
the opted-out test went RED reproducing the exact still-sends symptom,
control unaffected, restored). `tsc --noEmit` clean, full suite 352/352
files, 1802/1802 tests, zero regressions (one pre-existing, unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, same
precedent as items 17/23/24/26/27/28/29/30/31/32).

## (34) New today, archetype depth — the no-show cron's admin alert was is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30)/(32) — NOW FIXED

`GET /api/cron/no-show-check` (item (18)'s subject — the cron that flips an
unassigned-team-member's booking to `status='no_show'` 45 min after
`start_time` and fires an admin `notify()`) never fetched
`bookings.is_emergency` in its candidate query, so a same-day emergency job
whose assigned tech never checked in produced the byte-identical "No-show
detected" admin email as a routine no-show three weeks out. Same root
pattern as every prior archetype-depth item in this doc: the owner's first
glance at the alert carried no signal that the job was time-critical —
exactly the case where a no-show demands an immediate reassignment call
rather than a routine follow-up. Verified by reading the route directly and
confirming, via `grep -rl is_emergency src/app/api/cron/`, that only
`schedule-monitor` (item 20) and `late-check-in` (item 32) had already
picked up the field among this repo's ~40 cron routes.

**Fixed** (`p1-w3`) — added `is_emergency` to the candidate `select()` and
escalated the admin `notify()` title (`'🚨 Urgent no-show detected'`) and
message (`'🚨 EMERGENCY — '` prefix) when true, reusing the exact convention
items (20)/(32) already established rather than inventing new wording — no
product/copy call needed. Zero test files exist under any
`src/app/api/cron/*` route in this repo (same precedent items 18/20/22/32
already established) — relies on `tsc --noEmit` + full-suite verification.
`tsc --noEmit` clean, full suite 352/352 files, 1802/1802 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33).

## (35) New today, fresh ground outside the archetype — the rating-prompt cron's SELECT referenced two columns that don't exist on `bookings`, same stale-naming class as item (6), silently killing the entire cron for every tenant on every run — NOW FIXED

Continuation of item (6)'s "nycmaid-era `cleaner_id`/`cleaners` naming
against the real `team_member_id`/`team_members` schema" sweep, this time
found in a cron file item (6)'s original BookingsAdmin.tsx-scoped pass never
reached. `GET /api/cron/rating-prompt` (runs every 5 min; sends the "How
was your service today?" Q1 rating text 30+ min after checkout — the trigger
`src/lib/nycmaid/review-engine.ts`'s reply-handling and
`comms-registry.ts`'s `rating_prompt` comm key both already assume is live
and firing) built its candidate query as `.select('id, client_id,
cleaner_id, start_time, clients(name), cleaners(name))` against `bookings`.
Confirmed via `supabase/schema.sql:114` (the real `bookings`/`team_members`
definitions) and a full grep of every `ALTER TABLE ... ADD COLUMN
cleaner_id` in `src/lib/migrations/*.sql` (only `client_reviews.cleaner_id`
and `clients.preferred_cleaner_id` are real — neither is `bookings`) that
`bookings.cleaner_id` has never existed as a column, and there is no
`cleaners` relationship/view PostgREST could resolve against `bookings`
(distinct from `src/lib/nycmaid/*`/`src/lib/selena/*`'s own extensive,
deliberate, separately-tested `.from('cleaners')` usage against a real,
different `cleaners` table — that's an intentional parallel legacy schema,
not this bug; confirmed by checking `smart-schedule.test.ts`'s explicit
`['booking_cleaners', 'cleaners', 'bookings']` table list before ruling it
out). A `.select()` naming a column PostgREST can't resolve returns an
error, not a partial row — and the route's own loop does `if (error)
continue`, silently skipping the tenant. Neither `cleaner_id` nor
`cleaners(name)` is read anywhere else in the function (only `booking.id`
and `booking.client_id` are used) — this select has been pure dead weight
since whatever commit introduced it, and (unlike item (6)'s partial-field
no-ops) it doesn't degrade the feature, it appears to take the entire cron
down for every tenant on every single run: no rating-prompt SMS has ever
gone out, silently, with no error surfaced anywhere an operator would see
it (cron routes have no dashboard-visible failure surface in this
codebase, confirmed by this doc's own item 18/20/22/32 precedent that zero
test files or alerting exist for any cron route).

**Fixed** (`p1-w3`) — dropped both dead, non-existent-column references
from the select (`.select('id, client_id, start_time, clients(name))`),
restoring a valid query; no rename to `team_member_id`/`team_members` was
needed since neither field is consumed by this route at all, unlike item
(6)'s fields which were genuinely read/written. Zero test files exist under
any `src/app/api/cron/*` route in this repo (same precedent as item 34
above) — verification is the same "read the real schema, cross-reference
every migration, confirm no downstream consumer" methodology as item (6)
itself, plus this worktree still has no `.env.local`/Supabase env to
confirm the exact PostgREST error live. `tsc --noEmit` clean, full suite
352/352 files, 1802/1802 tests, zero regressions (unaffected — no existing
test touches this route; one pre-existing, unrelated tenant-scope guard
warning on `fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34).

## (36) New today, archetype depth — the admin's own daily-summary digest never broke out emergency jobs — NOW FIXED

`GET /api/cron/daily-summary` (runs at 8am; the one proactive owner-facing
digest in the codebase — "Today's jobs: N / This week: N / Yesterday's
revenue: $X") counted today's bookings but never checked `is_emergency` at
all, so an owner's very first message of the day carried no signal that any
of today's jobs are time-critical — same root pattern as items
(20)/(24)/(26)/(29)/(30)/(32)/(34), just on the one *summary* surface none of
those per-event alerts touch. Net effect: on a morning with 3 routine jobs
and 1 same-day emergency, the digest read identically to a morning with 4
routine jobs — the owner had to already know to go check the schedule for
anything urgent; the one message designed to orient their whole day gave
zero prioritization signal.

**Fixed** (`p1-w3`) — added a second `count`-only query (`is_emergency: true`,
same date window as the existing `todaysJobs` count) and appended `` (🚨 N
emergency)`` to the "Today's jobs" line only when the count is nonzero (no
copy/product call needed — this reuses the exact 🚨 convention every sibling
alert in this doc already established, just surfaced as a count rather than
a per-booking flag). Also added `emergencyJobsToday` to the notify()
`metadata` payload alongside the existing `todaysJobs`/`yesterdayRevenue`/
`upcomingSchedules` fields, in case a future admin-UI surface wants to read
it structured rather than parse the message string. Team-member 3-day
lookahead and the 30-day recurring-expiration warning (the digest's other
two sections) were left untouched — deliberately out of scope, neither is an
owner-facing urgency signal. Zero test files exist under any
`src/app/api/cron/*` route in this repo (same precedent items
18/20/22/32/34/35 already established) — relies on `tsc --noEmit` +
full-suite verification. `tsc --noEmit` clean, full suite 355/355 files,
1810/1810 tests, zero regressions (one pre-existing, unrelated tenant-scope
guard warning on `fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35).

## (37) New today, fresh ground outside the archetype — the operator's own primary booking CRUD routes never checked sms_consent, missed by every prior sweep — NOW FIXED

Continuation of the codebase-wide TCPA compliance sweep begun by items
(19)/(21)/(23)/(31)/(33) (that convention: every real client-SMS call site
gates on `sms_consent !== false`, matching what the STOP-reply webhook
actually writes). Every prior pass audited *client-initiated* SMS sends
(booking widget, portal self-book, self-serve reschedule, running-late) —
none had traced the *operator/admin*-initiated equivalents, even though
they're arguably higher-volume in practice (an admin/dispatcher creating,
editing, or cancelling a booking on a client's behalf, including phone-in
bookings). Found three real call sites, all using the same bare
`@/lib/sms`-wrapper pattern the prior sweep's audited sites used before their
fix (no built-in consent logic):

- `POST /api/bookings` — the admin/agent booking-create route (the same
  route items (6)/(7) already established as BookingsAdmin.tsx's own manual
  create path, including "Emergency / Same-Day") fires a client
  booking-confirmation SMS on every create; `clients` select never fetched
  `sms_consent`.
- `PUT /api/bookings/[id]` — TWO separate client-facing SMS sends on this one
  route: booking-confirmed (on `status` transitioning to `scheduled`) and
  rescheduled (on `start_time` changing). Neither checked `sms_consent`.
- `DELETE /api/bookings/[id]` — the operator-initiated cancel path (the
  admin-side mirror of item (17)'s already-fixed *tech*-notify gap on this
  same transition) fires a client cancellation SMS with no consent check
  either.
- `POST /api/bookings/batch` — the bulk/recurring-series create route (first
  row only, matching its own existing "notifications sent ONLY for the first
  row" doc comment) has the identical booking-confirmation SMS gap; its
  `clients(*)` select-star already carried `sms_consent` on the raw row, it
  was just never read.

Deliberately checked and left alone, not the same gap: `POST
/api/client/recurring` (the client-portal's own recurring-booking creation)
routes its confirmation through `sendClientSMS()` (`src/lib/nycmaid/
client-contacts.ts`), a wrapper that already threads `recipientType`/
`recipientId` into a consent-aware `sendSMS()` internally — confirmed by
reading the wrapper directly before ruling it out, same "verify before
excluding" method items (19)/(31) used.

**Fixed** (`p1-w3`) — all four sites gated on `sms_consent !== false`, adding
the field to each route's `clients(...)` select (or, for the batch route,
widening the existing `clients(*)`-sourced local type cast, since the raw
column was already present). No wording/product decision needed, matching
every prior item in this compliance sweep. 8 new tests across 3 files
(`bookings/route.sms-consent.test.ts`,
`bookings/[id]/route.sms-consent.test.ts` — covering both the PUT
confirmation path and the DELETE cancellation path — and
`bookings/batch/route.sms-consent.test.ts`), mutation-verified per site
(reverted each fix individually, every opted-out test went RED reproducing
the exact still-sends symptom, positive controls unaffected, restored).
`tsc --noEmit` clean, full suite 355/355 files, 1810/1810 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36).

## (38) New today, archetype depth — the hourly confirmation cron's "team hasn't confirmed after 3 tries" admin alert was is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30)/(32)/(34)/(36) — NOW FIXED

`GET /api/cron/confirmations` (runs hourly; resends a team-member
job-confirmation SMS every ~55 min for the next 48h of `scheduled` jobs, and
after 3+ unanswered attempts fires a `team_no_confirm_alert` admin in-app
notification) never fetched `bookings.is_emergency` in its unconfirmed-jobs
query, so a same-day emergency job whose assigned tech has ignored three
confirmation texts in a row produced the byte-identical "No Confirmation:
{name}" admin alert as a routine job three weeks out going unconfirmed —
exactly the scenario (an emergency assignment silently going unacknowledged)
where the owner most needs a same-day escalation signal, not a routine
follow-up. Verified via `grep -rl is_emergency src/app/api/cron/` (same
method as items 34/36) that this route was one of the remaining cron files
that had not yet picked up the field.

**Fixed** (`p1-w3`) — added `is_emergency` to the `unconfirmedJobs` select
and the shared `BookingUnconfirmed` type (`src/lib/types.ts`), and escalated
the `team_no_confirm_alert` insert's `title` (`'🚨 Urgent No Confirmation:
{name}'`) and `message` (`'🚨 EMERGENCY — '` prefix) when true, reusing the
exact convention items (20)/(32)/(34) already established — no copy/product
call needed. Deliberately left the underlying hourly team-confirm SMS body
itself unescalated (out of scope — that's a wording/product call on whether
the confirm-request text itself should read differently for an emergency
job, distinct from the admin-alert-blindness pattern this doc tracks).
Zero test files exist under any `src/app/api/cron/*` route in this repo
(same precedent as items 18/20/22/32/34/35/36) — relies on `tsc --noEmit` +
full-suite verification. `tsc --noEmit` clean, full suite 355/355 files,
1810/1810 tests, zero regressions (one pre-existing, unrelated tenant-scope
guard warning on `fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37).

## (39) New today, fresh ground outside the archetype — the nightly "Unpaid Team" admin alert silently stops counting a booking once bulk payroll runs, even though the team member was never actually marked paid — NOW FIXED

Found while tracing the codebase's two separate "team got paid" mechanisms
against each other. `POST /api/finance/payroll` (the bulk payroll-run
endpoint) does exactly one thing to `bookings` rows: `UPDATE bookings SET
status = 'paid' WHERE tenant_id=... AND team_member_id=... AND
status='completed'` (`src/app/api/finance/payroll/route.ts:99-104`) — it
never touches the separate `team_paid`/`team_paid_at` columns at all. Those
columns are the codebase's own canonical, more granular "is this team
member actually paid out" tracker — confirmed by reading
`src/app/api/bookings/closeout/route.ts`'s own comment (`"Fully closed" =
payment_status is paid AND team_paid is true`) and its `needsCloseout` query,
which deliberately includes `status IN ('completed','in_progress','paid')`
specifically so a bulk-payroll'd (`status='paid'`) booking still shows up as
needing closeout until `team_paid` is manually confirmed true (e.g. via the
BookingsAdmin.tsx closeout checkbox or `PATCH /api/bookings/[id]/payment`).
`GET /api/cron/reminders`'s own 8am "Unpaid Team" admin alert section,
however, queried `.eq('status', 'completed').or('team_paid.is.null,
team_paid.eq.false')` — completed-only, missing the `'paid'` status entirely.
Net effect: the instant a bulk payroll run fires for a team member, every
one of their completed bookings flips to `status='paid'` and permanently
drops out of this alert's count — even on a booking where `team_paid` was
never actually set true and the dashboard's own "Needs Closeout" queue (the
canonical source of truth per closeout.ts above) still correctly lists it
as outstanding. The one recurring nag alert built specifically to remind the
owner "you still owe your team money on old jobs" loses visibility on
exactly the records closeout.ts still flags as unresolved, right at the
moment a real payroll run happens — the scenario this alert exists for.

**Fixed** (`p1-w3`) — widened the query to `.in('status', ['completed',
'paid'])`, matching the same two relevant statuses closeout.ts's own
`needsCloseout` query already uses for this exact team_paid check (left out
`in_progress` deliberately — this section's own `end_time < 2 days ago`
filter already excludes any job that could plausibly still be in progress,
so adding it would be a no-op, not a correctness fix). Did not touch the
alert's pre-existing lack of per-booking dedup (it re-fires the same count
every 8am until `team_paid` flips true) — a separate, likely-intentional
nagging-pattern design choice, not part of this undercounting bug. Zero test
files exist under any `src/app/api/cron/*` route in this repo (same
precedent as items 18/20/22/32/34/35/36/38) — relies on `tsc --noEmit` +
full-suite verification, plus the same "read the real schema/every writer of
the field before concluding" methodology items (6)/(27)/(35) used (confirmed
via `grep -rn team_paid src/` that `closeout/route.ts` and
`bookings/[id]/payment/route.ts` are the only real writers/readers of the
canonical team_paid contract, and that payroll/route.ts never touches it).
`tsc --noEmit` clean, full suite 355/355 files, 1810/1810 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38).

## (40) New today, archetype depth — the 8am/2pm "Unassigned Bookings" admin alert was is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30)/(32)/(34)/(36)/(38) — NOW FIXED

`GET /api/cron/reminders`' pending-booking-alert section (fires at 8am and
2pm for any `pending`/`scheduled` booking with no `team_member_id`) never
fetched `bookings.is_emergency`, so a same-day emergency job that's still
unassigned produced the byte-identical "N bookings need assignment: Client A
- Fri, Client B - next Tue, ..." notice as a routine job three weeks out
sitting unassigned — exactly the scenario (an emergency job with nobody
dispatched to it) where the owner most needs it to jump out of the list, not
blend in. Worse: the detail preview is hard-capped to the first 5 by
`start_time` ascending, so a same-day emergency booking could be silently
dropped from the preview text entirely whenever 5+ other unassigned bookings
happen to sort ahead of it — emergency or not, anything past the top 5 never
appears. Verified via
`grep -l is_emergency src/app/api/cron/*/route.ts` (same method as items
34/36/38) that `reminders/route.ts` was still missing the field.

**Fixed** (`p1-w3`) — added `is_emergency` to the `pendingBookings` select and
the `BookingPending` type (`src/lib/types.ts`), sorted the list
emergency-first before slicing to the top-5 detail preview (so an emergency
job can no longer be crowded out by routine ones), marked each emergency
entry in the preview with a `🚨` prefix, and escalated both the in-app
notification title and the admin-email title to `🚨 N Emergency + M
Unassigned Bookings` when any are present — reusing the exact convention
items (20)/(32)/(34)/(38) already established. No copy/product call needed.
Zero test files exist under any `src/app/api/cron/*` route in this repo
(same precedent as items 18/20/22/32/34/35/36/38/39) — relies on
`tsc --noEmit` + full-suite verification. `tsc --noEmit` clean, full suite
355/355 files, 1810/1810 tests, zero regressions (one pre-existing, unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, same
precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39).

## (41) New today, fresh ground outside the archetype — the "Payment Due Soon" admin alert fires on jobs already paid in advance — NOW FIXED

Found while tracing every writer of `bookings.payment_status` against the
`reminders/route.ts` "Payment Due Soon" section's own query, same
"read every writer before concluding" method items (6)/(27)/(35)/(39) used.
That section fires an admin alert 10-20 minutes before a booking's
`end_time` for any booking with `status = 'in_progress'` — no
`payment_status` check at all. Two real write paths flip a booking's
`payment_status` to `'paid'` (or `'partial'`) while **deliberately leaving
`status` untouched** at `'in_progress'`: the Stripe pay-link webhook
(`webhooks/stripe/route.ts:427`) and the manual Zelle/Venmo match route
(`admin/payments/confirm-match/route.ts:92`) — confirmed the paid-while-
`in_progress` state is an expected, reachable state (not a fluke) because
the Stripe webhook's own no-booking-ref recovery query
(`webhooks/stripe/route.ts:342`) explicitly searches `in_progress` jobs for
ones where `payment_status` is *not yet* `'paid'`, i.e. the code already
assumes `in_progress` + `payment_status='paid'` is a normal combination.
Net effect: any client who paid in advance (online checkout, or an admin
manually matching a Zelle/Venmo payment mid-job) still gets their job flagged
to the owner as having payment "due in 15 min" the moment it's about to
end — a false alarm on money that's already collected.

**Fixed** (`p1-w3`) — added `.neq('payment_status', 'paid')` to the query.
Deliberately left `'partial'` un-excluded — a job paid only partway still
legitimately has money due on it, so the alert should still fire for the
remainder; only a fully-`'paid'` booking is a false alarm. Zero test files
exist under any `src/app/api/cron/*` route in this repo (same precedent as
items 18/20/22/32/34/35/36/38/39/40) — relies on `tsc --noEmit` + full-suite
verification. `tsc --noEmit` clean, full suite 355/355 files, 1810/1810
tests, zero regressions (one pre-existing, unrelated tenant-scope guard
warning on `fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40).

## (42) New today, archetype depth — the payment-reminder cron's 60-min overdue admin escalation was is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30)/(32)/(34)/(36)/(38)/(40) — NOW FIXED

Both `GET /api/cron/payment-reminder` paths — the generic route's
`admin_tasks` escalation and the NYC Maid-specific
`runNycMaidPaymentReminder`'s own Stage-2 escalation
(`src/lib/nycmaid/payment-reminder.ts`) — never fetched `bookings.is_emergency`,
so a same-day emergency job with payment 60+ min overdue produced the
byte-identical `admin_tasks` entry as a routine job going unpaid.
Verified via `grep -rn is_emergency src/app/api/cron/ src/lib/nycmaid/`
(same method as items 34/36/38/40) that neither path had picked up the
field.

**Fixed** (`p1-w3`) — added `is_emergency` to both queries and escalated
the `admin_tasks` title/description (plus the NYC Maid path's aggregate
`notify()` title and a per-entry `🚨` marker in the flagged-names list,
mirroring item (40)'s list-marking convention), reusing the exact `🚨
Urgent` / `EMERGENCY —` convention items (20)/(32)/(34)/(38)/(40) already
established. Left the outbound SMS bodies (client nudge, admin overdue
SMS, admin bulk `smsAdmins` text) untouched — same "wording/product call,
not the blindness bug" carve-out item (38) used for the confirm-request
SMS body. Zero test files exist for either file (same precedent as items
18/20/22/32/34/35/36/38/39/40/41) — relies on `tsc --noEmit` + full-suite
verification. `tsc --noEmit` clean, full suite 355/355 files, 1810/1810
tests, zero regressions (one pre-existing, unrelated tenant-scope guard
warning on `fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40/41).

## (43) New today, archetype depth — the reminders cron's "Payment Due Soon" alert (the one item (41) had just fixed the false-positive on) was also is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30)/(32)/(34)/(36)/(38)/(40)/(42) — NOW FIXED

Found while re-reading the exact section item (41) had just touched (the
15-min-before-`end_time` in-progress payment alert in
`GET /api/cron/reminders`). Item (41) fixed the false-positive
(already-`paid`) case, but the query still never fetched
`bookings.is_emergency`, so a same-day emergency job with payment due in
15 min produced the byte-identical "Payment Due Soon" admin notification
as a routine job — exactly the scenario (money still owed on an emergency
job about to close out) where the owner most needs it to stand out.

**Fixed** (`p1-w3`) — added `is_emergency` to the `BookingWithPaymentAlert`
type (`src/lib/types.ts`) and the `endingSoon` query, and escalated both
the `notify()` admin email and the in-app notification title/message
using the same `🚨 Urgent` / `EMERGENCY —` convention items
(20)/(32)/(34)/(38)/(40)/(42) already established. Zero test files exist
under any `src/app/api/cron/*` route in this repo (same precedent as items
18/20/22/32/34/35/36/38/39/40/41/42) — relies on `tsc --noEmit` +
full-suite verification. `tsc --noEmit` clean, full suite 355/355 files,
1810/1810 tests, zero regressions (one pre-existing, unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, same
precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40/41/42).

## (44) New today, fresh ground outside the archetype — the payment-reminder cron's generic 60-min overdue escalation created a duplicate open `admin_tasks` row every ~5 min for the same booking — NOW FIXED

Found while tracing the generic payment-reminder route's `admin_tasks`
escalation against its own NYC Maid parity port, same "read the more
careful sibling implementation before concluding" method items
(39)/(41) used. `runNycMaidPaymentReminder`
(`src/lib/nycmaid/payment-reminder.ts`) explicitly guards its Stage-2
`admin_tasks` insert with a "Dedup: one payment_overdue task per booking"
count check before inserting. The generic route's equivalent escalate
branch (`GET /api/cron/payment-reminder`, non-NYC-Maid tenants) has no
such check — it re-selects every booking still sitting in the 15-60 min
post-alert window on every cron run and unconditionally inserts a new
`admin_tasks` row each time, so a single overdue booking that stays
unpaid for the full ~45-min window accumulates roughly 9 duplicate
`'open'` `payment_overdue` tasks (row `status` defaults to `'open'` per
`migrations/011_parity_with_nycmaid.sql`) before aging out of the query —
the one persistent, status-tracked action queue in this codebase
(`admin_tasks`, indexed on `tenant_id`/`status`/`priority`) filling with
duplicates for what is really one unresolved booking.

**Fixed** (`p1-w3`) — added the same
tenant+`related_type`+`related_id`+`type`+`status` count check NYC Maid's
path already uses before the insert, so only the first pass creates the
task; later passes still send the admin SMS nudge every ~5 min (left
untouched — the same intentional repeat-nag pattern item (39)'s doc
already called out and deliberately left alone for the Unpaid Team alert,
not part of this duplicate-row bug). Zero test files exist for this route
(same precedent as items 18/20/22/32/34/35/36/38/39/40/41/42/43) — relies
on `tsc --noEmit` + full-suite verification. `tsc --noEmit` clean, full
suite 355/355 files, 1810/1810 tests, zero regressions (one pre-existing,
unrelated tenant-scope guard warning on `fixture/route.ts`, not touched,
same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40/41/42/43).

## (45) New today, archetype depth — the team-portal 30-min payment alert was is_emergency-blind, same class as items (20)/(24)/(26)/(29)/(30)/(32)/(34)/(36)/(38)/(40)/(42)/(43) — NOW FIXED

Swept every `admin_tasks` write site in the repo (`grep -rln admin_tasks src/app src/lib`)
looking for one this queue hadn't checked yet. `src/app/api/team-portal/15min-alert/route.ts`
(team-member-triggered "30-MIN HEADS UP" payment-collection alert — the nycmaid-ported
`team/30min-alert` route) never selected `bookings.is_emergency` at all, so its admin
SMS (`smsAdmins`), its `notify()` in-app alert, and its undelivered-payment-request
`admin_tasks` escalation were all byte-identical for a same-day emergency job mid-cleanup
vs a routine one — exactly the class items (20)/(24)/(26)/(29)/(30)/(32)/(34)/(36)/(38)/
(40)/(42)/(43) already closed elsewhere. Verified via `grep -n is_emergency` on the file
(same method as items 34/36/38/40/42) returning zero hits before the fix.

**Fixed** (`p1-w3`) — added `is_emergency` to the select + inline result type, and
escalated the admin-facing "30-MIN HEADS UP" SMS heading, the `notify()` title, and the
`payment_request_undelivered` `admin_tasks` title/description using the same `🚨 Urgent`
/ `EMERGENCY —` convention items (20)/(32)/(34)/(38)/(40)/(42)/(43) already established.
Left the client-facing SMS text (`clientSmsText`, the balance-due + pay-link message) and
the delivery-confirmation admin ping (already hardcodes `URGENT` on failure regardless of
emergency status) untouched — same "wording/product call, not the blindness bug" carve-out
item (38)/(42) used. Zero test files exist for this route (same precedent as items
18/20/22/32/34/35/36/38/39/40/41/42/43/44) — relies on `tsc --noEmit` + full-suite
verification. `tsc --noEmit` clean, full suite 355/355 files, 1810/1810 tests, zero
regressions (one pre-existing, unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40/41/42/43/44).

## (46) New today, fresh ground outside the archetype — the email-payment-monitor cron's unmatched-payment path had no idempotency guard, so a slow IMAP round-trip or mid-batch timeout could duplicate `unmatched_payments` + `admin_tasks` rows for the same email every minute — NOW FIXED

Same "read the more careful sibling path before concluding" method items
(39)/(41)/(44) used: `src/app/api/email/monitor/route.ts`'s **matched**-payment
branch (line ~79) already guards against reprocessing with a `payments.raw_email_id`
idempotency check before inserting — but the **unmatched** branch a few lines below
(opens an `unmatched_payments` reconciliation row + an `admin_tasks` entry when no
booking match is found) had no equivalent check. The upstream cron
(`src/app/api/cron/email-monitor/route.ts`, `vercel.json` schedule `* * * * *`) fires
this route every 60 seconds with a matching 60s `maxDuration`; `fetchUnreadEmails` +
per-email Supabase/SMS/notify round-trips run *before* `markEmailRead` is called at
the end of each loop iteration. If that iteration is slow enough to miss the 60s
window, or the process dies between the insert and `markEmailRead`, the email stays
unread — so the next minute's tick reprocesses the identical email and inserts
*another* `unmatched_payments` row and *another* `admin_tasks` row for it, repeating
every minute until the email finally gets marked read. Same duplicate-row shape as
item (44)'s payment-reminder bug, but here it also pollutes the actual Zelle/Venmo
reconciliation queue (`unmatched_payments`), not just the admin task list.

**Fixed** (`p1-w3`) — added the same `raw_email_id` (email `Message-ID`, the
existing dedup key per `payment-email-parser.ts`) lookup against `unmatched_payments`
that the matched branch already runs against `payments`, before the insert; a dup
still gets `markEmailRead` called on it so it doesn't loop forever unread. Zero test
files exist for this route (same precedent as items
18/20/22/32/34/35/36/38/39/40/41/42/43/44/45) — relies on `tsc --noEmit` +
full-suite verification. `tsc --noEmit` clean, full suite 355/355 files, 1810/1810
tests, zero regressions (one pre-existing, unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, same precedent as items
17/23/24/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40/41/42/43/44/45).

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
- Completed-vs-paid undercounting in the ~15 other finance/admin queries
  noted under item (27) above — a real product question (which specific
  reports should treat a paid-out booking as still "completed") worth
  Jeff's call, not auto-fixed.
- `.../jobs/reassign/route.ts` overwriting a booking's `pay_rate` with the
  new assignee's own standard rate on manager-initiated reassignment (item
  (28) above) — same code shape as the claim-route bug just fixed, but a
  manager explicitly choosing to move a job could plausibly want the new
  person paid their own rate going forward. Worth Jeff's call on whether
  reassign should preserve the existing per-job rate (matching claim's new
  behavior) or keep overwriting it; not auto-fixed.

## (47) New today, fresh ground — `post-job-followup`'s dedup markers are written AFTER the customer SMS, not before, so a mid-run crash/timeout can duplicate the review-request text

Archetype-depth sweep this session first tried to extend the `is_emergency`-
blind class (items 20/24/26/29/30/32/34/36/38/40/42/43/45) further: checked
every cron route under `src/app/api/cron/*` (`grep -l is_emergency`) against
every route that touches `bookings` and fires an admin- or client-facing
message. Result: **no further instances found** — the remaining
booking-touching crons without the field are either purely client-facing
with no admin-urgency angle (`confirmation-reminder`, already
dedup-guarded via `sms_logs`), fire *after* the job is already over
(`follow-up`, `payment-followup-daily`, `rating-prompt`, `post-job-followup`
— emergency status is moot once service is complete), or are
platform-level/non-booking (`comms-monitor`, `release-due-payments`, SEO
crons). Also re-swept every `admin_tasks` writer in the repo
(`grep -rln admin_tasks src/app src/lib`) for the item (44)/(46) class of
missing-idempotency-guard bug — all remaining unguarded call sites
(`payment-processor.ts`, `selena-legacy-handlers.ts`,
`webhooks/stripe/route.ts`, `team-portal/15min-alert/route.ts`) are one-shot,
event-triggered inserts (checkout, Stripe webhook, AI-bot tool call, a
team-member tapping a button) rather than a minute/interval cron re-scanning
the same window, so they don't have the repeated-reprocessing shape that
made items (44)/(46) real bugs. Both archetype threads are now believed
exhausted as of this sweep.

Fresh ground turned up on a different axis while confirming that null
result: `post-job-followup/route.ts` (runs `*/30 * * * *` per `vercel.json`,
confirmed) has the *identical* shape of race items (44)/(46) fixed, just one
step removed. Both of its two loops — the per-`booking` review SMS and the
per-`job` review SMS a few lines below — send the customer text **first**,
then write the dedup marker (`[FOLLOWUP_SENT]` appended to `bookings.notes`
for the booking leg; a `job_events` row with `event_type:'review_requested'`
for the jobs leg) only *after* the send succeeds. The candidate query window
for both loops is `[now - delay - 1hr, now - delay]` — a full hour wide
against a 30-minute cadence — so any booking/job that hasn't yet gotten its
marker written stays a live candidate across at least two consecutive ticks,
not just one. Confirmed via direct read that neither loop has any other
guard (no `sms_logs` check — that table is only ever written by the
nycmaid-specific `src/lib/nycmaid/sms.ts` sender; this route calls the
plain, non-logging `src/lib/sms.ts` `sendSMS()` instead, so the
`confirmation-reminder`/`payment-followup-daily` siblings' `sms_logs`-based
dedup pattern isn't available here without switching senders). Net effect:
if the function times out (`maxDuration = 300`, and the handler loops
sequentially over every active tenant plus up to 500 bookings + 200 jobs
each) or crashes anywhere between a successful `sendSMS()` call and its
follow-up marker write, the next tick 30 minutes later finds the same
booking/job still un-marked and texts the customer the identical "How did
everything go?" review request a second time.

Not fixed, and deliberately not reordered to "write the marker, then send"
the way items (44)/(46) moved their guard check earlier — that reorder
closes this exact race for items (44)/(46) for free because the entity
being duplicated there *is* the guard row itself (an `admin_tasks`/
`unmatched_payments` insert with no other side effect in front of it). Here
the customer-facing send is the side effect and the marker is a separate,
later write, so reordering trades one failure mode for a different one:
mark-then-send would mean any ordinary `sendSMS()` failure (bad number,
carrier reject, Telnyx outage) permanently and silently skips that
booking/job's review request forever, since the marker would already be
committed before the send was attempted or confirmed. Today's bug risks an
occasional duplicate "did everything go ok" text (low stakes, "Reply STOP"
present, self-limiting); the reorder would risk silently losing review
requests on any transient send failure (no customer harm, but a quiet
business-metric regression). Genuine trade-off between two failure modes,
not a mechanical no-decision fix like (44)/(46) — flagging for Jeff's call
on which failure mode is preferable, rather than picking one unilaterally.
Verified by reading `post-job-followup/route.ts` in full (both loops),
`vercel.json`'s schedule entry, and `src/lib/sms.ts` /
`src/lib/nycmaid/sms.ts` / `src/lib/nycmaid/client-contacts.ts` directly to
confirm the plain `sendSMS()` this route calls has no `sms_logs` write path
(worktree still has no `.env.local`/Supabase env for a live run, same
constraint as every other item in this doc). No code changed for this item.

## (48) New today, fresh ground — the STOP/START webhook never actually persisted a team member's SMS opt-out/in, and the highest-profile emergency SMS in the app (the urgent-job broadcast) never checked the flag anyway — NOW FIXED

With both the `is_emergency`-blind and duplicate-row hunt threads confirmed
exhausted last pass, this pass took the established `sms_consent` gap class
(items 19/21/23/31/33/37 — all on the *client* side) and asked the mirror
question: is team-member-side `sms_consent` actually enforced end to end?
`src/lib/notify-team.ts` / `notify-team-member.ts` already gate on
`member.sms_consent !== false`, so the codebase clearly intends team members
to have working opt-out — but two things were true at the same time:

1. **The revoke mechanism itself was broken.** In
   `src/app/api/webhooks/telnyx/route.ts`, the STOP handler's client branch
   writes `clients.sms_consent = false`; the very next block ("Also check
   team members") only inserted an admin-facing notification and never wrote
   `team_members.sms_consent` at all — a team member replying STOP got a
   confirmation text saying they'd been unsubscribed, but the flag every
   other code path checks stayed `true` forever. The START/re-subscribe
   handler was worse: it only ever checked `clients`, so a team member had
   no path back in via SMS even if the STOP write had worked.
2. **Several real send sites never checked the flag regardless.** Grepped
   every `sendSMS()` call site targeting a team member's phone
   (`member.phone`/`tm.phone`) across `src/app/api` and found five call
   sites with zero `sms_consent` check, sitting alongside sibling code that
   already does check it (e.g. `payment-processor.ts`'s "payment received"
   cleaner SMS already gates on `sms_consent`, but its two closest
   siblings — `webhooks/stripe/route.ts` and
   `admin/payments/confirm-match/route.ts`, both firing the identical
   "payment received" text on the same event from different trigger paths —
   did not). Most notable for this session's archetype:
   `src/app/api/bookings/broadcast/route.ts` — the "URGENT JOB AVAILABLE,
   first to claim gets it" emergency dispatch broadcast, the one mechanism
   in the app that pages the *entire* active roster for a same-day
   emergency — texted every active member unconditionally, opted-out or
   not.

Fixed both halves:
- `webhooks/telnyx/route.ts`: STOP now writes
  `team_members.sms_consent = false` (scoped `.eq('id', member.id).eq('tenant_id', tenantId)`,
  matching this file's own IDOR-guard-driven convention per item (12) rather
  than relying on the single-tenant-match lookup alone); START now mirrors
  the client branch entirely — looks up the team member by phone, writes
  `sms_consent = true`, and fires the matching `sms_opt_in` admin
  notification (previously absent for team members).
- Gated on `sms_consent !== false` at the five unguarded send sites:
  `bookings/broadcast/route.ts` (urgent job broadcast),
  `cron/reminders/route.ts` (2hr team-member job reminder — the client leg
  two lines above it already had this gate, the team leg didn't),
  `cron/daily-summary/route.ts` (3-day lookahead SMS),
  `cron/confirmations/route.ts` (hourly "please confirm your job" request —
  gating this one also means an opted-out member is no longer nagged by SMS
  they can't stop; the existing item (38) admin escalation still surfaces
  the same unconfirmed job to a human either way, so nothing goes silently
  unnoticed), `webhooks/stripe/route.ts` and
  `admin/payments/confirm-match/route.ts` (payment-received cleaner SMS,
  brought in line with `payment-processor.ts`'s existing guard).
  `routes/[id]/publish/route.ts` also gated, but deliberately *not* made a
  hard failure the way a missing phone number already is — a route can
  still be published (status flip + internal record) even when the SMS leg
  is skipped for consent, matching how every other site here treats consent
  as gating the message, not the underlying action. Left alone,
  deliberately: `pin-reset/route.ts`'s team-member PIN-reset code (a
  self-requested security code, same OTP-exempt precedent as
  `nycmaid/client-contacts.ts`'s `skipConsent:true` pin reminders).
- Added `sms_consent` to `TeamMemberRecord` in `src/lib/types.ts` plus a new
  `TeamMemberNamePhoneConsent` partial-join type (mirroring the existing
  `ClientNamePhoneConsent` pattern), and switched
  `BookingWith2HourReminder`/`BookingUnconfirmed`'s `team_members` field to
  it so the consent flag travels with every query that conditionally SMSes
  a team member instead of being fetched separately or forgotten — same
  rationale the client-side type comment already states.

3 new tests across 2 files (`bookings/broadcast/route.consent.test.ts`,
`webhooks/telnyx/route.stop-start-team.test.ts`), mutation-verified: reverted
the broadcast route's guard and the webhook's STOP/START team-member writes
in turn, confirmed all three tests reproduced the exact pre-fix symptom (RED —
opted-out member still texted; STOP left `sms_consent` at `true`), restored.
The automated IDOR ratchet (`src/lib/idor-route-guard.test.ts`) flagged the
first draft of the STOP/START `team_members` update for missing a sibling
`tenant_id` filter, same as item (12) — fixed to match convention rather than
relying on the tenant-scoped lookup alone. `tsc --noEmit` clean, full suite
357/357 files, 1813/1813 tests, zero regressions (same pre-existing unrelated
tenant-scope guard warning on `fixture/route.ts`, noted since item 17).
Worktree still has no `.env.local`/Supabase env for a live webhook call, same
constraint as every other item in this doc.

## (49) New today, fresh ground — the emergency broadcast's own "URGENT JOB
AVAILABLE" email was silently mangled into an unrelated, unreadable template
for every single send — NOW FIXED

Found while re-tracing `POST /api/bookings/broadcast` (the same route item
(48) just added `sms_consent` gating to) end to end on its email leg, one
level deeper than that fix went. The route builds its own styled HTML
"URGENT JOB AVAILABLE" card (pay rate, date, time, location, service, notes,
a "log in to claim" CTA) and passes it as `notify()`'s `message` param with
`type: 'booking_reminder'`. But `notify()`'s `'booking_reminder'` switch case
(`src/lib/notify.ts:171-180`) unconditionally builds
`bookingReminderEmail({ ..., dateTime: message, ... })` regardless of what
the caller actually intended `message` to be — and `bookingReminderEmail()`
runs `escapeHtml(data.dateTime)` on it. The caller's entire hand-built HTML
card was therefore never sent as real markup: it was escaped into literal,
visible source (`&lt;div style=...&gt;`) and dumped into the generic
template's "Date & Time" field, under a subject/body reading "Hi Client,
this is a reminder that your appointment is soon" (`clientName` defaults to
`'Client'` since the route never sets `metadata.clientName`, `timeUntil`
defaults to `'soon'`) — no pay rate, location, or CTA ever actually
rendered, on **every single email send this route has ever made**. For the
one mechanism in the codebase built to page the whole active roster for a
same-day emergency (item (4)/(18)'s P11.18 gap, closed by item (10)'s
sibling `find-cleaner` feature and this route's own SMS leg), the email half
of that page was unreadable noise from day one. The SMS leg (`smsUrgentBroadcast`)
was unaffected — separate code path, not templated through `notify()`'s
email switch.

**Fixed** (`p1-w3`) — gave the broadcast its own `notify()` type
(`'job_broadcast'`) and a real, dedicated template (`jobBroadcastEmail()` in
`email-templates.ts`, routed through the same `baseTemplate()` branded shell
every other notification type uses) that takes the actual structured fields
(`payRate`, `jobDate`, `jobTime`, `endTime`, `address`, `serviceType`,
`notes`) via `notify()`'s existing `metadata` passthrough instead of a
pre-built HTML blob masquerading as `message`. `bookings/broadcast/route.ts`
no longer hand-builds HTML at all — deleted the ~20-line inline template
(dead code that was never actually sent), now passes a plain-text `message`
summary (used for the DB `notifications.message` column and as the SMS/email
fallback path) plus the structured `metadata`. 2 new tests
(`notify.job-broadcast-email.test.ts`), mutation-verified: reverted the new
`notify.ts` switch case, confirmed the test fails reproducing the exact
pre-fix symptom (RED — rendered email is the generic escaped-message
fallback, missing every structured field), restored. `tsc --noEmit` clean,
full suite 358/358 files, 1815/1815 tests, zero regressions (same
pre-existing unrelated tenant-scope guard warning on `fixture/route.ts`).
Worktree still has no `.env.local`/Supabase env for a live send, same
constraint as every other item in this doc.

## (50) New today, fresh ground — the *other* emergency-dispatch broadcast
(`find-cleaner`) texted opted-out team members unconditionally, same as
item (48) — NOW FIXED

Item (10) documented a second, dormant broadcast mechanism sitting alongside
`bookings/broadcast`: `/api/admin/find-cleaner/{preview,send}`, an
admin-initiated "pick a date/time/zone, mass-text eligible team members"
dispatch tool — not yet live in prod (migration 008's tables are unapplied),
but real, RBAC-gated, tested code that item (48)'s sms_consent sweep never
reached because that sweep was scoped to *send sites*, and `find-cleaner`
wasn't in the five call sites found at the time (its `send/route.ts` uses the
same plain `sendSMS()` from `src/lib/sms.ts`, which has no built-in consent
check — same root cause as every other item-48 site). Confirmed directly:
neither `preview/route.ts`'s eligibility query nor `send/route.ts`'s
recipient query selected `sms_consent` at all, and neither's filter
(`c.phone` / `TEST_MODE` substring only) excluded an opted-out member — an
opted-out team member would show up "eligible" in preview and get texted by
send, identical to the pre-fix `bookings/broadcast` symptom.

**Fixed** (`p1-w3`) — added `sms_consent` to both routes' `team_members`
`.select()` and both routes' filtering: `preview/route.ts` now adds an
`'Opted out of SMS'` entry to `reasons_excluded` (visible to the admin before
they hit send, matching this route's existing UX of surfacing *why* a member
is excluded rather than silently dropping them); `send/route.ts` now drops
`sms_consent === false` members from `recipients` before the broadcast fires,
same `!== false` default-opt-in convention as every other item-48 site. 3 new
tests (`route.consent.test.ts`: opted-out is blocked, consented is sent,
null/unset defaults to sent), mutation-verified via saved patch (`git diff` →
`/tmp/w3-find-cleaner-send.patch` → `git apply -R` → confirmed the opt-out
test fails reproducing the exact pre-fix symptom, RED — opted-out member
still texted → `git apply` restored, GREEN). `tsc --noEmit` clean, full suite
359/359 files, 1818/1818 tests, zero regressions (same pre-existing unrelated
tenant-scope guard warning on `fixture/route.ts`, noted since item 17).
Worktree still has no `.env.local`/Supabase env and this feature's own
migration 008 is unapplied to prod either way, same constraint as every other
item in this doc — file-only fix, no DB migration run.

## (51) New today, archetype depth — `cron/late-check-in`'s own team-member SMS
(the late-check-in AND late-check-out legs) never checked `sms_consent`,
missed by item (48)'s sweep — NOW FIXED

Item (48)'s sweep grepped every `sendSMS()` call site targeting a team
member's phone and found five; re-checking that inventory against every
`admin_tasks`/cron-alert route already touched by the `is_emergency`-blind
archetype-depth thread (items 20/24/26/29/30/32/34/36/38/40/42/43/45) turned
up a sixth site that sweep missed: `cron/late-check-in/route.ts`. Item (32)
already made this route's *admin* alert emergency-aware, but never touched
its separate team-member leg. Confirmed directly — neither of the route's
two `bookings` queries (`lateBookings`, `lateCheckouts`) selected
`team_members.sms_consent`, and both `if (teamLateOn && memberPhone && ...)`
send-gates checked only the tenant-level `team_late_alert` comms preference,
never the individual member's own opt-out. An opted-out team member running
late to check in (or slow to check out) would still get texted every run
this cron fires.

**Fixed** (`p1-w3`) — added `sms_consent` to both `team_members` selects and
gated both send sites on `memberConsent !== false`, same default-opt-in
convention as every item (48)/(50) site. No dedicated test file added — this
cron route (like its `confirmations`/`daily-summary`/`reminders`/
`webhooks/stripe` siblings fixed under item 48) has no existing test harness
to extend; verified by direct read of both loops plus `tsc --noEmit` clean
and the full suite, 359/359 files, 1818/1818 tests, zero regressions (same
pre-existing unrelated tenant-scope guard warning on `fixture/route.ts`).
Worktree still has no `.env.local`/Supabase env for a live cron run, same
constraint as every other item in this doc.

## (52) New today, fresh ground — the missed-call auto-callback SMS
(`telnyx-voice` webhook) sent unconditionally to every caller, bypassing
`sms_consent` even for a known, opted-out client — NOW FIXED

Traced `sendSMS()`'s consent gate in `src/lib/nycmaid/sms.ts` (the wrapper
used by the NYC Maid voice/comhub system) end to end: `checkSMSConsent()`
only runs `if (!options?.skipConsent && options?.recipientType &&
options?.recipientId)` — consent is checked only when the caller supplies
BOTH a recipient type and id, not by default. `telnyx-voice/route.ts`'s
`maybeSendMissedCallSMS()` (fires an automated "sorry we missed your call"
text on `no_answer`/`voicemail`/`hangup_before_pickup`) calls `sendSMS(opts.
customerPhone, MISSED_CALL_SMS_BODY, { smsType: 'missed_call_callback' })`
— no `recipientType`, no `recipientId`, and critically no `skipConsent: true`
either, meaning this wasn't a deliberate OTP-style exemption (like
`pin-reset`'s documented one) but an accidental bypass: the caller simply
never wired up the fields `checkSMSConsent()` needs, so the gate silently
never ran. Net effect: a customer who already texted STOP and has
`clients.sms_consent = false` on their booking record would still get this
automated callback the next time they called and hung up or got voicemail —
`checkSMSConsent()` can't even help here as written, since it only knows how
to look up `'client' | 'cleaner'` by row id, and this call site only has a
raw phone number plus a `comhub_contacts` id (a different table it doesn't
support).

**Fixed** (`p1-w3`) — added a direct `clients` lookup by `tenant_id` +
`phone` (same exact-match E.164 convention as the STOP webhook's own
`clients` lookup in `webhooks/telnyx/route.ts`) immediately before the send,
and skip if `sms_consent === false`. Deliberately narrow: this only blocks
the send when the caller phone matches an existing `clients` row with an
explicit opt-out — an unknown caller (no client match) still gets the
callback, same as before, since silence isn't an opt-out signal. No
dedicated test file added — this route has no existing test harness;
verified by direct read plus `tsc --noEmit` clean and the full suite,
359/359 files, 1818/1818 tests, zero regressions. Worktree still has no
`.env.local`/Supabase env for a live call, same constraint as every other
item in this doc.

## (53) New today — `notify()`'s `channel: 'push'` was a declared type with zero implementation, silently mismarking every push attempt as a delivery failure — NOW FIXED. Digging into why also surfaced a likely-live DB schema/code mismatch for `push_subscriptions` itself — flagged, migration prepared as a file, not applied

With both prior archetype-depth threads (`is_emergency`-blind alerts, items
20-45/51) and the `sms_consent` fresh-ground thread (items 19-50) re-confirmed
exhausted last session, this pass asked the mirror question one level down
from SMS: is the third notification channel — push — actually wired up at
all? `src/lib/notify.ts`'s own type signature declares `channel?: 'email' |
'sms' | 'push'`, but its send switch (`if (channel === 'email' ...) else if
(channel === 'sms' ...)`) had no branch for `'push'` at all. Confirmed the
consequence by reading the full function: a `channel: 'push'` call matches
none of the primary-send conditions (`sent` stays `false`, `lastError` stays
`''`), the fallback block only covers email-to-sms so it doesn't fire either,
and the final classifier (`lastError && UNROUTABLE.has(lastError) ? 'skipped'
: 'failed'`) resolves an empty `lastError` to **`'failed'`** — every push
attempt through `notify()` was recorded as a genuine delivery failure despite
nothing ever being attempted.

Two real call sites hit this, both grepped directly (`channel: 'push'`
across `src/app`/`src/lib`): `cron/daily-summary/route.ts:168` (the team
member's daily "N jobs coming up" push) and, more consequential for this
session's archetype, `src/lib/notify-team-member.ts`'s `notifyTeamMember()` —
the multi-channel (push/email/sms/in-app) wrapper whose real callers are
`bookings/[id]/team/route.ts` (extra-crew job assignment — the exact call
site whose `title` is already `'Added to Emergency Team Job'` when
`is_emergency`, item (7)'s SMS-side fix's direct sibling) and
`client/reschedule/[id]/route.ts` (job reschedule). Worse than the
mislabeling itself: `notifyTeamMember()`'s push branch does `await
notify({channel:'push', ...}); sentPush = true` — unconditional, because
`notify()` never throws on a failed send (it catches internally and returns
`{success:false}`), so the function's own `DeliveryReport.push` field lied by
omission on every call, regardless of outcome.

Confirmed a *working* push mechanism already exists elsewhere in the
codebase (`src/lib/push.ts` — `sendPushToTenantAdmins`/`sendPushToTeamMember`/
`sendPushToClient`, real `web-push`/VAPID delivery against a
`push_subscriptions` table, already called directly — bypassing `notify()`
entirely — by `cron/reminders.ts`, `team-portal/running-late`,
`team-portal/checkout`, `team-portal/jobs/{release,reassign}`, and
`cron/late-check-in`), so this needed no new design — same "activation, not
invention" shape as item (10)'s dormant `find-cleaner` broadcast.

**Fixed** (`p1-w3`) — `notify.ts`'s primary-channel switch now dispatches
`channel: 'push'` to the real functions above, keyed off `recipientType` the
same way email/sms already are (`team_member` -> `sendPushToTeamMember`,
`client` -> `sendPushToClient`, `admin` -> `sendPushToTenantAdmins`). Changed
those three `lib/push.ts` functions to return `Promise<boolean>` (true only
if a subscription existed and a send was attempted — false, not an
exception, when there's nothing to push to) instead of implicit `void`; every
existing caller already ignored the return value (fire-and-forget
`.catch(()=>{})` or bare `await`), so this is additive, not a breaking
change. `'No push subscription for recipient'` / `'No recipient for push
notification'` added to `notify.ts`'s `UNROUTABLE` set so a genuine "nobody
subscribed" case resolves to `status: 'skipped'` (matching the existing
"no email/no phone" convention), not `'failed'` — the fix that actually stops
polluting `cron/system-check`'s "Notification delivery rate" health metric
(check #6), which counts `failed` against a 24h success-rate score. Also
fixed `notify-team-member.ts`'s `sentPush = true` to `sentPush =
result.success`, so `DeliveryReport.push` now reflects reality instead of
being hardcoded. 7 new tests across `notify.push-channel.test.ts` (dispatch
correctness for all three `recipientType`s, skip-not-fail on no subscription,
skip-not-fail on missing recipientId) and
`notify-team-member.push-report.test.ts` (the `DeliveryReport.push` fix,
proven both ways — subscription exists -> `true`, doesn't -> `false`, using a
`quiet_start === quiet_end` seed so the assertion isn't wall-clock-dependent
given this worktree's session runs at 2am ET). `tsc --noEmit` clean, full
suite 361/361 files, 1825/1825 tests, zero regressions (same pre-existing
unrelated tenant-scope guard warning on `fixture/route.ts`, noted since item
17).

**Not fixed, flagged instead — a likely-live schema/code mismatch found while
verifying the above.** Confirmed `lib/push.ts` and
`api/push/subscribe/route.ts` consistently read/write
`push_subscriptions.endpoint`/`role`/`client_id`/`team_member_id`/
`updated_at`. But this repo's own tracked migration history defines that
table TWICE, with incompatible shapes: `src/lib/migrations/
008_missing_tables_and_columns.sql` creates `push_subscriptions(id,
tenant_id, user_type, user_id, subscription, created_at)` — no `endpoint`,
`role`, `client_id`, or `team_member_id` at all — and `migrations/
2026_05_19_remaining_tables.sql` separately creates `push_subscriptions`
with exactly the columns the app code uses. Both are `CREATE TABLE IF NOT
EXISTS`, which is a silent no-op against an already-existing
differently-shaped table — it does not `ALTER` it. If 008 applied first (its
number places it early in the numbered track; the dated file is from
2026-05-19), the live table is very likely still stuck on the old
`user_type`/`user_id` shape, meaning every `push_subscriptions` query in the
current codebase — not just the `notify()` gap this item fixes, but the
already-"working" direct callers like `cron/reminders.ts` too — has been
erroring at the DB layer (column does not exist) since inception. Worktree
has no `.env.local`/Supabase env to check the live `information_schema`
directly, so this is flagged with strong static evidence rather than
asserted as confirmed fact, per this doc's standing verification discipline.
Bonus finding while comparing the two definitions: the 2026-05-19 shape's own
`CHECK (role IN ('admin','cleaner','client'))` doesn't even match its own
codebase's usage — `push/subscribe/route.ts` writes `role: 'team_member'`,
not `'cleaner'` — the identical nycmaid-era-naming mismatch class as item
(6), just baked into a DB constraint instead of application code, so even
under the "code-matching" shape a team-member push subscribe could be
rejected outright if that CHECK is live. Prepared, not applied (prod DDL
needs Jeff's per-migration go per the standing rule):
`src/lib/migrations/063_push_subscriptions_schema_drift.sql` — additive-only
(`ADD COLUMN IF NOT EXISTS` for the missing columns, guarded unique
constraint, supporting indexes), deliberately leaves `NOT NULL` tightening
and the `role` CHECK constraint as documented PRE-run manual checks rather
than guessing at current live state or an existing constraint's name.

## (54) New today, archetype depth — the emergency dispatch broadcast never used the push channel item (53) just wired up — NOW FIXED

Direct continuation of item (53): with `notify()`'s `channel:'push'` now a
real, working delivery path for `recipientType:'team_member'`, re-checked
whether the one mechanism in the app that pages the *entire* active roster
for a same-day emergency — `POST /api/bookings/broadcast`, this session's
own item (48)/(49)/(50) subject — actually uses it. It didn't: the route's
per-member loop only ever sent sms and email, so a tech with push enabled
but no phone on file, or with SMS consent revoked, got zero notification of
an available urgent job through this route, and a push-only tech got
nothing at all. Confirmed by reading the full per-member loop directly — no
`channel:'push'` call anywhere in the file.

**Fixed** (`p1-w3`) — added push as a third per-member broadcast leg using
the exact `notify({channel:'push', recipientType:'team_member', ...})`
convention item (53) itself established; no new design needed, same
"activation, not invention" shape as item (53)'s own fix. `reports`/`sentTo`
now include push, so a push-only delivery (no phone/email on file) still
counts as reached. 3 new tests (`route.push-channel.test.ts`): push
dispatched per member with the right `recipientType`/`type`, each member's
own push outcome reported independently (not a blanket true), and a
push-only delivery counts toward `sentTo`. Mutation-verified via saved
patch: reverted the fix, confirmed all 3 new tests fail reproducing the
exact pre-fix symptom (RED — zero push calls, no `push` field), reapplied
(GREEN). `tsc --noEmit` clean, full suite 362/362 files, 1828/1828 tests,
zero regressions (same pre-existing unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, noted since item 17).

## (55) New today, fresh ground outside the archetype — the campaign email delivered/opened/bounced tracking pipeline has been dead code since inception; three columns it depends on don't exist. Migration prepared, not applied

With both prior archetype-depth threads and this session's `sms_consent`
fresh-ground thread re-confirmed exhausted, and item (53)/(54) closing the
push-channel gap, this pass asked a parallel question on the email side of
the same notification layer: does the campaign email feedback loop
(delivered/opened/bounced) actually work? Traced `webhooks/resend/route.ts`
end to end: on `email.delivered`/`email.opened`/`email.bounced`, it looks up
`campaign_recipients` by `.eq('resend_email_id', emailId)` and, on match,
writes `delivered_at`/`opened_at` alongside the status update — then
recounts the campaign's aggregate `delivered_count`/`opened_count`/
`failed_count` from the table. Grepped `resend_email_id` across the whole
codebase (`grep -rn resend_email_id src`): the only *write* site is
`inbound_emails` (a different table entirely, for received mail, not
outbound tracking) — nothing ever writes `resend_email_id` onto a
`campaign_recipients` row. Confirmed via every tracked migration that has
ever touched `campaign_recipients`
(`008_missing_tables_and_columns.sql`'s original `CREATE TABLE`,
`010_nycmaid_parity_columns_2.sql`'s later `sent_at` add — the only two
migrations that reference this table at all): the table has never had a
`resend_email_id`, `delivered_at`, or `opened_at` column. All three are
referenced only by this one webhook and don't exist anywhere in the schema
history. Net effect: `.eq('resend_email_id', ...)` either errors (column
doesn't exist) or matches zero rows every time, so the webhook silently
does nothing on every delivered/opened/bounced event it's ever received —
caught by the route's own outer `try/catch` (`return { ok: true }` on any
error) — and a campaign's delivered/opened/bounced counts have never
reflected real Resend delivery outcomes, only the sender's own local
try/catch result (`sent` vs `failed`) at the moment of the send call itself.
Worktree has no `.env.local`/Supabase env to confirm the live
`information_schema` directly, so — same discipline as item (53)'s
schema-drift flag — this is strong static evidence, not asserted as 100%
confirmed live fact.

Even fixing the schema wouldn't fully close the loop on its own: traced
`campaigns/send/route.ts` (the actual per-recipient-tracking send path that
populates `campaign_recipients`) and `notify.ts`'s email branch — `sendEmail()`
already returns Resend's response `data` (which carries the new email's
`id`), but `notify()` never captures or returns it, so even the *caller*
currently has no way to persist a `resend_email_id` at send time. Two
separable pieces: (a) the schema needs the three columns, (b) the send path
needs to capture and store the id `sendEmail()` already gives back. Not
fixed — (a) is real prod DDL needing Jeff's per-migration approval per the
standing rule, and doing (b) before (a) is live would mean writing to a
column that doesn't yet exist (silent no-op at best, error at worst, in
prod), so the application-code half is deliberately deferred until the
migration is applied rather than half-wiring it now. Migration prepared,
not applied: `src/lib/migrations/064_campaign_recipients_resend_tracking_columns.sql`
— additive-only (`ADD COLUMN IF NOT EXISTS` for all three columns, a
partial index on `resend_email_id` for the webhook's lookup query). Verified
by reading `webhooks/resend/route.ts`, `campaigns/send/route.ts`,
`campaigns/[id]/send/route.ts` (the sibling send route — also never touches
`campaign_recipients` at all, a separate, already-known-to-this-doc code
path, not the one this finding is about), `notify.ts`'s email branch, and
`email.ts`'s `sendEmail()` return value directly, plus every tracked
migration referencing `campaign_recipients` by name
(`grep -rln campaign_recipients src/lib/migrations`).

## (56) New today, archetype depth — the emergency reschedule's push notification to the assigned tech was itself is_emergency-blind, and quiet hours silently swallowed it overnight with no urgency exception — NOW FIXED

Direct continuation of item (53)'s push-channel activation: with `notify()`'s
`channel:'push'` now real, checked whether the one caller of
`notify-team-member.ts`'s `notifyTeamMember()` that sits squarely in this
session's price-transparency/urgency trilogy — `PUT
/api/client/reschedule/[id]` (item (11)'s subject, the route whose own
`becomesEmergency` logic flips `is_emergency` true when a client moves an
existing booking to today) — actually surfaces that urgency on the push leg.
It didn't, two ways at once:

1. **The call site itself was blind.** Its `notifyTeamMember()` call hardcoded
   `title: 'Job Rescheduled'` and a plain `message`, never reading
   `updated.is_emergency` (already on the row it just wrote) or passing
   anything urgency-shaped — unlike its own sibling `smsMessage:
   smsJobRescheduled(...)` on the very same call, which item (11) already made
   emergency-aware. The push/in-app leg of this exact notification never got
   the same treatment.
2. **`notifyTeamMember()`'s push leg had no urgency escape hatch from quiet
   hours at all.** `notify-team-member.ts:145` suppressed push
   unconditionally whenever `isQuietHours()` was true (default window
   22:00-07:00) — no exception for any notification type, urgent or not. This
   directly contradicts the established convention in this file's own older
   sibling, `notify-team.ts` (used by the extra-crew assignment path, item
   (7)'s original subject): that file's SMS and email legs are explicitly
   commented "still delivered during quiet hours for urgent notifications."
   `notify-team-member.ts` added a push channel later (item (53)) without
   porting that same exception. Net effect: a tech whose routine job just got
   moved into a same-day emergency by the client (the exact scenario item (11)
   already prices/flags correctly) got a generic "Job Rescheduled" push with
   no urgency signal — and if the reschedule landed overnight, exactly when a
   real emergency is statistically most likely, the push was silently dropped
   entirely with zero exception, on the one channel most likely to actually
   wake someone up. Verified by reading `notify-team-member.ts` in full,
   `client/reschedule/[id]/route.ts`'s notification fan-out block, and
   confirming via `grep -rln "from '@/lib/notify-team-member'\|from
   '@/lib/notify-team'" src/app/api` that this route is the only caller of the
   push-capable `notify-team-member.ts` (the extra-crew path uses the
   push-less `notify-team.ts` instead, so it isn't affected by this
   particular gap).

**Fixed** (`p1-w3`) — added an optional `isEmergency` field to
`NotifyTeamMemberOptions`; the push gate is now `if (wantsPush && (!quiet ||
isEmergency))`, porting `notify-team.ts`'s own "urgent notifications still
delivered during quiet hours" convention onto the push channel it never had.
`client/reschedule/[id]/route.ts`'s call site now reads
`Boolean(updated.is_emergency)` and passes `isEmergency` plus an
urgency-aware title (`'🚨 Job Rescheduled — Now Urgent'`) and message,
matching the 🚨-prefix convention `bookings/[id]/team/route.ts` already
established for the sibling assignment-notification title. 4 new tests:
`notify-team-member.emergency-quiet-hours.test.ts` (routine push suppressed
at 2am inside the default quiet window; `isEmergency:true` push still
delivered at the same 2am, using `vi.setSystemTime` for a deterministic
clock rather than a wall-clock-dependent quiet-window guess) and
`route.emergency-push-title.test.ts` (the route's call site passes
`isEmergency:true` + the urgent title/message when rescheduling to today,
`isEmergency:false` + the generic title on the future-date control).
Mutation-verified via saved patch (`git diff` → `/tmp/w3-emergency-quiet-
hours.patch` → `git apply -R` → all 3 new assertions failed reproducing the
exact pre-fix symptom, RED — push not delivered / `isEmergency` undefined →
`git apply` restored, GREEN). `tsc --noEmit` clean, full suite 364/364
files, 1832/1832 tests, zero regressions (same pre-existing unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, noted since
item 17). Worktree still has no `.env.local`/Supabase env for a live push
send, same constraint as every other item in this doc.

## (57) New today, fresh ground outside the archetype — campaign SMS delivery/failed tracking has the identical dead-column gap item (55) found on the email side, and it isn't covered by item (55)'s own migration 064

Direct continuation of item (55)'s pattern, one channel over: with the
Resend/email side of `campaign_recipients` delivery tracking confirmed dead
code (migration 064, unapplied), checked whether the Telnyx/SMS side of the
identical feature actually works. It doesn't, for the identical reason.
`webhooks/telnyx/route.ts`'s `message.sent`/`message.delivered`/
`message.failed` handler (`:41-93`) looks up
`campaign_recipients` by `.eq('telnyx_message_id', msgId)` and, on match,
writes `status`/`delivered_at` then recounts the campaign's
`delivered_count`/`failed_count`. Grepped every tracked migration that has
ever touched `campaign_recipients`
(`008_missing_tables_and_columns.sql`'s original `CREATE TABLE`,
`010_nycmaid_parity_columns_2.sql`'s `sent_at` add, and item (55)'s own
`064_campaign_recipients_resend_tracking_columns.sql` which only adds
`resend_email_id`/`delivered_at`/`opened_at`): **`telnyx_message_id` has
never been a column on this table, in any tracked migration.** The
identically-named column does exist, but on a different table entirely —
`sms_logs` (`migrations/2026_05_19_remaining_tables.sql:93`), the general
SMS log, not campaign tracking. Confirmed the send side has the matching
gap `notify()`'s email branch had before this pass: `sendSMS()`
(`src/lib/sms.ts:47`) already `return res.json()`s Telnyx's raw response,
which carries the new message's id — this codebase already knows how to
capture and store that exact value under the name `telnyx_message_id` at a
different call site (`src/lib/nycmaid/sms.ts:172`, on `sms_logs`) — but
`notify.ts`'s SMS branch (`:319-326`) calls `await sendSMS(...)` and
discards the return value entirely (`sent = true`), and
`campaigns/send/route.ts`'s SMS send loop (`:184-215`) never captures
anything from the `notify()` call to store on the recipient row either. Net
effect: identical to item (55) but for SMS — a campaign's
`delivered_count`/`failed_count` for the SMS channel has never reflected
real Telnyx delivery outcomes, only the sender's own local try/catch result
at send time, and every Telnyx delivery-status webhook Telnyx has ever sent
for a campaign SMS has silently done nothing (`.eq('telnyx_message_id',
msgId)` either errors or matches zero rows, caught by whatever
try/catch wraps this handler). Worktree has no `.env.local`/Supabase env to
confirm live `information_schema` directly, same discipline as items
(53)/(55).

Not fixed — same two separable pieces item (55) identified, on the other
channel: (a) real prod DDL needing Jeff's per-migration approval, and (b)
capturing/storing the Telnyx message id at send time, deliberately deferred
until (a) is live in prod (writing to a column that doesn't yet exist would
silently no-op at best, error at worst). Migration prepared, not applied:
`src/lib/migrations/065_campaign_recipients_telnyx_tracking_column.sql` —
additive-only (`ADD COLUMN IF NOT EXISTS telnyx_message_id`, a partial index
matching migration 064's own `resend_email_id` index shape). Verified by
reading `webhooks/telnyx/route.ts`'s delivery-tracking block,
`campaigns/send/route.ts`'s SMS send loop, `notify.ts`'s SMS branch,
`sms.ts`'s `sendSMS()` return value, and `nycmaid/sms.ts`'s existing
`telnyx_message_id` capture pattern directly, plus every tracked migration
referencing `campaign_recipients` by name
(`grep -rln campaign_recipients src/lib/migrations migrations`).

## (58) New today, archetype depth — the client's own reschedule-into-emergency notifications (email + SMS) were silent on urgency/rate, the one half item (56) didn't cover — NOW FIXED

Direct continuation of item (56): that item fixed the assigned tech's
push/quiet-hours leg of `PUT /api/client/reschedule/[id]`'s
reschedule-into-same-day-emergency event. Checking the *client's own* two
notification channels for the identical event found both still fully
`is_emergency`-blind. The route's inline confirmation email
(`sendEmail({...})` built directly in the route, not via any shared
template) never read `updated.is_emergency` at all. The client SMS —
resolved via `clientSmsTemplates(tenant).reschedule(updated)` — fares no
better on either branch: for generic (non-cleaning) tenants it calls
`smsReschedule(bizName, booking: { start_time: string })` in
`sms-templates.ts`, whose signature didn't even accept an emergency field;
for cleaning tenants it calls `reschedule()` in `sms-cleaning.ts`, whose
`BookingLike` type already carries `is_emergency` (every sibling function in
that same file reads it) but `reschedule()` itself never did. Confirmed via
direct reads of all four functions plus the route. The client is the one
actually billed the emergency rate, so of the two halves of this event —
tech notification (item 56) and client notification (this item) — the
client half is the more consequential one to have been silent, mirroring
item (3)'s original chargeback/dispute framing but for a reschedule rather
than initial booking.

**Fixed** (`p1-w3`) — added an optional `is_emergency` field to
`smsReschedule`/`smsRescheduleES` (`sms-templates.ts`) and read the
already-present field in `sms-cleaning.ts`'s `reschedule`/`rescheduleES`;
all four now append an urgency notice ("this is now a same-day/emergency
appointment/booking — our emergency rate applies") instead of byte-identical
routine copy. Matches the established convention
(`smsJobRescheduled`'s own `URGENT —` prefix, item (3)'s suggested
"emergency/after-hours rate applies" fallback wording) without inventing a
price field — the dollar-figure display remains item (3)'s open product
decision. The reschedule route itself now hoists `isEmergency` above the
client email/SMS blocks (previously only computed inside the team-member
block) and injects a matching notice into its inline HTML. 4 new test
files, 10 assertions covering both languages, both tenant types (generic +
cleaning), and the route's actual email/SMS payloads end to end.
Mutation-verified via saved patch (`git diff` → `git apply -R` → all 6
assertions across the 3 route/lib test files failed reproducing the exact
pre-fix symptom, RED — no urgency wording on either channel → `git apply`
restored, GREEN). `tsc --noEmit` clean, full suite 367/367 files, 1842/1842
tests, zero regressions (same pre-existing unrelated tenant-scope guard
warning on `fixture/route.ts`, not touched, noted since item 17).

## (59) New today, fresh ground outside the archetype — a referral commission auto-created at checkout told admin but never the referrer, except for one hardcoded tenant — NOW FIXED

With the reschedule-into-emergency thread (item 58) closed, this pass
checked a subsystem this doc hasn't touched yet: the referral/affiliate
commission ledger. `POST /api/team-portal/checkout` auto-creates a
`referral_commissions` row on job completion when the booking has a
`referrer_id` (idempotent via `UNIQUE(booking_id)`, a documented no-op on
re-checkout) and bumps `referrers.total_earned` — but the referrer
themselves, the person actually owed the money and the one this
notification exists to keep engaged for future referrals, was only ever
emailed inside a hardcoded `isNycMaid(auth.tid)` branch explicitly labeled
"NYC Maid parity." Every other trades tenant running the referral program
got the commission ledgered and an internal admin notification inserted,
in total silence on the referrer's own channel. Checked whether the
*other* commission-creation path covers this: `POST
/api/referral-commissions` (admin-created, for a booking the checkout path
didn't already handle) has the identical gap — its `notify()` call is
`recipientType: 'admin'`, never the referrer directly. The checkout route's
own comment even flagged this outright ("Referrer-notification email not
ported — flagged."), just never acted on until now. Confirmed by reading
both commission-creation routes end to end and grepping every
`referral_commissions` reference in the codebase.

**Fixed** (`p1-w3`) — generalized the referrer-earned-commission email to
every tenant, gated on the tenant actually having Resend configured (the
same precondition the client-facing reschedule route already checks before
sending), using the same generic `sendEmail()` those client-facing routes
use rather than the nycmaid-only helper. The nycmaid branch is untouched —
still uses its own richer nycmaid-specific template, this fix only covers
the tenants that previously got nothing. 2 new tests
(`route.referrer-commission-email.test.ts`): a non-nycmaid tenant with
`resend_api_key` configured now emails the referrer directly (to/subject/
html/key all asserted against the actual `sendEmail()` call), and a tenant
with no `resend_api_key` configured is a silent no-op, not a crash.
Mutation-verified via saved patch (`git diff` → `git apply -R` → the "emails
the referrer" assertion failed reproducing the exact pre-fix symptom — zero
`sendEmail` calls, RED → `git apply` restored, GREEN). `tsc --noEmit`
clean, full suite 368/368 files, 1844/1844 tests, zero regressions (same
pre-existing unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, noted since item 17).

## (60) New today, archetype depth — extras added to a booking's team never used the push channel items (53)/(56) established — NOW FIXED

`PUT /api/bookings/[id]/team` (multi-tech team management — item 26's own
call site) notified newly-added extra team members through
`@/lib/notify-team.ts`, an older module with no push channel at all:
SMS + email + in-app only. The route's own title already branded emergency
team additions (`🚨 Added to Emergency Team Job`), and item 26's test for
this exact call site even asserted "the push title gets the same 🚨
convention" — but no push send ever existed on this path to carry that
title. A push-only tech (no phone on file, or SMS-consent revoked per item
48's sweep) got zero notification of being added to a job, including an
emergency one — the same class of gap items (53)/(54) fixed for the
roster-wide emergency broadcast, just a different call site that sweep
never reached because it lived in a different, push-less sibling module.

**Fixed** (`p1-w3`) — switched this call site from `notify-team.ts` to
`notify-team-member.ts`, the module items (53)/(54)/(56) already wired with
a real push leg and an `isEmergency` quiet-hours bypass, passing
`isEmergency: !!bookingFull?.is_emergency` through. `notify-team.ts` itself
is now unreferenced by any source file (only historical tests touched it)
— left in place, not deleted; out of scope for this fix. Updated the
existing `route.emergency-sms.test.ts` (which mocked the old module path)
to mock `notify-team-member.ts` instead and assert `isEmergency` flows
through on both the emergency and routine control cases. Mutation-verified
via saved patch (`git diff` → `git apply -R` → both tests failed
reproducing the exact pre-fix symptom — the mock never hit since the route
no longer imported that path, RED → `git apply` restored, GREEN).
`tsc --noEmit` clean, full suite 368/368 files, 1844/1844 tests, zero
regressions (same pre-existing unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, noted since item 17).

## (61) New today, fresh ground outside the archetype — item (59)'s own fix comment flagged this exact route as having the identical gap, left unfixed until now — NOW FIXED

Item (59) fixed the referrer-never-notified gap on the auto-created
checkout path (`POST /api/team-portal/checkout`) and its own fix comment
named the admin-created sibling path (`POST /api/referral-commissions`,
used when a booking's referral wasn't auto-caught at checkout) as having
"the identical gap" — but that sibling was only flagged, not fixed. Read:
its `notify()` call is gated on `if (ref.email)` yet sends with
`recipientType: 'admin'`, so the referrer's own address is checked and then
never actually used as the recipient. Every admin-created commission told
the tenant admin and left the referrer — the person actually owed the
money — silent, on every tenant including nycmaid (item 59's nycmaid
branch only covers the checkout path).

**Fixed** (`p1-w3`) — applied item (59)'s identical fix to this route:
nycmaid keeps its own richer template via the same `isNycMaid(tenantId)`
branch, every other tenant gets the generic `sendEmail()` gated on the
tenant having `resend_api_key` configured. The existing admin `notify()`
call is untouched — this adds the referrer email as a second, independent
send. 2 new tests (`route.referrer-commission-email.test.ts`), mirroring
item (59)'s own test shape: a non-nycmaid tenant with `resend_api_key`
configured now emails the referrer directly (to/subject/html/key asserted
against the real `sendEmail()` call), and a tenant with no `resend_api_key`
configured is a silent no-op, not a crash. Mutation-verified via saved
patch (`git diff` → `git apply -R` → the "emails the referrer" assertion
failed reproducing the exact pre-fix symptom, RED → `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 369/369 files, 1846/1846 tests,
zero regressions.

## (62) New today, archetype depth — `jobs/reassign` was the only team-member push in the codebase still bypassing `notifyTeamMember()`, the channel items (53)/(54)/(56)/(58)/(60) already established — NOW FIXED

Grepped every call site of `sendPushToTeamMember()` (the raw push primitive)
and `notifyTeamMember()` (the quiet-hours/per-type-prefs/SMS/email/in-app
wrapper around it) across the codebase. Every team-member-facing
notification route now goes through the wrapper — except one:
`POST /api/team-portal/jobs/reassign` called `sendPushToTeamMember()`
directly for both the incoming and outgoing tech, the exact shape of gap
item (60) fixed at a different call site. Net effect, worse than item (60)
in one respect: no in-app notification row for either side of a
reassignment, no SMS/email fallback for a push-less or push-declined tech,
no item (48) SMS-consent gate, and — the inverse of the usual quiet-hours
bug — a **routine** reassignment always pushed regardless of the hour,
since this call site had no quiet-hours check of any kind to bypass.
Confirmed via `grep -rln sendPushToTeamMember src/` (only this route and
the primitives themselves) vs `grep -rln notifyTeamMember\(` (only
`bookings/[id]/team/route.ts` and `client/reschedule/[id]/route.ts`, both
already migrated).

**Fixed** (`p1-w3`) — switched both notifications (to the incoming member:
type `job_assignment`, matching item (60)'s own convention; to the outgoing
member: type `job_cancelled`, the closest existing semantic fit for
"you no longer have this job") to `notifyTeamMember()`, wiring a real
`smsMessage` for each via the already-existing `teamSmsTemplates(...)
.jobAssignment()` resolver (incoming side) and `smsJobCancelled()` (outgoing
side) — both templates already `is_emergency`/`pay_rate`-aware from items
(7)/(26). `skipEmail: true` on both, matching item (60)'s team/route.ts
precedent for this event class. 1 existing test file updated
(`route.emergency-push.test.ts`, previously mocked `sendPushToTeamMember`
directly) to mock `notifyTeamMember` instead and assert `isEmergency`,
`type`, and the actual rendered `smsMessage` content (URGENT + pay line on
the emergency case, absent on the routine control) flow through correctly.
Mutation-verified via saved patch (`git diff` → `git apply -R` → both
assertions on call count dropped to 0, reproducing the exact pre-fix
symptom — the route no longer called the mocked module at all, RED →
`git apply` restored, GREEN). `tsc --noEmit` clean, full suite 369/369
files, 1846/1846 tests, zero regressions (same pre-existing unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, noted since
item 17).

## (63) New today, fresh ground outside the archetype — `quote_viewed` has been a declared notification type since this codebase's beginning and no call site has ever fired it — NOW FIXED

`notify.ts`'s own `NotificationType` union declares `'quote_viewed'`
alongside `quote_sent`/`quote_accepted`/`quote_declined`/`quote_expired` —
but `grep -rn quote_viewed src/` turns up exactly one hit: the union
declaration itself. The event it should represent is very much tracked:
`GET /api/quotes/public/[token]` (the public, token-authenticated proposal
view) already bumps `view_count`/`last_viewed_at`, sets `first_viewed_at`
on the first open, flips `status` from `sent` to `viewed`, and inserts a
`quote_events` row with `event_type: 'viewed'` — every piece of bookkeeping
a real feature needs, just never wired to a `notify()` call or an
`ownerAlert()`. Compare the two sibling terminal events on the same public
token surface: both `POST .../accept` and `POST .../decline` fire `notify()`
(populates the admin's in-app notifications list) *and* `ownerAlert()`
(branded email + SMS to every tenant admin) the moment the customer acts.
A customer opening a $-value proposal for the first time — arguably the
single most actionable "call them now, they're looking at it" signal in
the entire sales-hub pipeline — produced total silence on every channel.
Confirmed by reading both sibling routes end to end and grepping
`quote_viewed` across the whole tracked source tree.

**Fixed** (`p1-w3`) — added the identical `notify()` + `ownerAlert()` pair
the accept/decline routes already use, gated on `isFirstView` (the same
`!quote.first_viewed_at` condition the route already computes to decide
whether to set `first_viewed_at` at all) so a proposal reopened many times
doesn't re-notify on every refresh — unlike accept/decline, which are
one-shot terminal events and never needed this guard. 2 new tests
(`route.viewed-notify.test.ts`): a first view fires both `notify()` (type
`quote_viewed`, `recipientType: 'admin'`) and `ownerAlert()` exactly once;
a second view (`first_viewed_at` already set) fires neither. Mutation-
verified via saved patch (`git diff` → `git apply -R` → the first-view
assertion dropped to 0 calls, reproducing the exact pre-fix symptom, RED →
`git apply` restored, GREEN). `tsc --noEmit` clean, full suite 370/370
files, 1848/1848 tests, zero regressions (same pre-existing unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, noted since
item 17).

## (64) New today, archetype depth — `POST /api/bookings`' team-member assignment was the last live call site sending a raw SMS instead of routing through `notifyTeamMember()` — NOW FIXED

Every other team-member-facing event (job add, reassign, reschedule)
already goes through `notifyTeamMember()` — items (53)/(54)/(56)/(58)/(60)/
(62) established it as the one true channel (push + in-app + quiet-hours +
per-type prefs + SMS-consent gate). The booking-creation route itself, the
single most fundamental team-member notification (a brand-new job
assignment), never migrated: it sent a raw `sendSMS()` with no push leg at
all, no in-app notification row, no quiet-hours check, and — unlike the
client SMS block two lines above it — no `sms_consent` gate, the item (48)
sweep never reached because this call site predates it. A push-only tech
(no phone on file, or SMS-consent revoked) got zero notice of being
assigned to a brand-new job, including an emergency one. Confirmed via
`grep -rln sendPushToTeamMember\|notifyTeamMember\( src/` across every
team-member-facing route (only this one still bypassed the wrapper) plus a
direct read of the route's notification block.

**Fixed** (`p1-w3`) — switched to `notifyTeamMember()`, matching item
(60)/(62)'s convention: type `job_assignment`, 🚨-prefixed title when
`is_emergency`, `skipEmail: true`, `isEmergency` mirroring the booking's own
flag so push isn't suppressed during quiet hours for a genuine emergency
assignment. 3 new tests (`route.team-notify.test.ts`): routine assignment,
emergency assignment (title + `isEmergency` asserted), and
no-team-member-assigned (no phantom call). Mutation-verified via saved
patch (`git diff` → `git apply -R` → all 3 assertions failed reproducing
the exact pre-fix symptom — zero `notifyTeamMember` calls, RED → `git
apply` restored, GREEN). `tsc --noEmit` clean, full suite 372/372 files,
1852/1852 tests, zero regressions (same pre-existing unrelated
tenant-scope guard warning on `fixture/route.ts`, not touched, noted since
item 17).

## (65) New today, fresh ground outside the archetype — video-upload notifications fired with type `check_in` instead of the dedicated type `video_uploaded` that already exists — NOW FIXED

`notify.ts`'s `NotificationType` union has declared `'video_uploaded'`
since this codebase's beginning, and 3 tenant `AdminSidebar.tsx` components
(nyc-mobile-salon, wash-and-fold-hoboken, wash-and-fold-nyc) plus the global
`/dashboard/notifications` page already carry real UI treatment for it (🎥
"Video Uploaded" icon/title, violet color) — the same "declared type, real
UI, never actually fired" shape as item (63)'s `quote_viewed`. But the one
route that should fire it, `team-portal/video-upload/route.ts` (both the
signed-URL/JSON flow and the legacy formdata flow), called `notify()` with
`type: 'check_in'` instead — worse than item (63), since `check_in` already
has its own distinct, actively-used meaning in those same sidebars ("▶️ Job
Started"), so every video-upload notification landed in the admin feed
actively mislabeled as a job-start event rather than merely falling back to
a generic icon. Confirmed by grepping every `NotificationType` literal's
usage count across `src/` (`video_uploaded` had zero `notify()` call sites;
`check_in` appeared at both video-upload call sites instead) and reading
all 3 `AdminSidebar.tsx` type-to-icon maps plus the global notifications
page's color map.

**Fixed** (`p1-w3`) — both `notify()` calls in
`team-portal/video-upload/route.ts` now use `type: 'video_uploaded'`. 1 new
test (`route.notify-type.test.ts`) on the signed-URL flow, the primary path
per the route's own comment; the legacy formdata flow received the
byte-identical one-line fix but isn't separately exercised — constructing a
real multipart body with a binary file part hits an unrelated undici/jsdom
webidl incompatibility in this test environment, unrelated to the route.
Mutation-verified via saved patch (`git diff` → `git apply -R` → the type
assertion failed reproducing the exact pre-fix symptom (`'check_in'`
received instead of `'video_uploaded'`), RED → `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 372/372 files, 1852/1852 tests,
zero regressions (same pre-existing unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, noted since item 17).

## (66) New today, archetype depth — `quote_expired` sits one function above item (63)'s own `quote_viewed` fix in the same file, and was never wired either — NOW FIXED

`GET /api/quotes/public/[token]` is the ONLY place in the codebase that ever
transitions a quote's status to `'expired'` (past `valid_until`, still
`'sent'`). That block already does the full bookkeeping its sibling
accept/decline/viewed transitions do — flips `status`, logs a `quote_events`
row (`event_type: 'expired'`) — but, unlike every other terminal event on
this same public token surface, never called `notify()` or `ownerAlert()`.
`notify.ts`'s `NotificationType` union has declared `'quote_expired'` since
its beginning; `grep -rn "type:.*quote_expired" src/` turned up zero call
sites. A proposal dying unsigned — arguably the single most important
"this deal needs a follow-up call" signal in the sales-hub pipeline — was
exactly as silent as item (63)'s `quote_viewed` gap, sitting one `if` block
above the code item (63) already fixed in this identical file.

**Fixed** (`p1-w3`) — added the identical `notify()` + `ownerAlert()` pair
the accept/decline/viewed cases already use, inside the existing expire
block. Naturally one-shot: the surrounding `if (quote.status === 'sent')`
guard means a quote already `'expired'` never re-enters this branch on a
later visit, so no repeat-open spam guard was needed (unlike `quote_viewed`,
which can be reopened many times). 3 new tests
(`route.expired-notify.test.ts`): fires on a still-`'sent'` quote past
`valid_until`; does NOT fire on a quote already `'expired'`; does NOT fire
when `valid_until` is still in the future. Mutation-verified via saved
patch (`git diff` → `git apply -R` → the "fires" assertion dropped to 0
calls reproducing the exact pre-fix symptom, RED → `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 373/373 files, 1855/1855 tests,
zero regressions (same pre-existing unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, noted since item 17).

## (67) New today, fresh ground outside the archetype — `POST /api/quotes/[id]/send` never fired `notify()`, so "sent" is the one step of a proposal's lifecycle invisible to the admin's own in-app notifications feed — NOW FIXED

`ownerAlert()` (`src/lib/messaging/owner-alerts.ts`) sends a branded
email + SMS to the tenant's admins — it does NOT insert a `notifications`
row. Only `notify()` does that DB insert, which is what the in-app feed at
`/dashboard/notifications` reads from. Every terminal event in a proposal's
lifecycle — viewed (63), accepted, declined, and now expired (66) — calls
BOTH `notify()` and `ownerAlert()`. `POST /api/quotes/[id]/send`, the route
that fires the FIRST step of that same lifecycle, only ever called
`ownerAlert()`. Confirmed via `grep -n "notify(\|ownerAlert(" src/app/api/
quotes/[id]/send/route.ts` — one `ownerAlert()` call, zero `notify()`
calls — and `notify.ts`'s `NotificationType` union has declared
`'quote_sent'` since its beginning with zero call sites anywhere in
`src/`. Net effect: opening a deal's in-app activity trail shows it being
viewed, accepted/declined, or expiring, but not the moment it was actually
sent — the first and most basic step of the trail is the one silently
missing.

**Fixed** (`p1-w3`) — added a `notify()` call (`type: 'quote_sent'`,
`recipientType: 'admin'`) alongside the existing `ownerAlert()` call, same
pattern as (63)/(66). 2 new tests (`route.notify-type.test.ts`): a
successful send fires both `notify()` and the existing `ownerAlert()`; a
send where the only requested channel fails (email rejects) still 400s
without firing either — matching the route's own existing "neither channel
sent" guard. Mutation-verified via saved patch (`git diff` → `git apply -R`
→ the "fires" assertion dropped to 0 calls reproducing the exact pre-fix
symptom, RED → `git apply` restored, GREEN). `tsc --noEmit` clean, full
suite 374/374 files, 1857/1857 tests, zero regressions (same pre-existing
unrelated tenant-scope guard warning on `fixture/route.ts`, not touched,
noted since item 17).

## (68) New today, archetype depth — `booking_completed` sat undeclared-but-unfired since inception, same shape as items (63)/(66)/(67)'s quote-lifecycle gaps — NOW FIXED

Swept every `NotificationType` literal in `lib/notify.ts` against actual
`notify()` call sites across `src/` looking for more "declared type, zero
callers" gaps in the quote-lifecycle family's shape. Found five with zero
call sites (`booking_completed`, `escalation`, `expense_added`,
`payroll_paid`, `review_request`) but only `booking_completed` has a real,
shipped UI treatment waiting for it — a dedicated green badge in
`app/dashboard/notifications/page.tsx`'s `TYPE_COLORS` map, same evidence
bar items (63)/(66)/(67) used. `PATCH /api/bookings/[id]/status` is the
only place a booking ever transitions to `'completed'`; the route already
calls `notify()` for the `cancelled` transition two blocks below (team-
member SMS) but never did for completion — the single event a job's own
completion feed entry depended on.

**Fixed** (`p1-w3`) — added a `notify()` call on the `'completed'`
transition: type `booking_completed`, `channel: 'email'`,
`recipientType: 'admin'`, matching the exact convention items (63)/(66)/(67)
used for sales-hub admin-visibility gaps (no bespoke email template exists
for this type, same as those — the plain fallback body is fine since the
point is the in-app feed row, not a branded send). 3 new tests
(`route.completed-notify.test.ts`): fires once on `in_progress → completed`;
does not fire on other transitions; does not fail the status change if
`notify()` throws. Mutation-verified via saved patch (`git diff` → `git
apply -R` → the "fires" assertion dropped to 0 calls reproducing the exact
pre-fix symptom, RED → `git apply` restored, GREEN). `tsc --noEmit` clean,
full suite 375/375 files, 1860/1860 tests, zero regressions (same
pre-existing unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, noted since item 17).

## (69) Fresh ground, flagged not fixed — `review_request`'s branded client email (`reviewRequestEmail`) is fully built and dead; the real review-request cron only ever sends SMS

Same "declared type, zero `notify()` callers" sweep as item (68) turned up
`review_request` too — and this one is a deeper miss than a missing admin
badge. `lib/notify.ts` has a complete `case 'review_request':` branch
building a branded `reviewRequestEmail()` HTML body, and
`app/dashboard/notifications/page.tsx` has a real yellow badge for it — but
`grep -rn "type:.*review_request" src/` finds zero callers. The actual
review-request flow, `app/api/cron/post-job-followup/route.ts` (both the
per-booking and per-job branches), sends the ask via a raw `sendSMS()` call
that never touches `notify()` at all — so every tenant's clients only ever
get a review request by text, the branded email path has shipped and never
fired once, and the admin's own in-app feed never shows a review request
having gone out either.

**Not fixed — flagging instead of acting.** Unlike (68) and the
quote-lifecycle items, wiring this one for real is a product decision, not
a pure visibility fix: `reviewRequestEmail`'s content is addressed to the
*client* (their name, their feedback link), so firing it correctly means
`notify()` with `recipientType: 'client'` — an actual new outbound email to
real customers on every tenant, on a cron loop, the first time this code
path would ever run. That's a live customer-communication change, not an
admin-dashboard-only wire-up like (68)/(63)/(66)/(67), and it isn't this
queue's call to make unilaterally. Options for Jeff: (a) fire it as
designed — clients get both SMS and a branded review-request email; (b)
fire `notify()` with `recipientType: 'admin'` instead/in addition, purely so
the admin feed shows "review requested" the way it shows every other
lifecycle event, with no new customer-facing send; (c) leave as-is and
narrow the declared type / strip the dead email template as cleanup.
Left open pending a call.

## (70) New today, archetype depth — every "same-day = emergency" determination in the codebase compared calendar dates in the wrong timezone, silently missing or misfiring the emergency flag/rate for hours every evening — NOW FIXED

Items (63)/(66)/(67)/(68)'s sweep exhausted "declared NotificationType, zero
call sites" as a bug shape (the two remaining candidates, `escalation`/
`expense_added`/`payroll_paid`, have no shipped UI to wire either, and
`review_request` (69) is a flagged product call) — so this pass stepped back
from *wiring* is_emergency downstream (items 3-58's whole thread) and asked
whether the flag is even computed correctly in the first place. It isn't,
almost everywhere.

`tenants.timezone` (`supabase/schema.sql:17`, default `'America/New_York'`)
is a real, populated column — auto-derived from ZIP at tenant creation
(`zipToTimezone()`, `src/lib/timezone.ts`, spanning all 4 continental US
bands: ET/CT/MT/PT) — but `grep -rn "\.timezone\b" src/lib` outside that one
file returns zero hits. Every "is this booking today" check in the codebase
instead either (a) used the server runtime's default timezone (UTC on
Vercel) via `new Date().toLocaleDateString('en-CA')`/`getFullYear()` with no
`timeZone` option, or (b) hardcoded `America/New_York` in one single-tenant
file while leaving a sibling check in the exact same file at the server
default — an internal inconsistency, not just an unverified assumption.
Confirmed 6 real call sites, all now fixed:

- `src/lib/selena/core.ts` (Yinez, the platform's highest-volume AI/SMS
  booking assistant, single-tenant/hardcoded-ET) — `handleCreateBooking`
  and `handleRescheduleBooking` both compared the LLM's date argument
  (resolved against `buildCalendarContext()`'s explicit
  `timeZone: 'America/New_York'` 14-day calendar, confirmed by reading
  every other date computation in this file) against a `todayStr` computed
  with **no** `timeZone` option — an inconsistency within the same file,
  not a judgment call.
- `src/lib/selena-legacy.ts` + `src/lib/selena-legacy-handlers.ts` (the
  multi-tenant bot serving ~23 non-cleaning trade tenants across all 4 US
  zones) — `buildCalendarContext()` and `handleCreateBooking`/
  `handleRescheduleBooking`'s `todayStr` all used the server default with
  no tenant-timezone awareness at all — worse than core.ts's bug for any
  non-Eastern tenant, since the UTC-vs-local mismatch window is nearly
  twice as wide for Pacific tenants as for Eastern ones.
- `src/app/api/client/reschedule/[id]/route.ts` — the human-facing
  reschedule endpoint had `tz` (the tenant's real configured timezone)
  sitting in a local variable two lines above the buggy comparison, already
  used for the SMS/email date display two lines up, and simply didn't use
  it for the emergency check.
- `src/app/api/portal/bookings/route.ts` (item 12's file) and
  `src/app/api/client/book/route.ts` (the public marketing site's own
  booking form — the highest-traffic entry point, and the file every other
  fixed route's comments cite as "same server-side determination as... the
  generic-tenant branch of POST /api/client/book") — both had zero
  tenant-timezone awareness in this specific comparison; `client/book.ts`'s
  own NYC-Maid branch three lines above already does this correctly
  (`timeZone: 'America/New_York'`), making the generic-tenant branch's
  omission an internal inconsistency there too, not a fresh design question.

Net effect, worst case: a customer contacting an Eastern-time tenant's AI/
SMS bot between roughly 8pm and midnight ET to report a genuine emergency
("today", by any human definition) got the LLM's correctly-ET-resolved
`date` compared against a UTC-default `todayStr` that had already rolled to
tomorrow — `isEmergency` came back **false**, silently skipping the $89/hr
same-day rate and the `is_emergency` flag on exactly the bookings items
(4)/(7)/(8)/(20)/(24)/(26)/(29)/(30)/(32)/(34)/(36)/(38)/(40)/(42)/(43)/(45)
all depend on to route urgency to a tech/dispatcher/customer at all — the
worst possible time for this to fail, since after-hours no-heat/burst-pipe
calls concentrate in exactly that window. The reverse direction (a
next-day booking miscategorized as same-day) also occurs, for Pacific
tenants especially, on the human-facing portal/reschedule/public-book
routes.

**Fixed** (`p1-w3`) — every one of the 6 call sites above now resolves
"today" through the tenant's own configured timezone (core.ts, being
genuinely single-tenant, correctly keeps its file-wide `America/New_York`
convention rather than adding a per-tenant DB lookup it doesn't need).
selena-legacy.ts gained a small `getTenantTimezone()` cache (mirroring
`getSelenaConfig()`'s existing shape) since the multi-tenant bot has no
other reason to touch the `tenants` row at that call site; the other 4
routes reused a `tenant.timezone`/`tenants(...)` value already in scope or
one query away, adding zero new round-trips beyond what portal/bookings.ts
already made (merged into its existing `selena_config` fetch instead of a
second query). 12 new tests across 6 files, all following the same
mutation-verified shape: a Pacific/Eastern tenant's real evening moment
(fake system time straddling the UTC/local midnight boundary) proves a
tomorrow-morning booking is correctly NOT flagged emergency and a
same-evening booking correctly IS, at the identical real-world instant.
Mutation-verified per site (temporarily reverted to the original
no-timeZone/hardcoded-ET code, ran the new tests, restored, confirmed
green) — 11 of the 12 new tests went RED under the original code; the one
exception (`portal/bookings`'s "later the same evening IS emergency" case)
happened to still pass under the old bug for that specific scenario since
its pre-fix code used real `Date` getters rather than a raw string split,
so it's kept as a same-direction regression guard rather than a
mutation-proof, alongside the 11 that do prove the fix. `tsc --noEmit` clean,
full suite 375/375 files, 1872/1872 tests, zero regressions (same
pre-existing unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, noted since item 17).

Not chased further in this pass, flagging for awareness: `src/lib/
timezone.ts`'s own `formatInTz(iso, timezone)` helper — built specifically
to render a timestamp in a tenant's configured zone, with the identical
"falls back to ET" convention this fix now uses everywhere — has zero
callers anywhere in the codebase (`grep -rln formatInTz src` outside its
own file: no hits). Same "built, never wired" shape as `reviewRequestEmail`
(69), `find-cleaner` (10), and `video_uploaded` before item (65) — worth a
separate pass to find where booking-time displays are still using raw/
UTC-implicit formatting instead of this already-correct utility, but out of
scope for this timezone-*computation* fix specifically.

## (71) New today, archetype depth — 3 per-tenant AI-bot clones missed item (70)'s sweep entirely, same day-boundary bug shape — NOW FIXED

Item (70)'s sweep covered `src/lib/selena/core.ts` and
`src/lib/selena-legacy*` (the shared, global bot files) but three tenants —
`nyc-mobile-salon`, `wash-and-fold-nyc`, `wash-and-fold-hoboken` — each ship
their *own* standalone `_lib/selena.ts` (pre-dating the global-code rule in
`CLAUDE.md`'s "Known debt" list, same clone shape as their dashboard/admin
pages). All three have the identical internal inconsistency core.ts had: their
own `buildCalendarContext()` explicitly resolves "now" in
`timeZone: 'America/New_York'`, but `handleCreateBooking`'s
`todayStr = new Date().toLocaleDateString('en-CA')` (no `timeZone` option)
compared against it used the server default instead. All 3 tenants are
Eastern-time, so the fix hardcodes `'America/New_York'` (matching core.ts's
own single-tenant precedent) rather than adding a `tenants.timezone` lookup
these single-location files don't need.

**Fixed** (`p1-w3`) — one-line change in each of the 3 files. 3 new tests (one
per file, in each file's existing `*.create-booking-emergency-rate.test.ts`).

**Methodology note, worth the whole fleet knowing:** this sandbox's own local
TZ is `America/New_York` (confirmed via `Intl.DateTimeFormat().resolvedOptions().timeZone`
and empirically). Checked out out item (70)'s pre-fix `core.ts` directly and
ran its own day-boundary test against it: **it still passed** — the exact
"buggy" `new Date().toLocaleDateString('en-CA')` line, with no `timeZone`
option, renders correctly here because the parse step (`new Date(naiveStr)`,
no `Z`) *and* the format step (`toLocaleDateString`, no `timeZone`) both fall
back to the same runtime-local zone, and on this machine that zone happens to
already be ET — a no-op round trip that hides the bug. Production (Vercel) is
presumed UTC-default (the assumption item (70) and ~30 prior fixes this
session were built on), where the round trip does NOT cancel out. This means
any "mutation-verified RED" claim for a day-boundary test **on this sandbox**
that didn't force a non-ET zone may not have actually proven what it claimed
— item (70)'s own claimed 11/12 RED could not be reproduced for the one
sub-case checked directly. Fix going forward, used in this item and item
(72) below: `vi.stubEnv('TZ', 'UTC')` around the fake-timer boundary test
genuinely forces the buggy code to fail here and the fix to pass regardless
of it, closing the false-negative. Not going back to re-verify every prior
item's day-boundary tests — out of scope for this pass — but flagging so
future timezone-boundary tests use the stub rather than trust the sandbox's
own local clock.

`tsc --noEmit` clean, full suite 375/375 files, 1875/1875 tests, zero
regressions (same pre-existing unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, noted since item 17).

## (72) New today, fresh ground — `checkAvailability()`'s same-day gate and already-past-hours filter both used the server-default zone instead of the tenant's own, in the global multi-tenant availability engine — NOW FIXED

Stepped back from the AI-bot family (items 70/71) to check whether the
*other* production same-day determination — the public self-booking
availability widget — had the identical class of bug. It did.
`src/lib/availability.ts`'s `checkAvailability(tenantId, date, durationHours)`
is the **global**, multi-tenant availability engine (not a per-tenant clone)
backing every non-cloned tenant's self-booking widget across all 4
continental US zones. It already takes `tenantId` and already calls
`getSettings(tenantId)` — but its same-day gate (`date === today`, deciding
whether `allow_same_day` requires manual confirmation) and its
already-passed-hours filter (`slotStartMin <= nowMinutes`) both computed
`today`/`nowMinutes` from `new Date()` with no timezone resolution at all,
defaulting to the server runtime's zone. The comment sitting directly above
this exact gate literally names the archetype: *"fatal for 24/7-emergency
verticals (towing, restoration, emergency plumbing) that market
same-day/around-the-clock service"* (from item F4, an earlier fix in this
same file) — yet the gate meant to protect those verticals' same-day flow
was itself timezone-blind. Worst case: during the evening window before a
tenant's local midnight (UTC already rolled to the next day), the same-day
confirmation gate could be silently skipped for a genuinely-same-day
request — the exact emergency-call window items (70)/(71) already found
broken for the AI-bot side — or, for any tenant west of Eastern, the
already-past-hours filter could show/hide the wrong slots relative to the
tenant's real local time of day, any time of day, not just evenings.

**Fixed** (`p1-w3`) — `getSettings()` (`src/lib/settings.ts`) already does
`select('*')` on `tenants`, so `tenant.timezone` was sitting in the
already-fetched row, just never exposed on the `TenantSettings` return type.
Added `timezone: string` to the interface (falls back to `'America/New_York'`,
matching the DB default) — zero new queries. `checkAvailability()` now
resolves both `today` and `nowMinutes` via `settings.timezone`, reordered to
fetch settings before computing `today` since it now depends on it. 4 new
tests (2 in the existing `availability.test.ts` same-day suite, matching its
established F4-regression style — one proving the evening-ET same-day gate
survives a UTC-rolled server clock, one proving a Pacific tenant's
already-past-hours filter uses PT, not server-default, hours),
mutation-verified with `vi.stubEnv('TZ', 'UTC')` per item (71)'s methodology
note above — both confirmed RED under the original code with the stub, GREEN
after the fix; existing 5 same-day/business-hours tests unaffected. `tsc
--noEmit` clean, full suite 375/375 files, 1877/1877 tests, zero regressions
(same pre-existing unrelated tenant-scope guard warning on `fixture/route.ts`,
not touched, noted since item 17).

## (73) New today, archetype depth — 3 per-tenant clone `availability.ts` files missed items (70)/(71)/(72)'s timezone fix, same day-boundary bug shape — NOW FIXED

Stepped sideways from item (72)'s global availability engine to check
whether the *per-tenant clone* AI-bot family (items 70/71) had an
equivalent standalone availability file with the same gap. It did.
`nyc-mobile-salon`, `wash-and-fold-hoboken`, and `wash-and-fold-nyc` each
have their own standalone `_lib/availability.ts` `checkAvailability()`
(imported directly by that tenant's own `selena.ts` AI bot for its
`handleCheckAvailability` tool) — distinct from the per-tenant `selena.ts`
files item (71) fixed and distinct from the global `src/lib/availability.ts`
item (72) fixed; item (71)'s own audit of these 3 tenants' `selena.ts` files
never opened this sibling file. Same bug shape as (70)-(72): the same-day
gate compared `date` against `new Date().toLocaleDateString('en-CA')` with
no `timeZone` option, defaulting to the server runtime's zone instead of
America/New_York. Worst case: during the evening window before ET midnight
(UTC already rolled to the next day), a genuinely same-day request would
not be flagged `sameDay`, skipping the "requires confirmation" gate for
exactly the emergency-call window it exists to catch.

**Fixed** (`p1-w3`) — one-line change in each of the 3 files, hardcoding
`'America/New_York'` (matching item (71)'s own precedent for these exact 3
single-location Eastern-time tenants). 6 new tests (2 per file),
mutation-verified with `vi.stubEnv('TZ', 'UTC')` per item (71)'s methodology
note — all confirmed RED under the original code with the stub, GREEN after
the fix. `tsc --noEmit` clean, full suite 378/378 files, 1883/1883 tests,
zero regressions (same pre-existing unrelated tenant-scope guard warning on
`fixture/route.ts`, not touched, noted since item 17).

## (74) New today, fresh ground — the customer-facing same-day booking date picker computed "today" in UTC instead of the browser's own local zone, silently blocking same-day selection every evening — NOW FIXED

Client-side mirror of the server-side timezone archetype items (70)-(73)
just closed, found while checking whether the customer-facing booking form
itself (as opposed to the server-side pricing/gating logic already fixed)
had the same class of bug. `<input type="date" min={isSameDay ? new
Date().toISOString().split('T')[0] : minDate}>` — the same-day service
type's date-picker floor — computed "today" via `.toISOString()`, which is
always UTC by spec, instead of the browser's own local date. Since every
continental US timezone is behind UTC, any customer trying to book a
genuine same-day emergency in the evening (from ~7-8pm ET onward, earlier
further west) hits a `min` attribute already set to tomorrow (UTC) while it
is still today in their own browser — the native date-picker UI blocks
them from selecting today at all, for exactly the "same-day emergency"
service type this control exists to support. Arguably more severe than
items (70)-(73): those misclassified/mispriced an already-submitted
booking; this one prevents the booking from being submitted at all.

Found in the 3 real customer-facing "book new appointment" forms: the
GLOBAL shared template (`src/app/site/template/book/new/BookFormClient.tsx`,
rendered by `template/book/new/page.tsx` — used by all non-cloned trade
tenants) and 2 standalone single-tenant clones with the identical inline
JSX (`nycmaid/book/new/page.tsx`, `the-florida-maid/book-now/page.tsx`).

**Fixed** (`p1-w3`) — replaced `new Date().toISOString().split('T')[0]`
with `new Date().toLocaleDateString('en-CA')` in all 3 files. No hardcoded
IANA zone is needed or correct here (unlike items 70-73's server-side fix,
which needed the *tenant's* configured zone since one server serves every
tenant) — client-side, `toLocaleDateString` with no `timeZone` option
resolves to the host environment's own zone (ECMA-402 default), which on a
customer's device already IS their local zone, no lookup required.
Verified by a standalone `node -e` divergence check (JS spec-based:
`toISOString` is always UTC, `toLocaleDateString` with no `timeZone` option
is always host-local — the same mechanism item (71)'s methodology note
already documented, just exploited in the opposite direction here since
this is client not server code): at `2026-07-18T02:30:00Z` (10:30pm EDT
July 17), `toISOString().split('T')[0]` returns `2026-07-18` (tomorrow,
wrong) while `toLocaleDateString('en-CA')` returns `2026-07-17` (today,
correct). No render-test harness exists for any of these 3 files
(confirmed no prior test coverage, matching this doc's established
precedent for other client-page fixes with no harness), so verification is
source-level plus the standalone divergence check above, not a
rendered/clicked E2E test. `tsc --noEmit` clean, full suite 378/378 files,
1883/1883 tests, zero regressions (unaffected — none of these 3 files had
prior test coverage to regress).

Left as noted-but-not-fixed, same files, out of scope for this pass: the
non-same-day `minDate` ("24 hours from now") uses the same
`.toISOString()`-based UTC arithmetic — a softer, duration-based lead-time
floor rather than a same-day calendar-date comparison, so an off-by-a-
partial-day error there shifts the *routine* minimum-notice floor by at
most a few hours rather than hard-blocking the archetype's core same-day
flow. Different severity, same underlying pattern — flagging for a future
pass rather than bundling an unrelated-severity fix into this one.

## (75) Archetype depth — the non-same-day `minDate` (24hr lead) noted-but-not-fixed above, NOW FIXED

Same 3 files as item (74): `template/book/new/BookFormClient.tsx`,
`nycmaid/book/new/page.tsx`, `the-florida-maid/book-now/page.tsx`.
`minDate = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]`
took the **UTC** calendar date of "24 hours from now" instead of the
browser's own local date — during the same ~7-8pm ET-onward evening window
item (74) covers, the UTC date has already rolled to tomorrow relative to
local time, so `minDate` landed a full calendar day further out than
intended, hiding the very next day from the date picker even though a
booking on it at a proper time would satisfy the 24-hour notice
requirement. Standalone verification: at 10:30pm ET, old code set
`minDate` to July 19 (blocking July 18 entirely), fixed code correctly
floors to July 18. Fixed via `toLocaleDateString('en-CA')`, same pattern
as item (74)'s same-day branch on the same line. No render harness for
these 3 files (same precedent as item 74). `tsc --noEmit` clean, full
suite 378/378 files, 1883/1883 tests, zero regressions.

## (76) Fresh ground — POST /api/referrals validated and inserted the WRONG table's columns; "Create Referral" has never worked

Not part of the emergency/24-7 archetype — found applying the session's
"diff frontend POST body vs backend validate schema" method to a fresh
route not yet audited. `referrals` (client-referred-a-client rewards;
`supabase/schema.sql:249-258`) has columns `referrer_client_id`,
`referred_client_id`, `referral_code`, `status`, `reward_amount`. POST's
`validate()` schema instead required `name`/`email`/`phone`/`code`/
`commission_rate` — the *referrers* table's shape (a separate,
already-working referral-commission feature with its own tested
`/api/referrers` routes). The dashboard's "Create Referral" form only
ever sends `{ referrer_client_id, reward_amount }`; neither field was in
the allowlist, and `name` was required but never sent, so every real
attempt 400'd with "name is required" before ever reaching the insert —
and even a hypothetical caller sending the old expected fields would have
failed too, since `referrals` has no columns for PostgREST to write them
to. This endpoint could never have succeeded for anyone. The existing
`route.isolation.test.ts` never caught it because its DB mock is a plain
JS object store that accepts any field name, unable to reproduce
PostgREST's real "unknown column" rejection.

**Fixed** — `validate()` now matches the real `referrals` columns, with
the same cross-tenant-FK-ownership check already used on
`schedules.client_id`/`reviews.client_id`/`clients.referrer_id` (this
table's own GET join is unscoped by tenant on the joined side).
`referral_code` is always server-generated. 3 new tests (the real
dashboard-sent body now succeeds, a cross-tenant `referrer_client_id` is
rejected 404, a missing one 400s pre-DB), mutation-verified (saved patch,
revert → RED "expected 400" on all 3 → restore → GREEN). `tsc --noEmit`
clean, full suite 378/378 files, 1886/1886 tests, zero regressions.

## (77) Fresh ground — team photo upload, display, and PIN-login all read/wrote the nonexistent `team_members.avatar_url` column instead of the real `photo_url` column — NOW FIXED

Same "wrong column name" bug shape as item (76), a different table.
Applying that item's own methodology (diff frontend body vs. backend
schema, then confirm against the real DDL) to `team_members`: zero
migration file anywhere in the repo ever creates or adds `avatar_url`
(checked every `.sql` file, not just tracked migrations). `photo_url` is
the real column (`013_full_parity.sql`), already read correctly by `GET
/api/team`'s select-list and the main admin team list page
(`dashboard/team/page.tsx`). A second, parallel set of files used
`avatar_url` instead, the identical legacy-naming-drift shape item (6)
found on `BookingsAdmin.tsx`'s `cleaner_id`/`team_member_id` split:
`GET`/`POST /api/team-portal/auth` (the team-portal PIN-login route)
selected and returned `avatar_url`; `PUT /api/team/[id]`'s `pick()`
allowlist and `POST /api/team`'s `validate()` both accepted `avatar_url`;
`cleaners/upload/route.ts` wrote `avatar_url` as a second, redundant
column on every photo upload alongside the correct `photo_url`; and the
team-portal self-service page (`team/page.tsx`), its shared auth type
(`team/layout.tsx`), and the admin dashboard's per-member edit page
(`dashboard/team/[id]/page.tsx`) all read/wrote `avatar_url` on both the
upload flow and the display.

Concrete impact, worst case first: `team-portal/auth/route.ts`'s login
query destructures only `data` from `tenantDb(...).select('id, ...,
avatar_url, ...)` with no `error` check — against real PostgREST, an
unknown column in a `select()` fails the whole query, so `data` would be
`null` regardless of whether the PIN itself was correct, and the route's
existing `if (!member) return { error: 'Invalid PIN' }, 401` branch would
mask that failure as a wrong-PIN rejection for every team-portal login
attempt, at every tenant. Separately, and independently of whether the
login SELECT itself fails: every attempt to save a team member's own
profile photo (`team/page.tsx`'s self-service upload, and the admin
dashboard's per-member photo upload) sends `{ avatar_url: ... }` to `PUT
/api/team/[id]`, whose `.update(fields)` call **does** check `error` and
would 500 with a clear PostgREST "unknown column" message — but
`team/page.tsx`'s own upload handler never checked `fetch(...)`'s
response status before optimistically writing the (never-actually-saved)
URL into `localStorage` and reloading, so the failure was invisible to
the team member; a fresh login (re-fetching from the server, which never
had the write persist) would silently drop the photo again. The one
existing coverage for this table, `team-portal/auth/route.isolation.test.ts`
+ `route.rate-limit.test.ts`, seeds the plain-JS-object fake Supabase
mock with `avatar_url: null` — same test-blind-spot as item (76): the
mock accepts any field name and cannot reproduce PostgREST's real
unknown-column rejection, so it never caught this.

**Fixed** (`p1-w3`) — renamed `avatar_url` → `photo_url` end-to-end
(matching item (6)'s own precedent of renaming to the real column
throughout rather than adding a translation shim at the API boundary):
`team-portal/auth/route.ts`'s select + internal type + response field,
`POST /api/team`'s `validate()` field, `PUT /api/team/[id]`'s `pick()`
allowlist, `cleaners/upload/route.ts`'s redundant second write (dropped;
`photo_url` alone is correct and sufficient), and every client-side read/
write across `team/layout.tsx`'s shared auth type, `team/page.tsx`'s
self-upload handler and its two display sites, and
`dashboard/team/[id]/page.tsx`'s local type, form state, upload handler,
and its three display sites. Also added the missing `if (saveRes.ok)`
check on `team/page.tsx`'s self-upload PUT while touching that exact
line for the rename — the dashboard admin edit page's equivalent handler
already had this check, only the team-portal self-service one was
missing it, and leaving it out would have meant the rename alone still
couldn't prove a future save failure to the user. Updated the two
existing isolation/rate-limit test seeds to `photo_url` to match the real
column (no new tests added: per item (76)'s own established limitation,
the fake mock can't reproduce a real unknown-column rejection either way,
so a new mock-backed test wouldn't add real coverage for this specific
bug class — verification here is the same "confirm against every `.sql`
file directly" method item (76) used, plus the sibling `GET /api/team`
select-list and `dashboard/team/page.tsx` already correctly using
`photo_url` as corroborating, independent evidence). `tsc --noEmit`
clean, full suite 378/378 files, 1886/1886 tests, zero regressions
(landed in the same commit as item (78) below, `d3b6f232`).

## (78) New today, archetype depth — `generate-recurring`'s pause/resume date check was the one line left computing "today" in UTC in a file that gets every other date right — NOW FIXED

Continuation of the items (70)-(73) day-boundary/timezone archetype
thread after re-checking whether any of that sweep's fixed files still
had an internal inconsistency of their own, the same shape item (71)'s
methodology note flagged for `core.ts` (one line in a file using
`America/New_York` correctly elsewhere left on the server-default zone).
`src/app/api/cron/generate-recurring/route.ts` (the weekly cron that
both generates recurring bookings 4 weeks out and auto-resumes
`NYCMAID_TENANT_ID`'s paused schedules) gets every other date computation
in the file right — `worksScheduledDay`/`slotWithinHours`/`memberCanTake`/
the exception-map lookup all key on `d.toLocaleDateString('en-CA', {
timeZone: 'America/New_York' })` — but its pause-resume check, `const
todayStr = new Date().toISOString().split('T')[0]`, compared against
`paused_until` using the server-default (UTC on Vercel) calendar date
instead. `NYCMAID_TENANT_ID` is a single, hardcoded Eastern-time tenant
(the same single-tenant convention `selena/core.ts` already uses), so
during the evening window before ET midnight (UTC already rolled to the
next day), a schedule paused "until tomorrow" could auto-resume a full
day early — or, in the other direction, resume a day late depending on
exactly when in the UTC day the weekly cron happens to run relative to
the ET boundary. Lower severity than items (70)-(73) (this only shifts a
recurring-schedule's pause/resume timing by up to a day, not a same-day
emergency's price/dispatch flag), but the identical bug shape, found by
checking a file this thread had already touched rather than a fresh one.

**Fixed** (`p1-w3`) — changed `todayStr` to
`d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })`,
matching every other date computation already in this same file. No
test added: this repo has zero test files under any `src/app/api/cron/*`
route (same precedent item (18) already established, re-confirmed
directly for this file), so there's no existing harness to extend.
`tsc --noEmit` clean, full suite 378/378 files, 1886/1886 tests, zero
regressions (unaffected — no existing test touches this route). Landed
in the same commit as item (77) above, `d3b6f232`.

## (79) Archetype depth — items (74)/(75)'s own `/book/new` sweep missed 2 of the 3 form variants it was meant to cover, plus a whole separate reschedule/rebook flow with the identical bug — NOW FIXED

Re-checked items (74)/(75)'s own claim that "the customer-facing same-day
booking date picker" was fixed in "the 3 real customer-facing 'book new
appointment' forms." `template/book/new/page.tsx` actually branches to
ONE OF THREE forms depending on the tenant's industry profile —
`BookFormClient` (cleaning tenants, the one items 74/75 fixed),
`RemoteBookForm` (remote/retainer verticals — virtual assistant, etc.),
or a redirect to `/book/standard`'s `StandardBookForm` (non-cleaning
on-site tenants) — and only the cleaning-tenant branch was actually
touched. The other two had the exact same `minDate = new Date(Date.now()
+ 24 * 60 * 60 * 1000).toISOString().split('T')[0]` line, unfixed:
during the same evening-ET window items 74/75 already proved, any remote
or non-cleaning-on-site tenant's customers would have the *next*
available day hidden from the date picker.

Separately — a different flow entirely, not part of the `/book/new`
sweep at all — found while checking whether the same client-side UTC
pattern existed anywhere else customer-facing: the *existing-customer*
booking dashboard (`isSameDay`/`minDate`/`maxDate`, used to gate same-day
slot-fetching and float the picker's bounds) and the *reschedule* flow's
30-day date list both had it too, across every one of this method's
already-established multi-tenant duplication points: `src/app/portal/
page.tsx` (the shared customer portal), `site/book/dashboard/page.tsx` +
`site/book/reschedule/[id]/page.tsx` (nycmaid's live routes), and the
identical clones under `wash-and-fold-nyc/(app)/book/*`,
`wash-and-fold-hoboken/(app)/book/*`, and `the-florida-maid/clients/*`.
Each dashboard file also converts a specific booking's stored
`start_time` to a calendar day via `.toISOString()` (to decide whether
to pre-select it in a "book again" panel) — same bug, since a late-
evening ET appointment's UTC calendar date is already the next day.
Worst-case impact mirrors item (74)/(75)'s severity assessment exactly:
in the evening, `isSameDay` compares the picker's selection against
*tomorrow's* UTC-computed date, so a customer picking an actual
same-day/emergency slot would incorrectly NOT be flagged same-day (skips
whatever same-day handling — e.g. call-in requirement — that gate
exists for), while a customer picking the very next day gets
incorrectly treated as same-day and blocked from fetching slots at all.

Last: the identical `min={new Date().toISOString().split('T')[0]}` /
`today` pattern also showed up on the *cleaner/team* side — `team/
page.tsx`'s and the two `wash-and-fold-*/team/dashboard/page.tsx`
clones' "Days Off" blocked-date picker (`min` attribute) and its
`addDateOff` past-date guard (`if (newDateOff < today) return`) — same
shape, different user (team member instead of customer), found by
finishing the same `toISOString().split('T')[0]` grep sweep rather than
stopping once the customer-facing instances were covered.

**Fixed** (`p1-w3`) — all 15 files, same one-line substitution items
(74)/(75) already established as correct for client-side "today"
(`.toLocaleDateString('en-CA')` — no IANA zone needed, host-local by
spec, correct for a device physically in the browser's own timezone):
`template/book/new/RemoteBookForm.tsx`, `template/book/standard/
StandardBookForm.tsx` (item 79's `/book/new` gap), `portal/page.tsx`,
`site/book/dashboard/page.tsx`, `site/book/reschedule/[id]/page.tsx`,
the 2 `wash-and-fold-{nyc,hoboken}/(app)/book/{dashboard,reschedule}`
clone pairs, `the-florida-maid/clients/{dashboard,reschedule}`,
`team/page.tsx`, and the 2 `wash-and-fold-{nyc,hoboken}/(app)/team/
dashboard/page.tsx` clones. No render harness exists for any of these
15 files (same precedent items 74/75/77 already established for this
entire class — verification is source-level plus the same standalone
UTC-vs-local divergence mechanism item 74's methodology note already
documented). `tsc --noEmit` clean, full suite 378/378 files, 1886/1886
tests, zero regressions (unaffected — none of these files had prior
test coverage to regress).

## (80) Fresh ground — `GET /api/admin/referrals` queried the wrong table entirely, same shape as item (76) but on the admin side, plus a separate missing-`tenants`-array bug on top

Found applying item (76)'s own "diff frontend body vs backend query
against the real schema" method to the platform-admin console (as
opposed to item (76)'s tenant-dashboard-side `POST /api/referrals`).
`src/app/admin/referrals/page.tsx` renders an *affiliate-referrer
commission* program — its `Referral` type expects `referrer_name`,
`referrer_email`, `referee_name`, `referee_email`, `reward_status`,
`revenue_generated`, `tenant_name` — but the route backing it queried
`.from('referrals')` (the same client-referred-a-client rewards table
item (76) already fixed the write side of) and reduced stats via
`r.total_earned` and `r.status === 'active'`. Neither field exists on
`referrals` (`referrer_client_id`, `referred_client_id`,
`referral_code`, `status: pending|converted|paid`, `reward_amount` are
the real columns — confirmed again directly against `supabase/
schema.sql:247-256`) — `total_earned` and `status: 'active'` are
columns from the *referrers* table (migration `019_referral_
commissions.sql`), whose own top-of-file comment states the two are
"distinct" in exactly these terms: "External affiliate referrers +
their per-booking commission ledger. Distinct from `referrals`
(client-to-client)." So this was the admin-side twin of item (76)'s bug,
against a different pair of tables.

Concrete impact, worse than a silently-zeroed stat card: every field the
table actually renders — `referrer_name`, `referrer_email`,
`referee_name`, `referee_email` — would be `undefined` for every real
row (none of those columns exist on `referrals`), and
`filteredReferrals`'s search filter calls `r.referrer_name.toLowerCase()`
unconditionally on every render (not gated behind typing into the search
box), so the entire admin `/admin/referrals` page would throw ("Cannot
read properties of undefined") and fail to render at all as soon as a
single real referral row existed anywhere in the platform.

Found one more bug in the same route while fixing the first: the
frontend does `setTenants(data.tenants || [])` to populate the "All
Tenants" filter dropdown, but the backend never returned a `tenants` key
at all (only `{ referrals, stats }`) — so the tenant filter was
permanently stuck showing only "All Tenants," independent of and
unrelated to the wrong-table bug above.

**Fixed** — rewrote the query to match the already-correct, already-live
pattern the tenant-facing `GET /api/referral-commissions` route uses for
this exact data (`referral_commissions` joined to `referrers` and
`bookings`, per-tenant): `.from('referral_commissions').select('*,
referrers(name, email, status), bookings(clients(email)),
tenants(name)')`. Field mapping uses only real, already-established
columns — no invented business logic: `referrer_name`/`referrer_email`
← `referrers.name`/`email`; `referee_name` ← `referral_commissions.
client_name` (populated by `POST /api/referral-commissions` today);
`referee_email` ← `bookings.clients.email` (bookings has a single
unambiguous `client_id` FK, no relationship-name disambiguation needed,
same as the existing `POST /api/referral-commissions` booking lookup);
`status` ← `referrers.status` (real values: 'active' is the only one
ever set anywhere in the repo today); `reward_status` ← `referral_
commissions.status` (real values `pending|paid|void` — `pending`/`paid`
map directly onto the frontend's existing `getRewardBadge` cases,
`void` falls through to its existing default); `reward_amount` ←
`commission_cents`; `revenue_generated` ← `gross_amount_cents`. Also
added the missing `tenants` array (`select('id, name').neq('status',
'deleted').order('name')`, run in parallel via `Promise.all`, matching
the identical convention already used in `GET /api/admin/tenant-chats`).
Left honestly unfixed rather than invented: `converted_at` now returns
`referral_commissions.paid_at` (the closest real analog — a commission
being marked paid is the closest event to "converted" this schema
tracks) but there is no real backing data for the frontend's `pending
→ active → converted → expired` lifecycle beyond `referrers.status`
being permanently `'active'` (no deactivation feature exists yet); if
the product wants those 4 distinct states to mean something,
`referrers` needs an actual status enum, not a mapping I'd be guessing
at here. No test added: the same `src/test/fake-supabase.ts` limitation
item (76)/(77) already hit applies here too, more so — this route's
correctness rests on embedded-join resolution (`referrers(...)`,
`bookings(clients(...))`), which the fake mock explicitly documents it
does not implement ("Not a general-purpose mock — do not grow it beyond
what a test needs"), so a mock-backed test would validate the mock, not
this fix; verification here is the source/migration-comment cross-check
above plus mirroring the already-live, already-correct sibling route's
exact query shape. `tsc --noEmit` clean, full suite 378/378 files,
1886/1886 tests, zero regressions.

## (81) Fresh ground — custom-domain routing resolved tenants against the raw, un-normalized Host header instead of the already-computed cleanHost

Found auditing the custom-domain branch of `middleware.ts` (the routing path
for a tenant's own pointed domain, as opposed to the `<slug>.fullloopcrm.com`
carrying-domain subdomain branch two blocks above it). That subdomain branch,
and this same custom-domain branch's own `STATIC_TENANT_MAP` fallback lookup
two lines above, both already use `cleanHost` — the Host header lowercased
and port-stripped. The live DB lookup one line below it, `getTenantByDomain
(hostname)`, used the raw, un-normalized header instead. `getTenantByDomain`
(`tenant-lookup.ts`) only ever strips a leading `"www."`; it does not
lowercase or strip a port. Any Host header carrying a port suffix (some
proxy/preview setups forward one) or non-lowercase casing would silently
fail to match `tenants.domain`/`tenant_domains.domain`, and — because the
`catch` block only logs and falls through — the request would render the
main marketing site instead of the tenant's own site, with no error visible
to anyone.

**Fixed** (`p1-w3`) — changed the call to `getTenantByDomain(cleanHost)`,
matching the pattern the two sibling lookups in the same function already
established. Added `src/lib/middleware-domain-lookup.test.ts`, a pure
source-reading regression guard (same pattern as the `seo-*.test.ts` guards
— `middleware.ts` imports `next/server` APIs that don't run under plain
vitest) asserting the call site stays `getTenantByDomain(cleanHost)` and
never reverts to `getTenantByDomain(hostname)`. `tsc --noEmit` clean, full
suite 379/379 files, 1888/1888 tests. Commit `9c58ba02`.

## (82) Archetype depth — H-01 admin-impersonation-bypass class repeats a fourth time: BookingNotes, ProjectsView, dashboard-shell's own on-every-load permissions fetch, and the AI assistant

Same gap items (54) and the original `66fdc031` fix already established:
a route resolving tenant context via `getTenantForRequest()`/
`requirePermission()` needs a matching prefix in `middleware.ts`'s
admin-impersonation bypass list, or an admin-impersonated request to it
307s to `/sign-in` instead of running — and since real owner login is
dormant (moved off Clerk, P5 not yet wired), admin impersonation is
currently the *only* way any owner-side route runs in production at all,
not just an impersonation-testing edge case. Re-swept dashboard components
for `fetch('/api/...')` calls whose target route uses either helper and
cross-checked each against the bypass list: `BookingNotes.tsx` (rendered on
every booking detail view), `ProjectsView.tsx`, `dashboard-shell.tsx`'s own
`/api/permissions/me` fetch — which runs on **every single** `/dashboard`
page load, so this one alone made admin-impersonated sessions bounce to
sign-in constantly — and the AI assistant/campaign-chat features (`/api/ai`)
all had no prefix.

**Fixed** — added `/api/booking-notes`, `/api/projects`, `/api/permissions`,
`/api/ai` to the bypass list. Extended `middleware-domain-lookup.test.ts`
(added alongside item (81) in the same commit) with a second guard asserting
all four prefixes stay present. `tsc --noEmit` clean, full suite 379/379
files, 1888/1888 tests. Commit `9c58ba02`.

## (83) Archetype depth — H-01 class repeats a fifth time: the push-notification toggle

Continued the same bypass-list sweep from item (82), this time diffing every
directory under `src/app/api/*` against both the bypass-list prefixes and
`isPublicRoute`'s patterns rather than re-grepping dashboard components (the
inverse direction — catches a route with no *currently wired* dashboard
caller too, not just ones already confirmed reachable). `push/subscribe/
route.ts`'s `resolveAuthedTenantId()` has three branches by `role`
(`team_member` → `getPortalAuth`, `client` → `protectClientAPI`, default/
`admin` → `getTenantForRequest()`) — the same three-way split item (54)'s
push-channel work and this route's own security fix already established.
The `admin` branch was missing from the bypass list. Live caller: `<PushPrompt
role="admin" />` in `AdminSidebar.tsx`/`DashboardHeader.tsx` on the
`nyc-mobile-salon`, `wash-and-fold-nyc`, and `wash-and-fold-hoboken`
tenant-dashboard clones (the per-tenant operator clones `platform/CLAUDE.md`
already flags as debt to migrate, but still live and still the only UI these
three tenants' owners have) — an admin-impersonated owner clicking "Enable
notifications" got 307'd to `/sign-in` instead of subscribing.

Also checked `announcements/unread/route.ts`, which has the identical
`getTenantForRequest()`-with-no-bypass-prefix gap — but is dead code from
the dashboard's own perspective (grepped every `.tsx` under `app/`: no
component anywhere fetches `/api/announcements/unread` or references
`platform_announcements`; only the separate, already-covered PIN-authed
`/api/admin/announcements` CMS side and this route's own body reference it).
Left it undocumented as a gap here since there is no live request path to
be blocked — flagging as a Noticed item instead: a notification-bell UI for
platform announcements was apparently planned but never shipped.

**Fixed** — added `/api/push` to the bypass list. Extended
`middleware-domain-lookup.test.ts` with a third guard for this prefix.
`tsc --noEmit` clean, full suite 380/380 files, 1892/1892 tests, zero
regressions. Commit `b8107a59`.

## (84) Fresh ground — team-portal photo upload has 401'd since inception; wrong auth type entirely, not an impersonation-bypass gap

Different bug shape from items (81)-(83) — found while confirming
`/api/uploads` (the only other route `resolveAuthedTenantId`-style
dashboard/portal auth branching seemed plausible for) wasn't a sixth H-01
repeat. It isn't: `/api/uploads/route.ts` had exactly one auth path,
`getTenantForRequest()` — the Clerk-session/`admin_token`-cookie resolver —
unconditionally. Grepped the entire repo for its only caller: `app/team/
page.tsx`'s `handlePhotoUpload`, the client-side half of item (77)'s
already-fixed team-photo-upload feature (item 77 fixed the server writing to
the wrong DB column; this is the upload call one step earlier in the same
flow). The team portal authenticates with a PIN-issued bearer token
(`localStorage`'s `team_auth.token`, verified server-side via
`getPortalAuth()`/`verifyToken()`) — every other authenticated fetch in this
1000+ line file sends `Authorization: Bearer ${auth.token}` (8 other call
sites, confirmed by grep). The photo-upload fetch was the lone exception: no
Authorization header at all. Even if it had sent one, the route wouldn't
have checked it — `getTenantForRequest()` has no code path that reads a
portal bearer token, only Clerk cookies/admin-impersonation cookies, neither
of which a team-portal session ever carries.

Net effect: a team member has never been able to successfully upload a
profile photo, on any tenant, since the feature existed. Silent, because
`handlePhotoUpload`'s catch block is `catch { /* silently fail */ }` — the
UI just resets the "uploading" spinner and nothing happens, no error shown.
Confirmed via full-codebase grep that `/api/uploads` truly has no second
caller today (so the fix carries no risk of breaking a real admin/Clerk-
session upload path — that branch is now purely a forward-compatible
fallback, not exercised by any live UI yet).

**Fixed** — `uploads/route.ts` now checks `getPortalAuth(request)` first
(same helper `push/subscribe`'s `team_member` branch and every `team-portal/
*` route already use) and only falls back to `getTenantForRequest()` if no
portal token is present, scoping the upload path to whichever tenant
resolves. `team/page.tsx`'s fetch now sends `Authorization: Bearer
${auth.token}`, matching its 8 sibling calls in the same file. Added
`route.test.ts` (3 cases: no auth at all → 401, portal bearer token →
200 scoped to that member's tenant, admin/Clerk session with no portal
token → 200 scoped to that session's tenant) — `formData()` itself is
stubbed rather than built from a real multipart body, since jsdom's File/
FormData/Request classes (this repo's vitest `environment: jsdom`) aren't
brand-compatible with the undici multipart encoder `NextRequest.formData()`
actually uses at runtime, which is orthogonal to what this fix changes
(auth resolution, not multipart parsing). `tsc --noEmit` clean, full suite
380/380 files, 1892/1892 tests, zero regressions. Commit `b8107a59`.

## H-01 sweep — audited exhaustively today, class is now closed

Before hunting further instances of items (82)/(83)'s admin-impersonation-
bypass class, did a full sweep instead of another spot-check: enumerated
every `/api/*` directory in the repo (102), extracted every prefix already
covered by either `isPublicRoute` or the middleware admin-bypass `startsWith`
list (both are plain string-prefix checks, not path-segment-aware — so e.g.
the existing `/api/team` entry already covers `/api/team-applications`,
`/api/team-availability`, `/api/team-members` etc. as a side effect, not by
accident), and diffed the two sets. 14 directories came back uncovered by
either list. Checked each for `getTenantForRequest()`/`requirePermission()`
usage (the two helpers that actually need the impersonation-bypass to be
reachable) — only one, `user/preferences/route.ts`, uses either, and it has
**zero real callers anywhere in the repo** (grepped for the literal path),
same "unwired path, not a live bug" shape as the already-noted
`announcements/unread` case — correctly left alone, not "fixed" for the same
reason. `/api/uploads`' admin/Clerk fallback branch (the one item (84) didn't
touch) was also checked specifically since it does call
`getTenantForRequest()`: its only real caller in the whole app is
`app/team/page.tsx`'s portal-auth branch (item 84's fix), the `getTenantForRequest()`
fallback has no caller at all — same dead-branch verdict, not added to the
bypass list. Net: no live H-01 instances remain to close. Verified via a
plain-string prefix-coverage diff (`ls src/app/api` against every
`startsWith(...)` argument in `src/middleware.ts`) plus a direct grep of each
uncovered directory for the two gating helpers — not a hypothesis.

## (85) New today, archetype depth — item (79)'s client-side UTC-vs-local "today" sweep missed the Calendar page's own mobile list view — NOW FIXED

Direct continuation of items (74)/(75)/(79)'s UTC-vs-local "today" bug family
(client `new Date().toISOString().split('T')[0]` computes the date in UTC,
not the browser's local zone — wrong every evening once UTC has ticked into
tomorrow while it's still today locally). Item (79) swept 15 instances across
the booking/reschedule/dashboard/days-off surfaces but never touched
`src/app/dashboard/calendar/CalendarBoard.tsx` — grepped the whole repo today
for the same `toISOString().split('T')` shape and found one live instance
item (79) missed: `CalendarBoard.tsx:571`'s **Mobile List View** computes
`todayStr` this way, then filters `allBookings` to `b.start_time.split('T')[0]
>= todayStr` (line 572) and uses `todayStr` again to label the "Today"
section header (line 586). `b.start_time` itself is a naive/local datetime
string in this file (confirmed by the file's own `formatNaiveDate`/
`formatNaiveTime` helpers and its other same-day comparisons at lines 230/274,
which all treat `.split('T')[0]` as local — only the `todayStr` computation
itself was the odd one out, comparing a UTC-computed string against
naive-local ones). Concrete impact: every evening once the browser's local
clock has passed roughly UTC midnight (8-9pm Eastern, earlier during EDT),
`todayStr` silently becomes tomorrow's date, so the mobile calendar list
**drops every remaining booking for the rest of today** from view — an owner
checking their phone at 8:30pm to see if there's still a same-day emergency
job on the books would see it vanish from the "upcoming" list even though it
hasn't happened yet.

**Fixed** — same exact convention item (79) already established (verified via
`git show 3b0d0cb1`): `new Date().toISOString().split('T')[0]` →
`new Date().toLocaleDateString('en-CA')` (en-CA locale formats as
`YYYY-MM-DD` in the browser's local timezone). One-line change; the
comparison target (`b.start_time.split('T')[0]`) needed no change since it
was already correct/naive-local per the rest of the file's convention. `tsc
--noEmit` clean. No dedicated render-test harness exists for this file (same
precedent as `BookingsAdmin.tsx` elsewhere in this doc), so verification is
type-level plus direct re-read of the one-line diff against the surrounding
filter/label logic; full existing suite re-run clean, zero regressions
(expected — no prior test covered this line).

## (86) New today, fresh ground — reassigning a booking to a different tech never told the tech who lost it — NOW FIXED

Found while re-reading `PUT /api/bookings/[id]/route.ts`'s notification block
for item (17)'s precedent (operator-cancel now SMS's the assigned tech).
That same file's existing "Team member assigned/reassigned" block
(`memberChanged && data.team_members?.phone`) only ever sends the job-
assignment SMS to the **new** `team_member_id` — traced what happens to
whoever held the job before the reassignment and found nothing: no SMS, no
`notify()` call, no in-app signal of any kind reaches them. Same "silently
vanished" shape as item (17)'s cancellation gap, just one step earlier in
the same lifecycle — a dispatcher moving a same-day emergency job from Tech A
(running behind) to Tech B (closer/faster) never tells Tech A the job left
their plate; Tech A could still show up to a job that's no longer theirs, or
just be confused when it disappears from their schedule with no explanation.
Confirmed via the route's own `oldBooking` pre-update snapshot (already
fetched for change detection, just never used for this) and the `memberChanged`
boolean's definition (`fields.team_member_id && fields.team_member_id !==
oldBooking?.team_member_id`) — true precisely on a reassignment away from an
existing assignee, the exact condition needed to close this gap safely.

**Fixed** (`p1-w3`) — added a second block right after the existing
assignment SMS: when `memberChanged` and `oldBooking.team_member_id` was set
(i.e. a real reassignment, not a first-time assignment), looks up the
outgoing tech's phone and sends a plain "job has been reassigned to another
team member" SMS, wrapped in the same non-blocking try/catch this whole
notification section already runs under (a failed lookup/send can't fail the
booking update itself). 3 new tests
(`route.reassign-notify.test.ts`): true reassignment fires both the outgoing-
removal and incoming-assignment SMS, a first-time assignment (no prior tech)
fires only the incoming SMS, and a no-op update (tech unchanged) fires
neither. `tsc --noEmit` clean, full suite 381/381 files, 1895/1895 tests,
zero regressions (one pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts` predates this session's diff, same note item
(17) already made — not touched here).

**Update, later this session — the explicit-unassign gap flagged below is now
FIXED too (`p1-w3`), closing item (86) completely.** The gap left open above:
`memberChanged` requires `fields.team_member_id` to be truthy, so it's
`false` (never fires, not even the pre-existing "new assignment" branch) when
an admin explicitly **unassigns** a booking by setting `team_member_id: null`
(confirmed `pick()`, `src/lib/validate.ts:94`, keeps explicit `null` values —
only `undefined` is dropped — so this is a reachable state, not a
theoretical one). An outright unassignment left the outgoing tech just as
uninformed as before item (86)'s fix. Resolved without touching
`memberChanged` itself (per the concern below about its other call sites):
added a separate `explicitlyUnassigned = 'team_member_id' in fields &&
fields.team_member_id === null` boolean and OR'd it into the existing
removal-SMS condition — `memberChanged` and `explicitlyUnassigned` are
mutually exclusive (the former requires a truthy new id, the latter requires
exactly `null`), so the removal message branches cleanly between "reassigned
to another team member" and "unassigned from you" with no risk of picking the
wrong wording. The pre-existing "Team member assigned/reassigned" SMS block
needed no change — it's already gated on `data.team_members?.phone`, which is
naturally absent when the update set `team_member_id` to `null` (no join
match), so it silently no-ops for the unassign case exactly as it should. 1
new test (`route.reassign-notify.test.ts`): explicit unassign fires the
removal SMS with "unassigned" wording and sends nothing to a (nonexistent)
new assignee. `tsc --noEmit` clean, full suite 381/381 files, 1896/1896
tests, zero regressions (one pre-existing, unrelated `tenant-scope` guard
warning on `src/app/api/fixture/route.ts` predates this session's diff, same
note item (17)/(86) already made — not touched here).

## (87) New today, fresh ground outside the emergency archetype — the quote-deposit Stripe webhook always created a Job board card, even for recurring or booking-type sold quotes — NOW FIXED

Pivoted off the H-01 bypass-list class (now closed per the sweep above) to
hunt a genuinely different bug shape: a fulfillment-routing gap, not a
notification gap, timezone gap, or wrong-column-name gap like every other
item in this doc. Quotes carry a `recurring_type` (weekly/biweekly/etc — a
sold recurring service should spin up a `recurring_schedules` series) and a
`fulfillment_type` (`'booking'` — a sold one-off service should create a
`bookings` row, not a Job board card). The public no-deposit accept path
(`POST /api/quotes/public/[token]/accept`) already gets this right: it
branches 3 ways on close — `isRecurring` -> `createRecurringSeriesFromQuote`,
`isBooking` -> `createBookingFromQuote`, else -> `convertSaleToJob` (the
generic Job board). But the OTHER close path — the Stripe webhook's
quote-deposit branch (`checkout.session.completed` with
`metadata.quote_deposit === 'true'`, `src/app/api/webhooks/stripe/route.ts`)
— is the one that actually fires for any quote requiring a deposit (which is
the more common real-world case for a sold quote: most trades collect
something upfront). That branch unconditionally called `convertSaleToJob`
with no reference to `recurring_type` or `fulfillment_type` at all — its own
`.select('id, deal_id, quote_number')` on the atomic-claim UPDATE didn't even
fetch those two columns, so it structurally couldn't have branched even if it
tried. Net effect: any tenant that requires a deposit on a recurring-service
quote (e.g. a weekly cleaning contract) or a booking-type quote got a
one-off Job board card instead of the recurring schedule series (with its
initial 6-week horizon of visit bookings) or the single Booking the
no-deposit accept path would have created for the identical quote — a real
fulfillment-model mismatch on the money-in path, not just a display gap.
Confirmed via direct signature/branch comparison of
`public/[token]/accept/route.ts` against the webhook, and via
`sale-to-booking.ts`/`sale-to-recurring.ts`/`jobs.ts`'s `convertSaleToJob`,
all three of which read `quote.total_cents` directly with zero reference to
tiers (also checked while here whether the `quotes.tiers`/`accepted_tier`
columns feeding a stale-total risk on tier selection were a live concern —
they are not: zero references to "tier" anywhere in the admin quote builder
`_QuoteBuilder.tsx` or the public `quote-view.tsx`, so that column pair is
dead/unwired code, correctly left alone per this doc's own precedent for
unreachable paths, e.g. item (10)'s find-cleaner broadcast and the H-01
sweep's `user/preferences` verdict).

**Fixed** (`p1-w3`) — the webhook's atomic-claim UPDATE now also selects
`recurring_type, fulfillment_type` off the same row it already claims
(`deposit_paid_at` flip), and the fulfillment call site now runs the
identical 3-way branch the accept path uses: `recurring_type` truthy ->
`createRecurringSeriesFromQuote`, `fulfillment_type === 'booking'` ->
`createBookingFromQuote`, else -> `convertSaleToJob` (unchanged default,
verified by a control-case test). No schema change needed — both columns
already existed and were already correctly populated at quote-creation time
(`POST /api/quotes`), they just were never read on this close path. 3 new
tests (`route.deposit-fulfillment.test.ts`, mirroring the existing
`route.race.test.ts`'s fake-Stripe/fake-Supabase harness): a recurring quote
creates a `recurring_schedules` row (+ its initial visit bookings) and zero
Jobs, a booking-type quote creates exactly one `bookings` row and zero Jobs,
and the plain-project control case still creates exactly one Job (proving the
default branch is unchanged). `tsc --noEmit` clean, full suite 382/382 files,
1899/1899 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts` noted
elsewhere in this doc — not touched here).

## (88) New today, archetype depth — `PUT /api/cleaners/[id]` computed "today" in the server's default zone instead of the tenant's, silently stripping a still-current unavailable-date entry every evening — NOW FIXED

Same day-boundary bug shape as items (70)-(75)/(78)/(85), a route none of
those sweeps touched (they covered same-day/emergency determinations and
client-facing date pickers; this one is neither — it's an operator-facing
team-member profile edit). `PUT /api/cleaners/[id]` (the legacy nycmaid-
compat shim over `team_members`, still the only route that can set
`working_start`/`working_end`/`pin`/`role`/etc. via the dashboard's team
editor) filters the submitted `unavailable_dates` array down to future-only
entries before saving: `today = new Date().toISOString().split('T')[0]`,
`d >= today`. On Vercel (UTC-default, the same assumption items (70)-(73)
established and item (71) confirmed empirically doesn't hold on a
local-ET sandbox, hence the `vi.stubEnv('TZ', 'UTC')` fix to this session's
own test methodology), a tenant on America/New_York already ticks past UTC
midnight by 7-8pm local — so any PUT to this route during that window
computed "today" as tomorrow's date and silently dropped a genuinely-still-
current `unavailable_dates` entry for that tenant's own actual "today" one
day early. Concrete impact: an admin editing any *other* field on a team
member's profile in the early evening (the route saves the whole form, not
a diff) could silently un-block a tech who is still marked unavailable for
the rest of today, one edit-of-something-unrelated away from over-scheduling
them.

**Fixed** (`p1-w3`) — same convention items (72)/(85) already established:
`new Date().toLocaleDateString('en-CA', { timeZone: tenant.tenant?.timezone
|| 'America/New_York' })`, reading the tenant's own configured zone off the
`TenantContext.tenant` row `requirePermission()` already returns (confirmed
via `require-permission.ts`'s own `tenant.tenant?.selena_config` access
pattern — same nesting). 2 new tests
(`src/app/api/cleaners/[id]/route.test.ts`): a `vi.stubEnv('TZ', 'UTC')` +
fake-timer case at 2026-01-15 23:30 America/New_York (already 2026-01-16
04:30 UTC) proves a same-(tenant-local)-day entry survives the filter, plus
a no-timezone-set fallback case. Mutation-verified (reverted to the UTC
line, both new tests RED — the one asserting the still-current date
survives failed with `[]` instead of `['2026-01-15']` — restored, GREEN).
`tsc --noEmit` clean, full suite 384/384 files, 1903/1903 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

## (89) New today, fresh ground outside the archetype — the AI bot's `report_issue` tool (client complaints) never reached Jeff's Telegram, while its sibling `request_callback` tool always did

Found applying the "declared-type sweep" method (items (63)/(66)/(68)/(69))
one layer deeper — not to `lib/notify.ts`'s tenant-scoped `NotificationType`
union this time, but to the older, separate `lib/nycmaid/notify.ts` module
Selena/Yinez's own tool handlers actually call (`import { notify } from
'@/lib/nycmaid/notify'`, a loose `type: string`, not the typed union — a
different file from every prior notify-type item in this doc). That module
maintains its own `TELEGRAM_NOTIFY_TYPES` allowlist deciding which
notification types also get pushed to Jeff's phone via Telegram in real
time, versus sitting dashboard-only. `selena/core.ts`'s tool list documents
`report_issue` and `request_callback` identically — both say "Notifies
admin" — and both are routed to by the exact same `feedback_negative`/
`human_request` intent branches as each other's nearest siblings. But their
handlers diverged: `handleRequestCallback` calls `notify({ type:
'callback_requested', ... })`, which **is** in `TELEGRAM_NOTIFY_TYPES`;
`handleReportIssue` — the tool used for logging an actual client complaint
(explicitly routed to on negative feedback, per core.ts's own
`feedback_negative: 'Acknowledge. Apologize sincerely. Use report_issue
tool. Do NOT be defensive.'` comment) — calls `notify({ type:
'client_issue', ... })`, which was **not** in the set. Net effect: a client
telling Yinez they want a human to call them back reached Jeff on Telegram
within seconds; a client filing an actual complaint about the service —
arguably the higher-urgency of the two — landed only in the dashboard
notifications feed, silent until someone happened to check it. Confirmed
via a full sweep of every `notify({ type: '...' })` call site importing
from this specific module (6 files: `auth/login`, `client/confirm/[token]`,
`api/yinez`, `nycmaid/error-logger`, `selena/core.ts`, `selena/tools.ts`)
against the allowlist — `client_issue` was the one genuine mismatch between
a "notifies admin" tool docstring and its actual reach; the others either
already matched (`callback_requested`, `new_lead`, `new_booking`,
`yinez_error`) or are lower-urgency by design per the module's own comment
("Security/login chatter and unsubscribe noise stay dashboard-only" —
correctly excludes `security`, `error`, `payment_claimed`, `booking_cancelled`,
`recurring_cancelled`, `refund_approved`, none of which claim to "notify
admin" the way the report_issue/request_callback pair does).

**Fixed** (`p1-w3`) — added `'client_issue'` to `TELEGRAM_NOTIFY_TYPES` in
`src/lib/nycmaid/notify.ts`. New test file
`src/lib/nycmaid/notify.test.ts` (2 cases): a `client_issue` notify call
now reaches `notifyOwnerOnTelegram`, and a dashboard-only type
(`security`) still correctly does not. Mutation-verified (reverted the
one-line addition, the `client_issue` case went RED — 0 calls instead of
1 — restored, GREEN). `tsc --noEmit` clean, full suite 384/384 files,
1903/1903 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not
touched here).

## (90) New today, archetype depth — the two internal AI copilots (`admin/ai-chat`, `ai/assistant`) computed "today" in the wrong zone, both for their own system prompt and their `get_schedule_summary` tool's default date

Same day-boundary bug shape as items (70)-(75)/(78)/(85)/(88), a pair of
routes none of those sweeps touched — they're neither same-day/emergency
determinations nor client-facing date pickers nor an operator's team-member
edit; they're the two Claude-backed CRM copilots (`POST /api/admin/ai-chat`
and `POST /api/ai/assistant`) an admin chats with to ask things like
"what's on today's schedule?". Both had the identical two-part bug:

1. `get_schedule_summary`'s tool handler defaulted a missing `date` input to
   `new Date().toISOString().split('T')[0]` — the server/UTC "today" — then
   used that string to build the `start_time` range filter (`${date}T00:00:00`
   .. `${dateTo}T23:59:59`) against `bookings.start_time`, a naive-ET column.
   On Vercel (UTC-default), any tenant already ticks past UTC midnight by
   the multi-hour evening window items (70)-(73) established — so an admin
   asking "what do I have today" in that window silently got tomorrow's
   bookings instead, an entirely wrong day's schedule, not just an
   off-by-one filter edge.
2. Each system prompt's own "Today is ..." line — the one piece of date
   context the model is explicitly given to interpret relative requests
   ("book something for today/tomorrow") — resolved from a **different**
   zone than the tool default it's supposed to agree with:
   `admin/ai-chat` hardcoded `America/New_York` regardless of which
   tenant was asking (wrong for any non-ET tenant, always, not just
   evenings); `ai/assistant` passed no `timeZone` at all, i.e. the server
   runtime's own default (UTC on Vercel) — worse than its sibling, since it
   drifted for every tenant including ET ones, every day, not just the
   evening window.

Neither file had ever read `tenants.timezone` (`TenantSettings.timezone`,
the column `availability.ts`/`cleaners/[id]` already established as the
canonical source, per its own doc comment: "Same-day/emergency date
comparisons must resolve 'today' in this zone... see item (70)") despite
both already having the tenant row in scope (`getTenantForRequest()`
returns `{ tenant }`, a `.select('*')` row) — the fix needed zero new
DB round-trips, only a value already sitting unread.

**Fixed** (`p1-w3`) — both files now compute
`const tz = tenant.timezone || 'America/New_York'` once in `POST`, thread
it into `executeTool()` as a new parameter (used for the `get_schedule_summary`
default via `new Date().toLocaleDateString('en-CA', { timeZone: tz })`,
the same `availability.ts`/item-(88) convention), and pass it into the
system prompt's `toLocaleDateString(..., { timeZone: tz })` call instead of
a hardcoded/absent zone. 4 new tests across 2 files
(`src/app/api/admin/ai-chat/route.test.ts`, `src/app/api/ai/assistant/route.test.ts`),
each mocking the Anthropic client to return a `get_schedule_summary`
tool-use turn with no `date` input and asserting the resulting
`bookings` query's `gte`/`lte` filters land on the tenant-local date at an
evening-ET-but-next-day-UTC timestamp (plus a Pacific-tenant case on the
`ai/assistant` side, and a no-timezone-set fallback on `admin/ai-chat`).
Mutation-verified (reverted both `toLocaleDateString('en-CA', ...)` lines
back to `toISOString().split('T')[0]`, all 4 new tests RED — captured date
one day ahead of expected — restored, GREEN). `tsc --noEmit` clean, full
suite 386/386 files, 1907/1907 tests, zero regressions (same pre-existing,
unrelated `tenant-scope` guard warning on `src/app/api/fixture/route.ts`,
not touched here).

## (91) New today, fresh ground — `notify.ts`'s own declared `NotificationType` union has listed `expense_added` and `payroll_paid` since its beginning, and the admin docs advertise both as supported — neither has ever been fired

Found applying the "declared-type sweep" method (items (63)/(66)/(67)/(68)/(89))
to a subsystem none of those sweeps covered — finance, not quotes/bookings.
`src/app/admin/docs/page.tsx`'s own "Notification Types" reference (the
in-product documentation an admin reads to understand what the system
notifies on) lists `expense_added` and `payroll_paid` among the types the
platform supports, and `lib/notify.ts`'s `NotificationType` union has
declared both since the file's own beginning — but a full-codebase sweep
of every `notify({ type: '...' })` call site found zero call sites for
either, anywhere. Concretely:

- `POST /api/finance/expenses` inserts the row, writes an `audit()` log
  entry, and returns 201 — `expense_added` never fires. An expense recorded
  by any team member (not just the owner) leaves no trace in the owner's
  own in-app notifications feed.
- `POST /api/finance/payroll` inserts the `payroll_payments` row, posts it
  to the ledger (`postPayrollToLedger`), and marks the related bookings
  paid — `payroll_paid` never fires either, the one step of running payroll
  that's supposed to be admin-visible per the docs' own claim.

Both routes already document their own audit/ledger side effects in
comments; neither ever mentioned notifications, suggesting the declared
type was added to the union (and the docs) when the feature was designed,
then the actual `notify()` call was never wired at either site — the same
originate-then-never-wire shape as items (63)/(66)/(67)/(68), just in a
part of the codebase that sweep never reached.

**Fixed** (`p1-w3`) — added a `notify()` call (dynamic-imported, try/catch
+ `console.warn` on failure, matching item (67)'s
`quotes/[id]/send` precedent so a notification failure never blocks the
underlying financial write) to both routes: `expense_added` after the
`expenses` insert (`recipientType: 'admin'`, message includes category +
dollar amount), `payroll_paid` after the `payroll_payments` insert
(message includes dollar amount + method). 2 new tests
(`src/app/api/finance/expenses/route.notify-type.test.ts`,
`src/app/api/finance/payroll/route.notify-type.test.ts`), each asserting
`notify()` fires exactly once with the right `type`/`tenantId`/`recipientType`
and a message containing the dollar amount. Mutation-verified (reverted
both new `notify()` blocks, both new tests RED — 0 calls instead of 1 —
restored, GREEN). `tsc --noEmit` clean, full suite 388/388 files,
1909/1909 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not
touched here).

## (92) New today, archetype depth — item (87)'s fulfillment-routing gap repeats on the manual Kanban close: `POST /api/deals/[id]/stage` always created a Job for a deal's sold quote regardless of `recurring_type`/`fulfillment_type` — NOW FIXED

Item (87) established that a sold quote must route 3 ways on close —
`recurring_type` set → `createRecurringSeriesFromQuote`, `fulfillment_type
=== 'booking'` → `createBookingFromQuote`, else → `convertSaleToJob` (Job
board) — and fixed the Stripe quote-deposit webhook, the one call site that
previously always defaulted to the Job board. Swept every other place a
deal can close to Sold looking for the same shape and found a third: the
sales pipeline's own Kanban board. `dashboard/sales/pipeline/page.tsx`'s
`moveToStage()` drags a deal card to the Sold column with **no** conversion-
type prompt — it's the generic "close this deal" action, same automatic-
close category as the deposit webhook, not an explicit "Convert to
Booking"/"Convert to Job" button click (those two, `/api/quotes/[id]/convert`
and `/convert-to-job`, are deliberate single-purpose admin actions and
correctly always create their one named thing — not in scope here). The
backing route, `POST /api/deals/[id]/stage`, looked up the deal's latest
unconverted quote and unconditionally called `convertSaleToJob` with zero
reference to `recurring_type`/`fulfillment_type` — its own `.select('id')`
didn't even fetch those columns. Net effect: dragging a deal with a
recurring or booking-type quote to Sold on the Kanban board created a one-
off Job board card instead of the recurring schedule series or the single
Booking the identical quote would have gotten via the accept path or the
(87)-fixed webhook.

**Fixed** (`p1-w3`) — the sold-transition lookup now also selects
`recurring_type, fulfillment_type`, and the call site runs the same 3-way
branch as the accept path, the (87) webhook fix, and (below) item (93):
`recurring_type` truthy → `createRecurringSeriesFromQuote`, `fulfillment_type
=== 'booking'` → `createBookingFromQuote`, else → `convertSaleToJob`
(unchanged default). 3 new tests
(`route.fulfillment-routing.test.ts`, mirroring (87)'s own test file): a
recurring quote creates a `recurring_schedules` row and zero Jobs, a
booking-type quote creates one `bookings` row and zero Jobs, and the plain-
project control case still creates exactly one Job. Mutation-verified (`git
apply -R` the fix, both non-control tests RED — 0 recurring
schedules/bookings instead of 1, reproducing the exact pre-fix symptom —
`git apply` restored, GREEN). `tsc --noEmit` clean.

## (93) New today, fresh ground — Selena's `update_deal` tool had two bugs: `value_dollars` wrote to a column that doesn't exist, and closing a deal to Sold bypassed every one of the human close path's side effects, including — a second (87)/(92) repeat — fulfillment creation entirely

Investigating (92) raised the question of whether the AI bot has its own
path to close a deal, since the pipeline Kanban isn't every admin's way of
running sales — Selena's `update_deal` tool (`agent.ts`'s live `TOOLS` array,
passed to every `messages.create()` call across all channels/tenants) lets
an owner ask "mark this deal sold" in chat. `handleUpdateDeal` in
`selena/tools.ts` turned out to have two independent bugs:

1. `value_dollars` (e.g. "the deal is worth $500") wrote
   `update.value = Math.round(v * 100)` — but `deals`' dollar column is
   `value_cents` (confirmed via migration 029's own comment: "Existing deals
   table already has stage/value_cents/probability/..." and `deals/route.ts`'s
   correct usage). `value` isn't a column on this table at all, so every
   AI-driven deal-value update via this tool has errored since the tool's
   beginning — a silent no-op from the owner's perspective (Selena just
   reports the tool failed and moves on), not a wrong-value bug but a
   never-worked one.
2. Setting `fields.stage` to `'sold'` was a raw, unconditional
   `.update(update)` on the `deals` row — none of `POST
   /api/deals/[id]/stage`'s close-to-Sold side effects ran: no
   `probability: 100`, no `closed_at` (which `sales-won-tab.tsx`'s default
   "this month" filter reads, falling back to a stale `last_activity_at`/
   `created_at` when null — a deal Selena closed could silently miss the
   Won tab's own default view), no `stage_change` activity-log entry, and —
   the exact fulfillment-routing gap items (87)/(92) just closed on two
   other call sites — no `recurring_schedules` series, `Booking`, or `Job`
   created at all. A deal an owner asked Selena to close looked sold in the
   pipeline but nothing downstream ever happened.

**Fixed** (`p1-w3`) — `value_dollars` now writes `value_cents`. Closing to
`'sold'` (detected by reading the deal's current stage before the update)
now sets `probability: 100` + `closed_at`, logs a `stage_change`
`deal_activities` row, and runs the identical 3-way fulfillment branch
(92)/(87)/the accept path use, against the deal's latest unconverted quote.
A same-stage no-op (already `'sold'`) intentionally does none of this, same
idempotency guard the other two close paths rely on. 7 new tests
(`tools.update-deal.test.ts`, `handleUpdateDeal` exported for direct testing
same as `handleProcessStripeRefund`): the column fix, probability/closed_at,
the activity log, all three fulfillment branches, and the already-sold no-op
control case. Mutation-verified in two passes: (a) full `git apply -R` of
the fix confirmed all 6 non-control-case tests RED for import-shape reasons
too, so (b) a surgical revert that kept the `export` but restored the exact
pre-fix function body — 6/7 RED for the right reason (wrong/missing values:
20000 instead of 50000 cents, 80 instead of 100 probability, 0 instead of 1
activity/schedule/booking/job rows), 1/7 (the no-op control) correctly
stayed GREEN since that path is unchanged — restored, GREEN. `tsc --noEmit`
clean, full suite (both items) 390/390 files, 1919/1919 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

## (94) New today, fresh ground + archetype-depth sweep combined — Selena's owner-facing tools.ts was never ported off nycmaid's pre-rename `cleaners`/`cleaner_id` vocabulary; ~14 tool handlers queried/wrote a table that hasn't existed since the fullloop rename — NOW FIXED

Investigating whether Selena has other tools with item (93)'s "raw update
skips real side effects" shape led to `score_cleaners` — agent.ts's own
comment calls it "the canonical availability source... Yinez must use it
for every slot quote on every channel" — which turned out to import
`scoreCleanersForBooking` from `@/lib/nycmaid/smart-schedule`, a legacy
module that queries `cleaners`/`booking_cleaners`. The *current* module,
`@/lib/smart-schedule`, exports the renamed `scoreTeamForBooking` and
queries `team_members`/`booking_team_members` — the real, live schema.
Three independent migration comments confirm `team_members` is fullloop's
only convention and `cleaners` was never carried over:

- `src/lib/migrations/009_nycmaid_parity_columns.sql`: "Rename-artifact
  `cleaner_*` cols intentionally skipped (fullloop uses `team_member_*`)."
- `src/app/api/cleaners/route.ts` / `[id]/route.ts`: "Legacy nycmaid path —
  `/api/cleaners` reads/writes `team_members`. Kept as thin compatibility
  shim so nycmaid-era code/frontends keep working."
- `supabase/smart_scheduling.sql`: adds `bookings.suggested_team_member_id`
  and (via `smart-schedule.ts`) `clients.preferred_team_member_id` — never
  a `*_cleaner_id` variant.

A full sweep of `tools.ts` found the same wrong-vocabulary shape repeated
across ~14 more handlers, none of them ever ported:

- `get_today_summary` (also the backbone of `get_briefing`) — bookings/
  payouts joins against `cleaners`, `bookings.cleaner_id`,
  `cleaner_payouts`, none of which exist.
- `get_smart_suggestion` — selected `bookings.cleaner_id`,
  `suggested_cleaner_id`, joined `cleaners(name)`; also called the same
  legacy `scoreCleanersForBooking`.
- `assign_cleaner_to_booking` — wrote `bookings.cleaner_id` (errors —
  unknown column); even once fixed to `team_member_id`, it was a raw
  update with **zero** notification to the newly-assigned tech, while the
  human `PUT /api/bookings/[id]` path already sends a job-assignment SMS
  on the same transition (same "mirror the human path's side effects" gap
  as items (86)/(93)).
- `create_manual_booking` — inserted `cleaner_id: null,
  suggested_cleaner_id: ...` into `bookings`; both columns nonexistent, so
  every manual booking Selena created for an owner has errored outright
  since this tool's beginning.
- `update_booking` — `cleaner_id` in the fields whitelist wrote straight
  through to a nonexistent column.
- `list_bookings` — joined `cleaners(name, id)` and filtered
  `.eq('cleaner_id', ...)`; the multi-tech team lookup queried
  `booking_cleaners` (real table is `booking_team_members`).
- `lookup_cleaner`, `send_message_to_cleaner`, `send_broadcast`
  (`all_cleaners` audience) — queried `.from('cleaners')` directly for
  contact info; `lookup_cleaner`'s payout/rating joins used
  `cleaner_payouts`/`.eq('cleaner_id', ...)` (real table
  `team_member_payouts`, real FK `team_member_id`).
- `lookup_client` — selected/joined `clients.preferred_cleaner_id`
  against `cleaners`; real column is `preferred_team_member_id`.
- `create_cleaner` / `update_cleaner` / `deactivate_cleaner` /
  `list_cleaners` — all four `.from('cleaners')`, with `zone` as a bare
  column; `team_members`' real equivalent is the array `service_zones`.
- `approve_cleaner_application` — inserted the new hire into `cleaners`
  (not `team_members`) with a bare `zone` (application row's real column
  is `service_zones`), then updated `cleaner_applications` with
  `status: 'approved'` (the table's real CHECK constraint only allows
  `'pending'|'reviewed'|'accepted'|'rejected'` — `'approved'` would have
  been rejected) plus `approved_at`/`cleaner_id`, neither of which exist
  (only `reviewed_at`). No dashboard UI manages `cleaner_applications` at
  all — this tool was the *only* path that could ever turn a real
  application into a real team member, and it has never worked.
- `reject_cleaner_application` — same shape: wrote nonexistent
  `rejected_reason`/`rejected_at` columns.
- `block_cleaner_dates` — inserted into `cleaner_blocks`, a table that
  doesn't exist anywhere in the tracked schema. The real mechanism is
  `team_members.unavailable_dates` (`DATE[]`), the same array `PUT
  /api/cleaners/[id]` (item (88)'s fix) replaces wholesale.
- `mark_payout_paid` — updated `cleaner_payouts` (real table
  `team_member_payouts`).

**Fixed** (`p1-w3`) — every call site above rewired to the real
`team_members` / `team_member_payouts` / `booking_team_members` tables and
real column names (`team_member_id`, `suggested_team_member_id`,
`preferred_team_member_id`, `service_zones`). External tool-facing field
names the LLM already knows from agent.ts's `TOOLS` schemas (`cleaner_id`,
`zone`) were kept as-is and translated internally, so no prompt/schema
changes were needed. `assign_cleaner_to_booking` now also sends the
missing new-tech SMS. `block_cleaner_dates` now reads-merges-writes the
real `unavailable_dates` array instead of inserting into a phantom table.
`approve_cleaner_application` now writes a valid `status: 'accepted'` and
uses `reviewed_at`; `reject_cleaner_application` appends the reason to
`notes` (the only free-text field the table actually has) instead of a
nonexistent `rejected_reason`.

15 new tests (`tools.team-members-schema.test.ts`), covering the highest-
severity paths through the real `runTool` dispatcher: `score_cleaners`'
module wiring, `get_today_summary`, `get_smart_suggestion`,
`assign_cleaner_to_booking` (+ SMS), `create_manual_booking`,
`list_bookings`, the four cleaner-CRUD tools, `block_cleaner_dates`,
`mark_payout_paid`, `lookup_client`, and both application-review tools.
Mutation-verified: `git apply -R` the entire fix, all 15/15 tests RED for
the expected reason (wrong table populated instead of `team_members`,
wrong/missing column values, `cleaner_blocks`/`cleaners` rows appearing
where none should, missing SMS) — `git apply` restored, GREEN. `tsc
--noEmit` clean, full suite 391/391 files, 1934/1934 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

**Noticed, not fixed — flagging for live-schema verification before
touching it**: `src/lib/selena/core.ts`'s `handleCreateBooking` (the
`create_booking` tool's real implementation, bridged in from every
channel/tenant via `CLIENT_TOOLS`; its own comment calls it "the
platform's most-used AI booking assistant") has the *same* bug shape at
higher severity — it imports `scoreCleanersForBooking` from
`@/lib/nycmaid/smart-schedule` and inserts `suggested_cleaner_id` into
`bookings` (real column `suggested_team_member_id`), which by the same
evidence used above would fail every booking `INSERT` outright. Did not
fix this round: `core.ts` is heavily nycmaid-tenant-specific
(hardcoded `thenycmaid.com` links, hardcoded staff first names, a
hardcoded NYC phone number) in a way `tools.ts` is not, and it's genuinely
unclear from source alone whether it's dead/superseded code, a
correctly-scoped nycmaid-only override that still has live `cleaners` data
underneath it (contradicting this item's "table doesn't exist" evidence
the way item (77)'s live-schema check contradicted a source-only read),
or actually the shared implementation silently broken for every non-
nycmaid tenant. This needs a live prod-schema check (`cleaners` table
existence + row count) before anyone touches it — flagging instead of
guessing, given the blast radius is the primary client-facing booking
flow.

## (95) Archetype depth — item (94)'s flagged-not-fixed `core.ts` `handleCreateBooking` confirmed live and fixed — NOW FIXED

Live prod-schema check (read-only) confirmed item (94)'s open question the
hard way: `cleaners`, `booking_cleaners`, `cleaner_payouts`, and
`cleaner_blocks` do not exist anywhere in prod, and `bookings` has zero
`cleaner_id`-related columns. `core.ts`'s nycmaid-specific styling
(hardcoded `thenycmaid.com` links, staff first names, an NYC phone number)
was a red herring — there is no separate live `cleaners` table underneath
it the way item (77)'s live-schema check overturned a source-only read.
`handleCreateBooking` — the `create_booking` tool's real implementation,
bridged in from every channel/tenant via `CLIENT_TOOLS`, its own comment
calling it "the platform's most-used AI booking assistant" — has been
importing `scoreCleanersForBooking` from the legacy `@/lib/nycmaid/
smart-schedule` (queries the nonexistent `cleaners`/`booking_cleaners`)
and inserting `suggested_cleaner_id` into `bookings`, a column that has
never existed. Every AI/SMS-created booking's insert has been going out
with a booking-yet-technician-suggestion silently dropped (the field
write is a straight insert, not wrapped separately from the rest of the
row, so a genuinely nonexistent column would 400 the whole `INSERT` —
confirmed by the mutation test below going RED with the pre-fix column
name).

**Fixed** (`p1-w3`) — same swap item (94) made in `tools.ts`: import
`scoreTeamForBooking` from the real `@/lib/smart-schedule` (identical
call signature — `tenantId`, `date`, `startTime`, `durationHours`,
`clientAddress`, `clientId`, `hourlyRate` — and identical
`{ id, name, score, available, reason }` shape on the returned scores, so
no downstream logic changed), and write the suggested tech to
`suggested_team_member_id` instead of `suggested_cleaner_id`. No
tool-schema or LLM-facing field name changed — `handleCreateBooking`
never exposed `cleaner_id`/`suggested_cleaner_id` as an external tool
argument, so this was pure internal wiring.

2 new tests (`core.create-booking-team-members-schema.test.ts`), covering
the real `handleCreateBooking` entry point: asserts `scoreTeamForBooking`
is called and the legacy `scoreCleanersForBooking` is not, and that the
inserted booking row carries `suggested_team_member_id` (not
`suggested_cleaner_id`). Mutation-verified: `git apply -R` the fix, both
tests RED for the expected reason (mock never called; inserted row's
`suggested_team_member_id` `undefined`) — `git apply` restored, GREEN.
Also updated the adjacent `core.create-booking-emergency-rate.test.ts`'s
stale mock of the now-unimported `@/lib/nycmaid/smart-schedule` to mock
the real `@/lib/smart-schedule` instead, so it actually intercepts the
call the function under test makes (previously the real, unmocked
`scoreTeamForBooking` was silently running against the fake-supabase
store on every test, caught only because the score lookup is
try/catch-wrapped). `tsc --noEmit` clean, full suite 392/392 files,
1936/1936 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not
touched here).

## (96) Fresh ground, same file as items (94)/(95) — item (94)'s tools.ts-only audit missed that the identical `cleaners`/`cleaner_id` vocabulary bug repeats across ~8 more `core.ts` call sites outside `handleCreateBooking` — NOW FIXED

While landing item (95), a full sweep of the rest of `core.ts` (not just
`handleCreateBooking`) turned up the same wrong-vocabulary shape item (94)
found and fixed in `tools.ts`, repeated across every other place `core.ts`
touches team-member data:

- `isCleanerPhone` — the staff-phone detector (used to route an inbound SMS
  to the staff-message path instead of the client-booking flow) queried
  `.from('cleaners')` with a bare boolean `.eq('active', true)`; the real
  `team_members` table has no `active` column, only `status`
  (`'active'|'inactive'|'suspended'`). Every staff phone number has been
  falling through to the client flow.
- `handleGetAccount` (`get_account`) — both its upcoming-bookings and
  active-recurring-schedule queries joined `cleaners(name)`.
- `handleResendConfirmation` (`resend_confirmation`) — joined
  `cleaners(name)` into the booking-confirmation resend email.
- `handleConfirmPayment` (`confirm_payment`) — selected `cleaner_id` and
  joined `cleaners(name, phone, sms_consent)`; both unused by the function
  itself, but a nonexistent-relationship join still fails the whole query
  against real Postgres, not just the two dead fields.
- `handleLookupBookings` (`lookup_bookings`) — joined `cleaners(name)`.
- `handleBookingDetails` (`booking_details`) — selected the nonexistent
  `cleaner_pay` column (real column, added by
  `011_parity_with_nycmaid.sql`: `team_member_pay`) and joined
  `cleaners(name)`.
- `getClientProfile` (backs the AI's own context-building, not a
  client-facing tool) — two separate queries joined `cleaners(name)`,
  feeding both the "preferred cleaner" tally (most-frequent completed-job
  tech) and the upcoming/recent booking lists.

Every one of these functions is wrapped in try/catch that swallows the
query error and returns a generic `{ error: '...' }` (or, for
`getClientProfile`/`isCleanerPhone`, silently degrades to
nulls/`isCleaner: false`) — so nothing crashed, but `get_account`,
`resend_confirmation`, `confirm_payment`, `lookup_bookings`, and
`booking_details` have been unconditionally failing for every tenant,
every channel, since whenever core.ts last touched these queries, and
`isCleanerPhone` has been silently misrouting every staff member's texts
into the client-booking flow the whole time.

**Fixed** — every site above rewired to `team_members`, `status`,
`team_member_id`, `team_member_pay`, and `team_members(name)` joins, the
same mapping item (94) established. No LLM/tool-schema field names
changed (none of these fields were ever tool-facing).

6 new tests (`core.team-members-schema.test.ts`) through the real
`handleTool` dispatcher and the directly-exported `isCleanerPhone`/
`handleBookingDetails`/`getClientProfile`: staff-phone active/inactive
matching, `get_account`'s upcoming + recurring cleaner surfacing,
`lookup_bookings`, `booking_details`, and `getClientProfile`'s preferred-
cleaner tally + upcoming/recent lists. Mutation-verified: `git apply -R`
the fix, 5/6 RED for the expected reason (the 6th — the inactive-team-
member negative case — correctly still passed, since a wrong table lookup
still correctly finds nothing) — `git apply` restored, GREEN. `tsc
--noEmit` clean, full suite 393/393 files, 1942/1942 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning,
not touched here).

## (97) Archetype depth — items (86)/(89)'s "mirror the human path" reassignment-notify shape repeats on two more write paths PUT /api/bookings/[id] never sees — NOW FIXED

Items (86)/(89) fixed `PUT /api/bookings/[id]` so a booking reassignment or
unassignment texts both the outgoing and incoming tech, not just the
incoming one. Two other places write `bookings.team_member_id` and never
go through that route at all, so neither got the fix:

- `PUT /api/bookings/[id]/team` (multi-tech lead/extras management) writes
  `bookings.team_member_id` (the lead) directly. Its own header comment
  claimed "lead is handled by the main `/api/bookings/[id]` PUT path on
  `team_member_id` change" — false; this route never calls that path. A
  lead swap here notified neither the outgoing nor the incoming lead (only
  newly-added *extras* were ever notified, via the one `notifyTeamMember()`
  loop that already existed).
- `PUT /api/bookings/batch-update` — BookingsAdmin's own "apply to all
  future bookings" series-edit path, and `BATCH_UPDATE_FIELDS` already
  allowlists `team_member_id` for exactly this use (confirmed live:
  `BookingsAdmin.tsx`'s series-edit branch sends
  `team_member_id: form.cleaner_id || null` on every future booking in the
  series). The old code only ever SMS'd the NEW tech, gated on
  `notify_type === 'rescheduled'` — set by the caller only when the *time*
  shifted, not when the tech did, so a pure reassignment with unchanged
  times notified no one — and only for the FIRST booking in the batch. The
  outgoing tech was never notified at all, for any booking in the series.

**Fixed** — `[id]/team`'s lead swap now notifies both sides via the same
`notifyTeamMember()` shape already used for extras (`job_assignment` /
`job_cancelled`). `batch-update` now aggregates one SMS per affected
outgoing/incoming tech across the whole batch (not one per booking, to
match this route's own "sends ONE notification" design intent), fired
whenever a booking's `team_member_id` actually changes — independent of
`notify_type`.

8 new tests across 2 files, mutation-verified (`git apply -R` both fixes,
5/8 RED for the expected reason — missing `notify()`/`notifyTeamMember()`
calls — the 3 no-op/first-time-assignment controls correctly stayed GREEN
throughout; `git apply` restored, GREEN). `tsc --noEmit` clean, full suite
395/395 files, 1950/1950 tests, zero regressions. Commit `9d8c5f82`.

## (98) Fresh ground (cleaners/cleaner_id vocabulary thread, items 94-96, now closed) — the daily payment-followup cron chases refunded bookings for payment

`finance/ar-aging` and `finance/reconcile-candidates` both already exclude
`'refunded'` alongside `'paid'` from their own "still owes money" queries
(`.not('payment_status', 'in', '(paid,refunded)')`). The daily payment
follow-up cron — 8am/12pm/6pm ET SMS chase for unpaid completed jobs,
link-based via Stripe — never got the same exclusion; it only skipped
`payment_status` `paid`/`partial`. Selena's `approve_refund`/
`process_refund` tools (`handleApproveRefund`, `handleProcessStripeRefund`
in `selena/tools.ts`) — and the human equivalent — only ever touch
`payment_status`/`notes`, never `bookings.payment_method`, so a booking
flagged `refund_pending` or `refunded` still satisfied this cron's
`payment_method IS NULL` guard and kept getting "your balance is still
open, pay here 😊" SMS plus a live Stripe payment link every send slot,
until someone manually noticed — the exact opposite of what a refund
status means, and a real risk of asking an already-refunded client to pay
a second time.

**Fixed** — added `'refunded'`/`'refund_pending'` to the same `NOT IN`
exclusion the two finance routes already use.

3 new tests (no prior test coverage existed for this route at all),
mutation-verified (`git apply -R` the fix, 2/3 RED for the expected reason
— SMS sent to a refunded/refund_pending booking — the genuinely-still-
unpaid control correctly stayed GREEN throughout; `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 396/396 files, 1953/1953 tests,
zero regressions. Commit `cd53ea20`.

## (99) Archetype depth — item (1)'s oldest open finding, the scheduled-campaign dead end, confirmed live and fixed: scheduled_at landing on the row was only half the earlier fix, status never followed it — NOW FIXED

Item (1) flagged that `POST /api/campaigns` could save a `scheduled_at`
but nothing ever dispatched it. Tracing it further today turned up a deeper
compounding bug behind that missing feature: the insert always forced
`status: 'draft'`, even when `scheduled_at` was set. A campaign the admin
"scheduled" was byte-identical, status-wise, to a plain draft — the
dashboard's own "Scheduled" tab/counter (`campaigns/page.tsx` filters on
`c.status === 'scheduled'`) could **never** populate, not even cosmetically,
regardless of how many campaigns had a future `scheduled_at`. The only thing
that ever worked was the list row's "Scheduled {date}" label, which reads
`scheduled_at` directly.

**Fixed** — three pieces:
- `POST /api/campaigns` now sets `status: 'scheduled'` when `scheduled_at`
  is provided (`'draft'` otherwise, unchanged).
- New `GET /api/cron/campaign-dispatch` (added to `vercel.json`, every 15
  min) finds campaigns with `status = 'scheduled'` and `scheduled_at` in the
  past, and sends each one through the same path "Send Now" uses.
- Extracted that path's send logic (approval-required gating, atomic
  `sending` claim, unsubscribe-link signing, sender name/email resolution)
  out of `POST /api/campaigns/[id]/send` into `src/lib/campaign-send.ts` so
  the manual send and the new cron dispatch share one implementation instead
  of drifting into two — this codebase already had that exact drift once
  (the separate, UI-unreferenced bulk `POST /api/campaigns/send` route uses
  a different, older send shape entirely; left alone, out of scope).
- Campaign detail page's "Send Now" button previously only showed for
  `status === 'draft'`; a newly-scheduled campaign would have had no
  visible way to send early by hand. Now also shows for `'scheduled'`.

6 new tests (4 for the cron route: sends a due campaign, leaves a not-yet-due
one alone, never touches draft/already-sent campaigns, rejects a bad cron
secret; 1 for the create-route status fix; the pre-existing send-route
race/unsubscribe suites re-verified unchanged against the extracted lib).
Mutation-verified: reverted the create-route status fix (RED for the
expected reason, other assertions stayed GREEN); reverted the cron's
`status` filter and its due-date filter separately (each caught by its own
test, the others stayed GREEN) — `git apply` restored, GREEN throughout.
`tsc --noEmit` clean, full suite 397/397 files, 1958/1958 tests, zero
regressions. Commit `a6c137d0`.

## (100) Fresh ground, new bug class (declared-but-unfired notify() types, distinct from the cleaners/cleaner_id vocabulary thread closed at item 98) — the global Yinez agent's internal-error catch never actually notified admin despite its own comment claiming it did — NOW FIXED

Cross-referenced every one of `notify.ts`'s 37 declared `NotificationType`
values against real call sites. Two had zero non-legacy, non-clone call
sites: `escalation` (genuinely unused anywhere, including the field meant to
carry it — `YinezResult.escalated` and `YinezContext.escalation_locked` are
both read/written in isolation, no code path ever sets `escalated: true`;
flagged, not fixed today — no clear owner-facing trigger to wire it to
without a product call) and `selena_error`, which IS fired — but only from
`selena-legacy.ts`/`selena-legacy-handlers.ts` and the 3 known-debt
per-tenant clone Selenas (`src/app/site/*/_lib/selena.ts`). The current
global agent (`src/lib/selena/agent.ts`'s `askSelenaCore` — the one every
non-cloned tenant actually runs on, confirmed the platform's most-used AI
assistant in items 95/96) has its own catch block with the comment "Surface
error to admin (notify is best-effort)" sitting directly above a bare
`void err` — the comment described intent that was never implemented. Any
internal error (Anthropic call failure, an uncaught exception outside a
tool's own try/catch, a timeout) silently returned an empty response to the
customer and was never surfaced to admin. Compounding: the admin monitoring
dashboard's own 24h `selena_error` count (`api/admin/monitoring/status`) was
silently blind to every one of these crashes, since it only ever reflected
the 3 clones' errors — a healthy-looking metric that wasn't measuring the
thing that actually matters.

**Fixed** — the catch block now fires a tenant-scoped `selena_error`
notification (same title/message shape the clone Selenas already use),
best-effort via `.catch(() => {})` so a notify failure can't crash the error
handler, and awaited (not fire-and-forget) so it can't get silently dropped
by the serverless runtime tearing down before an un-awaited promise
resolves. `tenantId` is hoisted above the `try` so the common case (error
after tenant resolution already succeeded) can still tenant-scope the
notification; the catch also makes one best-effort re-resolution attempt for
the rarer case where resolution itself was what failed.

2 new tests (mocking `resolveAnthropic` to throw, standing in for any
downstream failure): proves the tenant-scoped notification fires with the
right type/tenantId/conversation reference, and proves the handler still
never throws even when `notify()` itself fails. Mutation-verified: `git
apply -R` the fix, both RED for the expected reason (0 notify calls instead
of 1) — `git apply` restored, GREEN. `tsc --noEmit` clean, full suite
398/398 files, 1960/1960 tests, zero regressions. Commit `8a001ea9`.

## (101) Archetype depth — item (1)'s price-transparency thread, continued: the CONFIRMED-booking email (not just the received one) was price-blind for every non-nycmaid tenant — NOW FIXED

Item (1)'s follow-up left the booking-*received* email's missing price field
an open product call (price isn't necessarily final before a job is
confirmed). Tracing the same price-transparency thread one step further
today found a cleaner, non-ambiguous instance of the same gap on the
CONFIRMED side: `client-email.ts`'s `confirmationEmail()` — the path every
non-nycmaid tenant's `client/recurring/route.ts` confirmation email goes
through — never passed `booking.price` to `bookingConfirmationEmail`, even
though that template (`email-templates.ts`) has always declared and
rendered an optional `price` row (confirmed live: the sibling nycmaid
template already shows pricing detail on its own confirmation email).
`booking.price` (cents) is present on every row this function is called
with. Unlike the received email, a confirmed booking's price is definite —
this isn't a product question, it's a plain wiring gap.

**Fixed** — `confirmationEmail()` now formats `booking.price` as a dollar
string and passes it through when present; nycmaid's own template/routing
is untouched (early-return branch, never reaches the shared path).

3 new tests, mutation-verified (`git apply -R` the fix, 1/3 RED for the
expected reason — missing price row — the no-price and nycmaid-routing
controls correctly stayed GREEN throughout; `git apply` restored, GREEN).
`tsc --noEmit` clean, full suite 399/399 files, 1963/1963 tests, zero
regressions. Commit `464e6dc7`.

## (102) Fresh ground, new bug class (email-side opt-out parity gap, distinct from every prior thread) — Resend's `email.complained` spam-complaint event had zero handling — NOW FIXED

SMS already has a complete opt-out loop: a client or team member replying
STOP persists `sms_consent: false` (confirmed shipped this session,
`webhooks/telnyx`'s `route.stop-start-team.test.ts`), and `/api/unsubscribe`'s
signed link gives email the same guarantee when a client clicks unsubscribe.
Resend also emits an `email.complained` event — verified against Resend's
published webhook event list: fires when "the email was successfully
delivered, but the recipient marked it as spam" — but
`webhooks/resend/route.ts`'s type switch only ever handled
`email.delivered`/`email.opened`/`email.bounced`; `email.complained` fell
through to the generic `else { return ok: true }` and did nothing at all.
A recipient marking one campaign email as spam kept receiving every future
campaign from that tenant — real sender-reputation/deliverability risk on
top of the compliance gap — until a human happened to notice. Same shape as
the SMS STOP-persistence bug already fixed this session, just on the email
side, and never closed there.

**Fixed** — `email.complained` now marks the `campaign_recipients` row
`'complained'` and mirrors `/api/unsubscribe`'s opt-out write: sets
`clients.email_marketing_opt_out` (+`_opted_out_at`) and logs to
`marketing_opt_out_log` with `method: 'spam_complaint'`, so a spam
complaint has the same effect as clicking unsubscribe.

2 new tests, mutation-verified (`git apply -R` the fix, both RED for the
expected reason — opt-out never written / status left `'delivered'` —
`git apply` restored, GREEN). `tsc --noEmit` clean, full suite 400/400
files, 1965/1965 tests, zero regressions. Commit `8454eae0`. (A pre-existing,
unrelated tenant-scope guard warning on `src/app/api/fixture/route.ts`
appeared in this run's output — untouched by this change, not investigated
further as out of lane.)

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (103) Archetype depth — H-01 class repeats a sixth time: `POST /api/uploads`, item (84)'s own fix, was never reachable on the main host to begin with — NOW FIXED

Item (84) taught `POST /api/uploads` to check `getPortalAuth()` (portal
bearer token) before falling back to `getTenantForRequest()`, fixing
`app/team/page.tsx`'s `handlePhotoUpload` — its only real caller anywhere
in the repo, confirmed by re-checking. But that fix only patches what
happens *inside* the route handler; Next.js middleware decides whether the
request ever reaches it. `/api/uploads` was never added to `isPublicRoute`
— unlike its sibling `/api/team-portal(.*)`, which has been public all
along for exactly this reason: team-portal auth is a bearer token, not a
Clerk session or `admin_token` cookie, so the route must self-gate rather
than rely on the middleware's Clerk/admin-cookie check. On a tenant's own
subdomain this doesn't matter (that branch of middleware never runs the
Clerk/admin-cookie gate at all), but on the main host — which includes
`localhost`, the most likely place this flow gets exercised — a team
member's photo upload still 307'd to `/sign-in` before the route's own
portal-auth check ever ran. Same H-01 shape as items (82)/(83)/(89): a
helper already covered elsewhere in the allowlist, one call site slips
through.

**Fixed** — added `/api/uploads` to `isPublicRoute`, matching
`/api/client-analytics`'s existing precedent (public at the middleware
layer, self-gated by the route's own auth check).

1 new test in `middleware-domain-lookup.test.ts` (source-reading guard,
same pattern as the existing bypass-list guards), mutation-verified (`git
apply -R` the fix, RED for the expected reason — `isPublicRoute` no
longer covers `/api/uploads` — `git apply` restored, GREEN). `tsc
--noEmit` clean, full suite 400/400 files, 1966/1966 tests, zero
regressions. Commit `91b80633`.

## (104) Fresh ground, new bug class (Stripe dispute-resolution parity gap, distinct from every prior thread) — `charge.dispute.closed` had zero handling, so a WON dispute never reversed the chargeback loss — NOW FIXED

Same shape as item (102)'s `email.complained` gap, one thread over on the
Stripe side: `charge.dispute.created` already books the chargeback as a
loss (`postChargebackToLedger`, DR 6110 Chargebacks / CR 1050
Undeposited) the moment a dispute opens — but Stripe's own
`charge.dispute.closed` event, fired when the dispute resolves and
carrying `dispute.status` of `'won'` / `'lost'` / `'warning_closed'`, was
never handled anywhere in `webhooks/stripe/route.ts`'s type switch (no
`default:` case either, so it silently fell through to the generic
`{ received: true }` response like every unhandled event does). When the
merchant WINS a dispute, Stripe returns the disputed funds — but nothing
ever reversed the loss entry booked at `dispute.created` time. A tenant
who won every dispute they ever opened would carry a permanently
overstated chargeback-loss total in their own ledger forever, with no
self-correcting mechanism. `'lost'`/`'warning_closed'` correctly need no
ledger action — Stripe kept the funds, the original loss entry already
reflects reality.

**Fixed** — added `postChargebackReversalToLedger()` to
`post-adjustments.ts` (DR 1050 Undeposited / CR 6110 Chargebacks, the
mirror image of `postChargebackToLedger`; `source: 'chargeback_reversal'`
so its idempotency key can't collide with the original chargeback entry
for the same dispute id) and wired `charge.dispute.closed` into the
webhook switch, gated on `status === 'won'`.

5 new tests: 2 in `post-adjustments-race.test.ts` (concurrent double-post
race + no collision with the original chargeback's idempotency key, same
pattern as the sibling deposit/refund/chargeback race tests already
there) and 3 in a new `route.dispute-closed.test.ts` (posts the reversal
on `'won'`; does not on `'lost'`; does not on `'warning_closed'`).
Mutation-verified (`git apply -R` both production files, all 3
new-behavior tests RED for the expected reason —
`postChargebackReversalToLedger` undefined / never called — `git apply`
restored, GREEN). `tsc --noEmit` clean, full suite 401/401 files,
1971/1971 tests, zero regressions. Commit `97bd2d4c`.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (105) Archetype depth — H-01 class repeats a seventh time: `POST /api/push/subscribe`'s team_member/client branches were never reachable on the main host — NOW FIXED

Same shape as item (103)'s `/api/uploads` gap, one hop over: the
admin-impersonation bypass list (the `admin_token`-cookie prefix list,
distinct from `isPublicRoute`) already covers `/api/push`'s role:`'admin'`
branch — confirmed still present from an earlier session's fix, with its
own regression test (`middleware-domain-lookup.test.ts`'s "covers
/api/push" guard). But `app/team/page.tsx` and `app/portal/page.tsx` —
both global, main-host pages (`/team(.*)` and `/portal(.*)` are
`isPublicRoute`-listed) — render the shared `<PushPrompt>` with
role:`'team_member'`/`'client'`. Those roles authenticate via
`getPortalAuth()`/`protectClientAPI()` *inside* `route.ts`
(`resolveAuthedTenantId`), not an `admin_token` cookie — confirmed by
reading the route directly. Since `/api/push/subscribe` was never in
`isPublicRoute` either, a team member or client with no `admin_token`
cookie and no Clerk session hit the "not public, no admin cookie" branch
and 307'd to `/sign-in` before the route's own in-route auth check ever
ran — the exact same shape as items (82)/(83)/(89)/(103) before it, just
one more self-gated route that slipped through the same allowlist.

**Fixed** — added `/api/push/subscribe` to `isPublicRoute`, same
self-gated precedent as `/api/uploads`.

1 new test in `middleware-domain-lookup.test.ts` (source-reading guard,
same pattern as the existing bypass-list/public-route guards),
mutation-verified (`git apply -R` the fix, RED for the expected reason —
`isPublicRoute` no longer covers `/api/push/subscribe` — `git apply`
restored, GREEN). `tsc --noEmit` clean, full suite 401/401 files,
1972/1972 tests, zero regressions. Commit `edfd7fcb`.

## (106) Fresh ground, new bug class (Resend delivery-status parity gap, distinct from item (102)'s email.complained thread) — `email.failed` had zero handling, so an async post-acceptance send failure left `campaign_recipients` stuck at `'sent'` forever — NOW FIXED

Verified against Resend's own published webhook event-types docs (fetched
live, not recalled from training): `email.failed` — "the email failed to
send due to an error" — is a real, distinct event, separate from
`email.bounced` ("the recipient's mail server permanently rejected the
email") and from the *synchronous* send-time error
`campaigns/send/route.ts` already catches and marks `'failed'` itself at
the moment of the API call. `webhooks/resend/route.ts`'s type switch had
no branch for the async event; it fell through to the generic `else {
return ok: true }`, same shape as item (102)'s `email.complained` gap.
The tell: the aggregate recount a few lines below the switch already
treats status `'failed'` as first-class —
`counts.filter(r => r.status === 'failed' || r.status === 'bounced')` —
but no code path ever produced that status for an async failure, so a
recipient Resend initially accepted (status `'sent'`) but later failed to
deliver stayed miscounted as sent-not-failed forever, and a campaign's
`failed_count` silently undercounted every async failure.

**Fixed** — added an `email.failed` branch mirroring the existing
`email.bounced` branch (status update only, no opt-out side effects — an
async send failure isn't a spam/opt-out signal, unlike item (102)'s
complaint).

Same standing caveat as item (55)/item (102): this whole webhook path —
every branch, old and new — depends on
`campaign_recipients.resend_email_id`, which migration 064 (prepared,
not applied) is still waiting on. This fix is correct and ready but
inert in prod until that migration lands, exactly like
`email.complained` already is; not a reason to skip writing the correct
handler now.

3 new tests in `route.failed.test.ts` (status update; no opt-out
side-effect; `failed_count` aggregate recount), mutation-verified (`git
apply -R` the fix, 2/3 RED for the expected reason — status stayed
`'sent'`, `failed_count` stayed 0 — the opt-out-side-effects control
correctly stayed GREEN throughout; `git apply` restored, GREEN). `tsc
--noEmit` clean, full suite 402/402 files, 1975/1975 tests, zero
regressions. Commit `6adbf7cd`.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (107) Archetype depth — H-01 class repeats an eighth time: `POST /api/internal/deploy-hook` was never reachable on the main host — NOW FIXED

Same shape as items (103)/(105)'s `/api/uploads` and `/api/push/subscribe`
gaps, this time on infrastructure rather than a user-facing route: Vercel's
`deployment.succeeded` webhook POSTs straight to the production main host
with no `admin_token` cookie and no Clerk session. The route self-gates via
its own HMAC-SHA1 signature check (`VERCEL_DEPLOY_HOOK_SECRET`) before doing
anything — confirmed by reading the route directly — but `/api/internal` was
never added to `isPublicRoute`. Without that entry, every delivery 307'd to
`/sign-in` before the route's own signature check ever ran, so the
carrying-domain re-alias step (`*.fullloopcrm.com` + every
`<slug>.fullloopcrm.com` alias) silently never fired on any production
deploy — the exact failure mode the route's own doc comment describes
guarding against (`DEPLOYMENT_NOT_FOUND`), just triggered one layer earlier
than the code anticipated.

**Fixed** — added `/api/internal/deploy-hook` to `isPublicRoute`, same
self-gated precedent as `/api/uploads` and `/api/push/subscribe`.

1 new test in `middleware-domain-lookup.test.ts` (source-reading guard, same
pattern as the existing bypass-list/public-route guards), mutation-verified
(`git apply -R` the fix, RED for the expected reason — `isPublicRoute` no
longer covers `/api/internal/deploy-hook` — `git apply` restored, GREEN).
`tsc --noEmit` clean, full suite 402/402 files, 1976/1976 tests, zero
regressions. Commit `eedbea43`.

## (108) Fresh ground, new bug class (owner-notification parity gap, distinct from every prior webhook thread) — no document lifecycle event ever notified the tenant admin, so a signer decline landed with zero owner notice — NOW FIXED

The public document e-signature flow (`consent`/`sign`/`decline` routes plus
the completion path inside `sign/route.ts`) never notified the tenant admin
about any lifecycle event — confirmed by grepping the whole `documents`
route tree and `lib/documents.ts` for `notify(`/`ownerAlert(`/a
`notifications` insert and finding none. This is the same shape as item
(102)'s `email.complained` gap and the `quote_viewed` fix documented in
`route.viewed-notify.test.ts` ("a declared … type … but no call site ever
fired it"): the sibling quotes flow fires **both** `notify()` and
`ownerAlert()` on accept AND on decline (`quotes/public/[token]/decline/
route.ts`), but documents — a functionally identical public accept/decline
flow, same business weight (a signer declining is a lost signed deal,
exactly like a declined quote) — had zero admin-facing signal on any of its
four lifecycle events. An admin relying on this feature for contracts/
proposals had no way to know a customer declined short of manually
re-checking the dashboard.

**Fixed** — `documents/public/[token]/decline/route.ts` now fires
`notify('document_declined')` + `ownerAlert()` on decline, mirroring
`quotes/public/[token]/decline/route.ts`'s pair exactly (signer name,
document title, and decline reason in the alert body). Added
`'document_declined'` to `notify.ts`'s `NotificationType` union. Scoped to
decline only this round — sign/consent/completion admin-notification gaps
are the same shape and worth a follow-up, not folded into this fix.

2 new tests in `route.notify.test.ts` (fires both alerts with the right
payload on decline; fires neither on an unknown token), mutation-verified
(`git apply -R` the route.ts fix, RED for the expected reason — `notify`/
`ownerAlert` never called — `git apply` restored, GREEN). `tsc --noEmit`
clean, full suite 403/403 files, 1978/1978 tests, zero regressions. Commit
`b035d4fd`.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (109) Archetype depth — H-01 class repeats a ninth time: `POST /api/email/monitor` was never reachable from its own cron — NOW FIXED

The cron trigger for IMAP Zelle/Venmo payment monitoring
(`/api/cron/email-monitor`, already public) makes a real server-to-server
HTTP `fetch()` — not a function call — to `/api/email/monitor` with an
`Authorization: Bearer CRON_SECRET` header. That fetch has no `admin_token`
cookie and no Clerk session, so it re-enters the same middleware. The route
self-gates via its own `authorize()` (`CRON_SECRET` bearer OR
`ELCHAPO_MONITOR_KEY` body key), same public-but-self-gated shape as
`/api/uploads`, `/api/push/subscribe`, and `/api/internal/deploy-hook`
before it.

Without `/api/email/monitor` in `isPublicRoute`, every one-minute tick
307'd to `/sign-in` before `authorize()` ever ran. `fetch()` follows the
redirect, gets the sign-in page's HTML back instead of JSON, `res.json()`
throws and is swallowed by the caller's `.catch(() => ({}))` — so the
cron's own health-check marker still got written every minute, masking
that the actual IMAP payment-matching work silently never ran for any
tenant with `email_monitor_enabled`.

**Fixed** — added `/api/email/monitor` to `isPublicRoute`, same self-gated
precedent as the three fixes above.

1 new test in `middleware-domain-lookup.test.ts` (source-reading guard,
same pattern as the existing `isPublicRoute` guards), mutation-verified
(`git apply -R` the fix, RED for the expected reason — `isPublicRoute` no
longer covers `/api/email/monitor` — `git apply` restored, GREEN). `tsc
--noEmit` clean, full suite 403/403 files, 1979/1979 tests, zero
regressions. Commit `d5e9cf1f`.

## (110) Fresh ground — item (108)'s flagged follow-up closed: no admin notification when a document finishes signing (completion) — NOW FIXED

Item (108) fixed the decline case and explicitly scoped out
sign/consent/completion as "the same shape and worth a follow-up." Read
`sign/route.ts`'s `allDone` branch directly: it calls `finalizeDocument()`
(flattens the signed PDF) and `sendCompletionCopies()` (emails each
*signer* a receipt), but nothing ever told the tenant *admin* the document
completed — the last of the four document lifecycle events
(consent/sign/decline/completion) with zero admin-facing signal. Same
business weight as item (108)'s reasoning: a fully-signed contract is a
closed deal an admin should hear about immediately, not discover by
manually checking the dashboard. Confirmed no other call site covers this
(grepped the whole `documents` route tree for `notify(`/`ownerAlert(`
again post-item-108 — only `decline/route.ts` has it).

**Fixed** — added `notifyOwnerDocumentCompleted()` to `sign/route.ts`,
called from the `allDone` branch alongside the existing
`sendCompletionCopies()` call. Mirrors
`quotes/public/[token]/accept/route.ts`'s `notify()`+`ownerAlert()` pair on
its own positive-outcome event, same precedent item (108) used for
decline. Added `'document_completed'` to `notify.ts`'s `NotificationType`
union.

3 new tests in `route.notify-completed.test.ts`: fires both alerts with
the signer roster + title, still fires with a generic message when no
signer has a name, and a source-reading guard confirming the `allDone`
branch actually calls the new helper (the full POST handler mixes in
pdf-lib/storage/email — impractical to drive end-to-end per its own
top-of-file "heaviest route in this family" comment — so the helper is
exported and tested directly, with the guard test catching regressions in
the wiring itself, same technique as `middleware-domain-lookup.test.ts`'s
`isPublicRoute` guards). Mutation-verified (`git apply -R` the fix, all 3
RED for the expected reason — function undefined / wiring guard failed —
`git apply` restored, GREEN). `tsc --noEmit` clean, full suite 404/404
files, 1982/1982 tests, zero regressions. Commit `cb100f3d`.

Archetype-depth lane this round: extensive H-01-class search (every
`cron/route.ts` internal fetch call, every top-level `/api/*` directory not
covered by `isPublicRoute` or the admin-impersonation bypass list) turned
up zero live findings this round. Two candidates looked promising and were
run to ground, then correctly ruled out (same discipline as commit
`c096a4bb`'s false-positive catch): `app/apply/[slug]/page.tsx` (and its
`/api/tenants/public` fetch) is confirmed unreachable in production — killed
with a 410 on the main host by `KILLED_ROUTES`, and superseded by
`/site/<tenant>/apply` on every tenant domain (subdomain/custom-domain
requests never even reach the `isPublicRoute` gate — they're
rewritten to `/site/...` earlier in the middleware); and
`/api/announcements/unread` has zero real callers — grepped every `.tsx`
in the app and the only client-side announcement fetch
(`dashboard/announcement-banner.tsx`) actually hits `/api/changelog`
(already covered), not this route. Neither is a live bug worth carrying
forward.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (111) Archetype depth — the declared-type-sweep method (items (63)/(66)/(67)/(68)/(89)/(91)) repeats on a subsystem those sweeps never reached: Selena/Yinez's own ops-monitoring surface for "needs a human" events was structurally blind — NOW FIXED

Applying the same method item (91) used ("grep every declared notification
type for a real call site") to the AI-agent ops-monitoring layer instead of
finance/quotes/bookings turned up a two-part gap in the exact surface built
to catch it. `GET /api/admin/selena/monitor` — its own doc comment: "so ops
monitoring tools can scrape stats without holding an admin session" — reports
`stats.escalated` (a raw `sms_conversations.outcome === 'escalated'` count)
and an `errors` feed (`notifications.type IN ('selena_error', 'escalation',
'review_received')`). Both were permanently empty:

- `outcome` is only ever written as `'booked'` or `'waitlisted'` anywhere in
  the codebase (`core.ts`/`selena-legacy.ts`) — never `'escalated'`.
  `getTenantMetrics()`'s own `escalations` count
  (`src/lib/selena/metrics.ts`) has a text-heuristic fallback,
  `c.summary?.includes('escalat')`, but `summary` is itself only ever
  written on the booked/waitlisted branches — the fallback can never match
  either. Both readers of this column were silently stuck at zero no matter
  how many clients asked for a human.
- The `request_callback` tool ("Client wants to talk to a human. Notifies
  admin with context.") — the textbook escalation event — fires
  `notify({ type: 'callback_requested' })`, and `report_issue` fires
  `type: 'client_issue'`. Neither type was in the monitor route's `errors`
  filter, while `'escalation'` (which IS in the filter) has zero call sites
  anywhere and can never appear. The one endpoint built to let external
  tooling watch for "Selena/Yinez needed a human" was blind to both of the
  real events that mean exactly that, while faithfully filtering for an
  event that never fires.

Ruled out, not folded in: `low_rating` (also declared in
`nycmaid/notify.ts`'s `TELEGRAM_NOTIFY_TYPES` with zero call sites) looked
like a third instance, but both real low-rating paths
(`webhooks/telnyx/route.ts`'s SMS rating capture, `reviews/submit/route.ts`)
already fire `'review_received'` through the *global* `notify()`
(`@/lib/notify`, channel-routed, not Telegram-type-routed) — the nycmaid
Telegram-type set doesn't apply to that call path at all, so this one is
dead-but-harmless, not a live gap. Also noticed, not fixed: `'recurring_set'`
outcome (referenced by `conversation-scorer.ts`'s scoring heuristic at line
77) and `'abandoned'` outcome (silently covered by the `expired` boolean
fallback, unlike `'escalated'`) are the same shape and worth a follow-up.

**Fixed** — `handleRequestCallback` (`src/lib/selena/core.ts`) now sets
`outcome: 'escalated'` in the same update that already sets
`escalation_locked_until`, so the metrics/monitor stats that already read
this column reflect reality. `/api/admin/selena/monitor`'s `errors` filter
now also includes `callback_requested` and `client_issue`.

3 new tests: `core.request-callback-escalation.test.ts` (outcome set to
`'escalated'` alongside the lock; the existing `callback_requested` notify
still fires unchanged) and `route.errors-feed.test.ts` (the errors feed now
surfaces `callback_requested`/`client_issue` rows alongside `selena_error`).
Mutation-verified (`git apply -R` each fix in turn, both new suites RED for
the expected reason — outcome stayed `null`; the feed returned only
`selena_error` — `git apply` restored, GREEN). `tsc --noEmit` clean, full
suite 406/406 files, 1985/1985 tests, zero regressions (same pre-existing,
unrelated `tenant-scope` guard warning on `src/app/api/fixture/route.ts`,
not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (112) Follow-up to (111) run to ground — the conversation quality scorer's `recurring_set`/`abandoned` checks were the same declared-value-never-written shape, one level deeper — NOW FIXED

Item (111) flagged two candidates while fixing the escalation gap and
explicitly deferred them as "the same shape and worth a follow-up":
`'recurring_set'` (referenced by `conversation-scorer.ts` line 77's scoring
heuristic) and `'abandoned'` (already confirmed dead-but-harmless in
`metrics.ts`, covered by the `expired` fallback). Ran both to ground.

`sms_conversations.outcome` is only ever written as `'booked'`,
`'waitlisted'`, or (as of item 111) `'escalated'` — confirmed again by
grepping every `outcome:` write site across `core.ts`, `selena-legacy.ts`,
and every per-tenant `_lib/selena.ts` clone. `'recurring_set'` and
`'abandoned'` are never written anywhere. Two different bugs fall out of
that in `src/lib/conversation-scorer.ts`'s `scoreConversation()`:

- `convo.outcome !== 'recurring_set'` (line 77) was **always true** — not a
  quiet no-op like the `abandoned` case, an active always-fires bug. Every
  conversation where Selena's own messages mentioned recurring/weekly/
  monthly language took a -10 "Mentioned recurring/frequency on a one-time
  booking" deduction, *even when the conversation ended in an actual
  recurring booking*. The real recurring signal was never on
  `sms_conversations` at all — it lives on the linked booking's
  `bookings.recurring_type` column (set by `create_booking`, read
  elsewhere in `core.ts` as `recurring_type !== 'one_time'`, e.g. line
  1497's `lookup_bookings` response).
- `convo.outcome === 'abandoned'` (line 134, a *second*, independent
  instance of the same gap `metrics.ts` has) was **always false** with no
  compensating fallback in this file — genuinely abandoned conversations
  never took the -5 "Conversation abandoned" deduction.

Checked reachability honestly before fixing: this scorer
(`scoreConversation` in `conversation-scorer.ts`, tenant-aware) is wired to
`POST /api/admin/selena/score`, a real permission-gated (`settings.view`)
admin API route — grepped the whole dashboard tree and found zero UI
callers and no cron invokes it, unlike the always-live SMS webhook path.
Ruled it in anyway, not out: unlike (110)'s round's two dead candidates
(a 410'd page and a route with zero possible callers), this is ordinary
working admin-API surface, not proven-unreachable — an admin can invoke it
today, and the bug is a live logic defect in deployed code, not inert
scaffolding.

**Fixed** — recurring detection now looks up the conversation's linked
`booking_id` and checks `bookings.recurring_type !== 'one_time'` instead of
the phantom outcome value. Abandoned detection now checks `convo.expired`,
the exact fallback item 111 already confirmed `metrics.ts` relies on for
this identical gap.

5 new tests in `conversation-scorer.recurring-abandoned.test.ts`: recurring
language not penalized when the linked booking is actually recurring,
still penalized on a genuinely one-time booking, still penalized with no
linked booking at all, expired conversation penalized as abandoned,
non-expired conversation not penalized. Mutation-verified (`git apply -R`
the fix, 2/5 RED for the expected reason — recurring language penalized
despite a recurring booking; expired conversation not flagged as abandoned
— `git apply` restored, GREEN). `tsc --noEmit` clean, full suite 407/407
files, 1990/1990 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not touched
here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (113) Grounding item (112)'s 7 TELEGRAM_NOTIFY_TYPES candidates (running_late/cleaner_paid/tip_paid) — architectural, not a per-type fix; one real fresh bug found along the way

Item (112) found 7 declared-but-zero-call-site entries in
`nycmaid/notify.ts`'s `TELEGRAM_NOTIFY_TYPES` and deliberately didn't fold
any in, flagging `running_late`/`cleaner_paid`/`tip_paid` as the
highest-weight candidates to ground first (money + ops signal). Ran all
three to ground.

**The real shape: this isn't 3 isolated dead entries, it's an architecture
split.** The codebase has two independent, non-interoperating notification
systems: `lib/nycmaid/notify.ts` (Telegram-capable, `TELEGRAM_NOTIFY_TYPES`
lives here) has exactly 6 callers — Selena/Yinez AI-chat code, login,
client-confirm, and an error logger. `lib/notify.ts` (the global system,
email/SMS/push with per-tenant comms-preference gating) has 48 callers and
is where every real operational route actually lives — bookings, payments,
webhooks, crons, team-portal. **It has zero Telegram integration of any
kind.** `running_late` (`POST /api/team-portal/running-late`),
`cleaner_paid` and `tip_paid` (both folded into the Stripe-Connect
auto-payout branches of `payment-processor.ts` and
`webhooks/stripe/route.ts`, alongside the already-live `payment_received`
type — which I also confirmed has zero real call sites through
`nycmaid/notify()`, despite being one of the *original*, not new,
`TELEGRAM_NOTIFY_TYPES` entries) all fire real, correctly-implemented
admin/client/team notifications today — just entirely through the global
system, which never touches Telegram.

Given `TELEGRAM_NOTIFY_TYPES`'s own header comment ("Operational event
types that Jeff wants pushed to Telegram"), the honest reading is: whoever
declared this list assumed every `notify()` call in the codebase funnels
through it, not realizing the modern global system is a separate,
Telegram-blind path carrying the actual majority of live traffic. That's a
real, plausible gap — a tenant with their own Telegram bot configured for
ops alerts gets nothing on Telegram for a late team member, a cleaner
payout, or a tip, despite the type existing specifically to signal "this
should reach Telegram."

**Not fixing it as 3 one-line additions.** There's no existing precedent
anywhere in the codebase for a modern route dual-firing both notify systems
(checked — zero files import both). Wiring Telegram into 3 call sites
piecemeal would mean either (a) bolting a second, inconsistent notification
call onto routes that already correctly use the global system end to end,
or (b) the actually-correct fix — adding Telegram support to `lib/notify.ts`
itself so all 48 callers benefit uniformly — which is a real feature
addition to the platform's primary notification system, not a narrow bug
fix, and deserves a product/architecture call rather than a unilateral
file-only patch. `cleaner_paid`/`tip_paid` specifically aren't even clean,
separable events in the current implementation — both are metadata baked
into one consolidated `payment_received` admin message (tip amount, payout
confirmation, all in one string), not independent notify() calls that could
individually be redirected. Flagging this whole thread for Jeff's call:
either scope a Telegram bridge into the global system, or retire the 4 dead
entries (`running_late`/`cleaner_paid`/`tip_paid`/`payment_received`) from
`TELEGRAM_NOTIFY_TYPES` as aspirational-never-built.

**One concrete bug did fall out of tracing `running_late`'s real call
site, fixed as item (113):** `POST /api/team-portal/running-late`'s admin
`notify()` call omitted `channel`, so it fell to the global `notify()`'s
default of `'email'`. With `type: 'booking_reminder' as any` (the closest
valid `NotificationType`, borrowed since no dedicated ops type exists),
`notify()` rendered the CLIENT-facing `bookingReminderEmail` template — "Hi
Client, this is a reminder that your appointment is soon", Service:
"Running Late", Date & Time: the ops message text itself (e.g. "🚨
EMERGENCY — A Worker running late for A Client (10:00 AM) — ETA 10 min")
— and emailed that to the tenant owner on **every single late report**,
confusing internal ops signal dressed as a garbled client appointment
reminder. Confirmed this fires in practice for essentially every tenant:
`hasEmail` only requires a platform-level `RESEND_API_KEY` fallback (no
per-tenant key needed), and every onboarded owner has an email on
`tenant_members`.

Fixed with the minimal, non-architectural change: explicit `channel: 'sms'`
on that one call. `recipientType` stays the default `'admin'`, which
`notify()` never resolves a phone number for — so the send becomes an inert
no-op (status `'skipped'`, not `'failed'`) and the only observable effect
is the in-app `notifications` row, exactly matching what the route's own
comment already intended (it sends its own purpose-built admin SMS/push
directly below, unaffected). No comms-registry/gating semantics touched,
no duplicate sends introduced.

1 new test (`route.notify-channel.test.ts`), mutation-verified (`git apply
-R` the fix, RED for the expected reason — call args missing
`channel: 'sms'` — `git apply` restored, GREEN). `tsc --noEmit` clean, full
suite 408/408 files, 1991/1991 tests, zero regressions (same pre-existing,
unrelated `tenant-scope` guard warning on `src/app/api/fixture/route.ts`,
not touched here).

Noticed, not fixed: `src/app/api/team-portal/availability/route.ts`'s
time-off-request admin notify borrows `type: 'check_in'` the same way (no
dedicated type, no explicit channel) — lower severity since `check_in` has
no explicit template case and falls to the generic plain-paragraph email
fallback rather than a mismatched one, but the same "silently defaults to
email with a borrowed type" shape. Worth a follow-up grounding pass.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (114) Grounding item (113)'s noticed `team-portal/availability` borrowed `check_in` — real, lower-severity, same shape — NOW FIXED

Item (113) flagged this and deliberately deferred it: the time-off-request
admin `notify()` call in `POST /api/team-portal/availability` borrows
`type: 'check_in'`, no dedicated type, no explicit `channel`. Ran it to
ground.

Confirmed the severity read was right — `check_in` has no template case in
`notify.ts`'s switch, so the email body itself isn't mismatched the way
(113)'s `booking_reminder` collision was (falls to the generic
plain-paragraph fallback, which renders the real title/message). But the
borrowed type still collides on the UI side: 3 tenant dashboards
(`wash-and-fold-nyc`/`wash-and-fold-hoboken`/`nyc-mobile-salon`
`AdminSidebar.tsx`/`DashboardHeader.tsx`) map `check_in` → `▶️ "Job
Started"` (blue icon) and route notification clicks to `/admin/bookings`;
the global `/dashboard/notifications` page buckets it under the `check_in`
type filter and teal badge alongside real GPS check-ins. Every time-off
request therefore landed in the admin feed mislabeled as a job-start event
with a dead-end link (no `booking_id` on this notify call, so the
`/admin/bookings` link carries no `?id=`) — same shape as the
already-fixed `video_uploaded` borrow (item 65, found and fixed in an
earlier session, confirmed via `route.notify-type.test.ts` already in the
tree for `team-portal/video-upload`). Checked `comms-registry.ts`'s
`NOTIFY_COMM_MAP` too: `check_in` isn't a gating key there, so no
preference-gating bug — the only real defect is the UI icon/link
collision.

**Fixed** — added a dedicated `time_off_request` `NotificationType` (no
template case, same as `check_in`, so behavior is otherwise identical) and
pointed the route at it instead of borrowing `check_in`. Deliberately did
NOT touch the three per-tenant dashboard clones' `notificationConfig`
maps — per this repo's `CLAUDE.md`, those are known debt not to be
extended, and leaving `time_off_request` unmapped is strictly better than
today: it falls through to each dashboard's neutral default (🔔, not
clickable) instead of the misleading job-started treatment.

**Fresh-ground hunting turned up a second, sharper instance of the exact
same shape while sweeping every `notify()` call site for the
missing-`channel` pattern:** `cron/payment-followup-daily/route.ts`'s
cap-reached admin alert (fires when a tenant crosses 100 unpaid completed
bookings chased in one run) borrowed `type: 'follow_up'` — and unlike
`check_in`, `follow_up` **does** have a template case:
`followUpEmail()`, the CLIENT-facing post-service win-back template. Every
time this fired, the tenant owner's inbox got subject "Payment follow-up
cap reached (100)" with a body reading "Thank You! Hi Client, thank you
for choosing ${tenant}! We hope you enjoyed your ." (empty service name,
generic "Client" greeting — the call passes no `metadata`) "... Your
Discount Code THANKYOU — 10% off your next appointment," a nonsensical,
mistemplated email carrying zero of the actual cap-reached ops content.
Same fix pattern: added `type: 'payment_followup_cap'` (new, no template
case) and repointed the call. Precondition is rarer than (113)'s
near-universal one (needs >100 unpaid completed bookings for a single
tenant inside the 14-day recency floor in one cron run — today that's
nycmaid-only per the file's own scope comment), but it's a live, reachable
cron path, not dead code.

2 new tests (`availability/route.notify-type.test.ts`,
`payment-followup-daily/route.notify-type.test.ts`), both mutation-verified
(`git apply -R` each fix, RED for the expected reason — call args carrying
the old borrowed type — `git apply` restored, GREEN). `tsc --noEmit`
clean, full suite 410/410 files, 1993/1993 tests, zero regressions (same
pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (115) Archetype depth — item (70)'s own flagged-but-deferred follow-up run to ground: `sms-templates.ts`'s generic client/team SMS had zero timezone awareness at all, worse than item (70)'s original bug — NOW FIXED

Item (70) fixed every "is this booking today" emergency-flag comparison to
use the tenant's real configured timezone instead of the server runtime
default, and explicitly flagged one thing it deliberately left unchased:
`src/lib/timezone.ts`'s `formatInTz(iso, timezone)` helper — built
specifically to render a booking timestamp in a tenant's own zone — had
zero callers anywhere in the codebase, and item (70) called out "a separate
pass to find where booking-time displays are still using raw/UTC-implicit
formatting" as worth doing. Ran that pass.

`src/lib/sms-templates.ts` — the neutral (non-cleaning) SMS template set
`client-sms.ts`/`team-sms-resolver.ts` dispatch to for all ~23 non-cleaning
tenants spanning all 4 continental US zones (per item (70)'s own count) —
formats every date/time with `toLocaleDateString`/`toLocaleTimeString` and
**no `timeZone` option at all**, in all 13 functions that touch a booking's
`start_time` (client booking-received/confirmation/reminder/cancellation/
reschedule, team job-assignment/cancelled/rescheduled/urgent-broadcast/
late-check-in, the new-booking admin text, and the Spanish twins of the
client-facing ones). That's a step worse than item (70)'s bug: `team-sms.ts`
and `sms-cleaning.ts` (the cleaning-brand templates, nycmaid/the-florida-maid
only) at least hardcode `America/New_York` consistently — not the tenant's
real zone, but a real US zone and correct today since both cleaning tenants
are Eastern. The generic templates used the server runtime's default zone
(UTC on Vercel) with no fallback at all. Confirmed live, high-traffic impact
via a full-repo trace of every `clientSmsTemplates`/`teamSmsTemplates` call
site (13 route files: `bookings` create/update/batch/team,
`client/book`, `client/reschedule/[id]`, `client/recurring`,
`portal/bookings`, `team-portal/jobs/reassign`, and the
`daily-summary`/`late-check-in`/`confirmation-reminder`/`reminders`/
`rating-prompt` crons) — every one of these dispatches through the generic
branch for any non-cleaning tenant, meaning every booking-confirmation,
reminder, reschedule, cancellation, and team job-assignment text sent to a
Pacific/Mountain/Central non-cleaning tenant's clients and team members
displayed a clock time hours off from the tenant's own local time (up to 8
hours for Pacific, hours enough to also flip the displayed calendar date
near either zone's midnight).

**Fixed** — added two local formatters (`fmtDate`/`fmtTime`) inside
`sms-templates.ts` that take an optional `timezone` param, falling back to
`America/New_York` when omitted (the same documented-default convention
`formatInTz`/`zipToTimezone` already use elsewhere, so no existing caller's
behavior gets worse — only better, from UTC to at least ET). All 13
date/time-touching functions now accept and thread through this param.
`client-sms.ts`/`team-sms-resolver.ts`'s `TenantLike` type and
`BRAND_COLUMNS` select both gained `timezone`, and their neutral-branch
dispatch now passes `tenant.timezone` to every generic call — fixing the 5
crons/routes that call the async `*For(tenantId)` resolvers for free (their
own select lives inside the resolver). The 7 remaining route files build a
plain tenant object themselves and call the sync `clientSmsTemplates(tenant)`/
`teamSmsTemplates(tenant)` directly; added `timezone` to each of their
`tenants` select lists (`bookings/route.ts`, `bookings/[id]/route.ts`,
`bookings/batch/route.ts`, `bookings/[id]/team/route.ts`,
`team-portal/jobs/reassign/route.ts`, `cron/daily-summary/route.ts`,
`cron/late-check-in/route.ts`) — `client/book`/`client/reschedule/[id]`/
`portal/bookings` already select `*` via `getTenantFromHeaders()`, so those
three needed no route change at all.

Deliberately left `team-sms.ts`/`sms-cleaning.ts`'s hardcoded ET alone,
same judgment call item (70) made for `selena/core.ts`'s single-tenant
convention: both cleaning-industry tenants today are genuinely Eastern, so
there's no live bug to fix there, just the same latent fragility already
on record.

Also noticed, not fixed: several of these same routes compute a raw,
UTC-implicit `date`/`time` locally (no `timeZone` option) for their
`notify()` call's title/message — a related but distinct bug on the in-app
notification/admin-email side rather than the client/team SMS side this
item scoped to (e.g. `bookings/route.ts:291-292`). Same shape, separate
fix, worth its own pass.

2 new test files (`sms-templates.timezone.test.ts` — 6 cases proving the
new param actually changes rendered output and that omitting it still
falls back to ET, not UTC; `messaging/sms-resolvers.timezone.test.ts` — 4
cases proving both resolvers read and pass through `tenant.timezone`),
mutation-verified (stashed all three production-file changes, RED for the
expected reason — 6 of 10 cases failed, all comparing the Pacific-zone
expectation against whatever zone the runtime defaults to — restored,
GREEN). `tsc --noEmit` clean, full suite 412/412 files, 2003/2003 tests,
zero regressions (same pre-existing, unrelated `tenant-scope` guard warning
on `src/app/api/fixture/route.ts`, not touched here).

## (116) Fresh ground, new bug class (comms-registry preference-gating parity gap, distinct from every prior thread) — `cron/payment-followup-daily`'s client SMS ignored the tenant's own "Payment reminder" toggle entirely — NOW FIXED

`comms-registry.ts`'s `payment_reminder` entry (the tenant-facing
Communications-settings toggle for "Reminds a client with an outstanding
balance") lists its own `firedBy` as `'cron: payment-reminder /
payment-followup-daily'` — both crons are supposed to respect it. Read
both: `cron/payment-reminder/route.ts` correctly calls `getCommPrefs(tenantId)`
and gates its client nudge on `payPrefs.comms.payment_reminder?.sms !== false`
before every send. `cron/payment-followup-daily/route.ts` — the cron item
(113)/(114) already touched twice this session for its cap-reached admin
alert — never called `getCommPrefs` at all; its client-facing "your balance
is still open" SMS gated only on `sms_consent !== false`, with zero comms-
registry check. `sendSMS()` itself (`lib/sms.ts`) is a raw Telnyx transport
call with no preference awareness of its own — gating is entirely the
caller's responsibility, and this caller never added it. A tenant
disabling "Payment reminder" SMS in their own Communications settings,
believing it silences both payment-nudge sources their own settings page
describes as the same toggle, would keep getting texted by this cron with
zero effect from the toggle they just flipped. Scope today is nycmaid-only
(this cron only chases tenants with both a Telnyx key and a `payment_link`
set, per the file's own comment), but it's a live, reachable, currently-
firing cron path — not dead code — and the exact same shape as several
already-fixed "declared feature that silently doesn't do what its label
promises" items in this doc.

**Fixed** — added the identical `getCommPrefs(tenant.id)` /
`payPrefs.comms.payment_reminder?.sms !== false` gate the sibling cron
already uses, called once per tenant (matching that cron's placement and
cost profile — one extra read per active tenant per run, not per booking),
and folded the check into the existing per-booking eligibility guard
alongside `sms_consent`.

2 new tests (`route.comm-gate.test.ts`): default/no-stored-preference still
sends (fail-open, behavior-preserving for every tenant who never touched
this setting); an explicit `sms: false` preference now correctly skips the
send. Mutation-verified (`git apply -R` the fix, the off-toggle case RED
for the expected reason — `sendSMS` still called once despite the stored
preference — `git apply` restored, GREEN). `tsc --noEmit` clean, full
suite 413/413 files, 2005/2005 tests, zero regressions (same pre-existing,
unrelated `tenant-scope` guard warning on `src/app/api/fixture/route.ts`,
not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (117) Archetype depth — item (115)'s own flagged-but-deferred follow-up: raw UTC-implicit `notify()`/SMS text built directly in 15 route/cron files, bypassing the sms-templates module entirely — NOW FIXED

Item (115) fixed all 13 date/time-touching functions in `sms-templates.ts` to
render in the tenant's own timezone instead of raw server-default UTC, and
explicitly flagged one thing it deliberately left unchased: "several of
these same routes compute a raw, UTC-implicit `date`/`time` locally for
their `notify()` call's title/message — a related but distinct bug on the
in-app notification/admin-email side rather than the client/team SMS side
this item scoped to... worth its own pass." Ran that pass.

A repo-wide sweep of every `toLocaleDateString`/`toLocaleTimeString` call
with no `timeZone` option found 28 files. Filtered out the cosmetic/
internal-admin-only ones (chart month-bucketing in `admin/finance` and
`finance/revenue`, relative "in Xd" widgets in `clients/enriched` and
`clients/[id]/activity`, invoice/quote due-dates which are date-only with
no time component, `webhooks/telnyx`'s internal audit-note timestamps which
stamp "now", not a booking's `start_time`) and fixed the 15 files building
real client/team/admin-facing text straight from a booking's `start_time`,
bypassing the templates item (115) already fixed:

`bookings/route.ts` (POST create — confirmation email + team job-assignment
message), `bookings/[id]/route.ts` (PUT update notify + DELETE cancellation
notify), `bookings/[id]/status/route.ts` (cancel/complete notify — this
route never fetched the tenant row at all until now), `bookings/[id]/team/
route.ts` (team reassignment), `bookings/batch/route.ts` (batch-create
confirmation — this one had gone one step further than "missing," with
`timeZone: 'America/New_York'` **hardcoded**, item (70)'s exact original bug
class, not just item (115)'s "missing entirely" one), `bookings/broadcast/
route.ts` (cleaner job-opportunity broadcast SMS), `portal/bookings/[id]/
route.ts` (client self-reschedule/cancel notify — also never fetched the
tenant row before now), `team-portal/running-late/route.ts`, `team-portal/
jobs/reassign/route.ts`, `team-portal/video-upload/route.ts` (both upload
flows' admin notify), `routes/[id]/publish/route.ts` (route-date is a bare
DATE column — fixed with the noon-anchor convention `cron/schedule-monitor`
and `portal/collect` already use for date-only columns, not a timezone
thread), `cron/confirmations/route.ts` (team confirm-request + client
day-before confirm SMS), `cron/late-check-in/route.ts`, `cron/daily-summary/
route.ts` (admin 3-day lookahead email + recurring-expiration alert), and
`cron/reminders/route.ts` — by far the largest, with 9 separate call sites
across the day-based reminder email, the 2-hour client/team SMS reminders,
the NYC Maid route-with-travel-times team text, the pending-bookings alert,
and the admin daily-ops-recap/nightly-digest emails.

**Fixed** — added `timezone` to every tenant `.select()` that was missing
it (several already selected it for other reasons, per item (70)'s earlier
pass, but left it unused at these particular call sites — those were a
one-line `timeZone: tz` addition), added a net-new tenant-timezone fetch to
the three routes that had no tenant query at all (`bookings/[id]/status`,
`portal/bookings/[id]`, `team-portal/video-upload`), corrected the one
hardcoded-ET instance in `bookings/batch/route.ts` to read the real tenant
value, and fixed the date-only `route_date` column with a noon anchor
instead of a timezone (a bare DATE has no zone to render in — the bug there
is midnight-boundary drift, not wrong-zone display). All fall back to
`America/New_York` when a tenant has no `timezone` set, same default
`formatInTz`/`sms-templates.ts` already use — no existing caller's behavior
gets worse, only better, from UTC (or hardcoded ET) to the tenant's real
zone.

Noticed, not fixed — a different, riskier layer of the same archetype worth
its own pass and product sign-off before touching: several of these same
crons gate entire code sections on `now.getHours() === N` (`cron/
confirmations`' day-before client confirmation at hour 13, `cron/reminders`'
day-based/thank-you/pending/recap/digest sections at hours 8/14/20/21) or
compute a "today"/"tomorrow" query window via `new Date(now); setHours(0,0,0,0)`
(`cron/late-check-in`, `cron/daily-summary`, `cron/reminders`) — both read
the SERVER's local hour/midnight, not the tenant's. Unlike this item's
display-only bugs, these are scheduling-gate bugs: a Pacific tenant's
"day-before confirmation at 1pm" or "8am day-based reminder" never actually
fires at their own local 1pm/8am, and a "today"/"tomorrow" window can
mis-bucket bookings within several hours of a tenant's own local midnight.
Changing *when* a cron's logic executes (vs. how it renders) is a real
behavior change or shape questions I don't want to make. Also noticed:
`bookings/batch-update/route.ts:108` reconstructs a Date from `start_time`'s
raw Y/M/D/H/M string components rather than parsing it as an instant —
a different mechanism that may already sidestep this exact bug depending on
how `start_time` is actually stored; needs its own investigation before
touching, left alone here.

3 new test files, mutation-verified (`git apply -R` each production fix,
RED for the expected reason each time — the Pacific-zone assertion failed
against whatever zone the fix no longer applied — `git apply` restored,
GREEN): `bookings/route.timezone.test.ts` (client confirmation email +
team job-assignment message), `bookings/[id]/status/route.timezone.test.ts`
(cancel + complete notify — this file's tenant-fetch is entirely new code),
`cron/reminders/route.timezone.test.ts` (2-hour client + team SMS, the
cron's largest and most complex fix). `tsc --noEmit` clean, full suite
416/416 files, 2010/2010 tests, zero regressions (same pre-existing,
unrelated `tenant-scope` guard warning on `src/app/api/fixture/route.ts`,
not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (118) Fresh ground, new bug class (destructive-operation data-integrity gap, distinct from every timezone/notify-type thread this session) — `DELETE /api/cleaners/[id]` erased historical payroll/tax attribution AND silently orphaned live client bookings — NOW FIXED

`DELETE /api/cleaners/[id]` (this codebase's actual functional team-member
deletion endpoint — its own header comment already flags `/api/team/[id]`'s
parallel DELETE as the lesser one; `team.edit`'s PUT there even routes
through this file for the pin field) nulled `bookings.team_member_id` on
**every** booking that ever referenced the deleted team member, with no
status filter and no notification. Two distinct bugs in that one line:

1. **Historical data loss.** `finance/tax-export`, `finance/cleaner-income`,
   and `finance/payroll-prep` all key their reports off `team_member_id`
   (tax-export literally groups 1099 rows by it, falling back to an
   `'unknown'` bucket when null). Deleting a team member — overwhelmingly
   because they left the company, i.e. exactly the moment their final
   payroll/1099 export matters most — silently wiped their `team_member_id`
   off every completed/paid booking they ever did, erasing that
   attribution from every past finance report the moment it's needed.
2. **Silent live-booking orphaning.** The same unconditional null also hit
   `scheduled`/`confirmed`/`in_progress` bookings — a client with a job on
   the books for tomorrow, expecting a specific tech, would silently lose
   that assignment with zero notice to admin or client, discoverable only
   when no one shows up. Same "declared state change, nobody told" shape as
   nearly every prior item in this doc, just triggered by a delete instead
   of a status transition.

**Fixed** — narrowed the `team_member_id`-nulling update to only
`pending`/`scheduled`/`confirmed`/`in_progress` bookings (no completed-work
history to preserve there); `completed`/`paid`/`cancelled`/`no_show`
bookings now keep their `team_member_id` intact. `suggested_team_member_id`
(an AI-suggestion field, not an actual assignment) and
`recurring_schedules.team_member_id` (forward-looking template data, not a
historical record) still clear unconditionally — neither has payroll
significance. Added a `notify()` admin alert naming how many upcoming
bookings lost their assignment and need a human to reassign them, firing
only when that count is nonzero.

Noticed, not fixed: `/api/team/[id]`'s own DELETE does a raw
`.delete()` with none of this route's pre-nulling logic at all — either
it's genuinely unreachable from any current UI (no frontend caller found
for either DELETE endpoint in this pass) or it would hard-fail on the FK
today. Couldn't confirm which without a live DB schema check (the base
`bookings` table predates this repo's tracked `migrations/` and isn't
defined there), and this worker's reconcile-gate token is absent this
session — left alone rather than guess at unverified DB behavior.

3 new tests (`route.delete-history.test.ts`), mutation-verified (`git apply
-R` the fix, both status-filter and notify-count assertions RED for the
expected reason — no status filter existed at all, notify() never called —
`git apply` restored, GREEN). `tsc --noEmit` clean, full suite 417/417
files, 2013/2013 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not touched
here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (119) Archetype depth — item (117)'s own flagged-but-deferred follow-up: two more UTC-implicit date/time renders, both in same-day-dispatch-relevant admin alerts — NOW FIXED

Item (117) fixed 15 route/cron files rendering `notify()`/SMS date-time
text with no `timeZone` option, and explicitly flagged one file it
deliberately left unchased: `bookings/batch-update/route.ts:108`
reconstructs a Date from `start_time`'s raw Y/M/D/H/M string components
rather than parsing it as an instant — "a different mechanism that may
already sidestep this exact bug depending on how `start_time` is actually
stored; needs its own investigation before touching, left alone here." Ran
that investigation, plus a fresh repo-wide sweep for any bare
`toLocaleDateString`/`toLocaleTimeString`/`toLocaleString` call added
*after* item (117)'s sweep closed (so not caught by it).

Investigation confirmed the deferred file is a live bug, not a sidestep:
`start_time` is stored as a UTC ISO string (`...Z` suffix), so splitting it
into `[y,m,d]`/`[h,min]` and feeding those raw numbers into
`new Date(y, m-1, d, h, min)` constructs a Date whose components are the
*UTC* clock reading, not the tenant's local one — then rendering with no
`timeZone` option (defaulting to the server's runtime zone, UTC on Vercel)
faithfully reproduces that same UTC calendar date. Net effect: the "Series
Updated" admin in-app notification (BookingsAdmin's own "apply to all
future bookings" series-edit path) silently displays the UTC calendar date
instead of the tenant's — the exact same bug class as items
(70)/(115)/(117), just via a different broken mechanism than a plain
missing-option call.

The fresh sweep found one more, added after item (117)'s pass:
`team-portal/jobs/release/route.ts` — a member releasing their own job back
to the open pool (e.g. sick that morning) triggers an admin push
(`"${name} released ${client}'s job (${when}) back to the open pool"`)
whose `when` is a bare `toLocaleString` with no `timeZone`, same
UTC-default gap. This one is the most directly archetype-relevant of the
two: a same-day emergency release mid-shift — a tech going down on a
burst-pipe job with no backup lined up — is exactly the case where an admin
seeing the wrong hour/date while scrambling to re-dispatch is most costly.

**Fixed** — `batch-update/route.ts` now parses `start_time` as a real
instant (`new Date(first.start_time)`) and renders with
`tenant.tenant.timezone` (already in scope via `requirePermission`'s
already-loaded tenant row — no extra query needed), falling back to
`America/New_York` per the same documented convention. `jobs/release/
route.ts` had no tenant timezone available at all (`PortalAuth` only
carries `{id, tid, role}`), so added a parallel tenant-timezone fetch
alongside the existing team-member-name lookup — through `supabaseAdmin`
directly, not the `tenantDb` wrapper, since `tenants` has no `tenant_id`
column (it IS the tenant row) and `tenantDb`'s auto-scoping would append a
filter on a column that doesn't exist; `tenant-db.ts`'s own header comment
already documents this exact rule.

2 new test files, mutation-verified (`git apply -R` each fix, RED for the
expected reason both times — the Pacific-zone assertion failed against the
UTC-implicit render, e.g. "Mon, Aug 10" instead of "Aug 9" — `git apply`
restored, GREEN). `tsc --noEmit` clean, full suite 419/419 files,
2016/2016 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not touched
here).

## (120) Fresh ground (webhook-event coverage gap, same shape as item (106) but a different provider event) — Resend's `email.suppressed` event had zero handling — NOW FIXED

Items (102)/(106) already closed two Resend webhook-event gaps
(`email.complained`, `email.failed`). Checked whether any more of Resend's
event catalog went unhandled by reading the installed SDK's own type
definitions directly (`node_modules/resend/dist/index.d.ts`'s
`WebhookEvent` union — not guessed, not assumed from memory): it lists
`email.suppressed` alongside `bounced`/`complained`/`failed`, the first
three of which already had a branch in `webhooks/resend/route.ts`'s
handler. `email.suppressed` fell through to the generic
`else { return NextResponse.json({ ok: true }) }`.

Resend fires this event when a send is never even attempted because the
recipient is already on the account's suppression list (a prior hard
bounce, complaint, or unsubscribe) — a terminal non-delivery outcome, same
category as `email.bounced`, just for a send that never left the launch
pad. Without a branch, a suppressed recipient's `campaign_recipients` row
stayed stuck at whatever status it was pre-send (almost always `'sent'`)
forever — the aggregate recount a few lines below already treats
`'failed'`/`'bounced'` as first-class for `failed_count`, but nothing ever
produced either status for a suppressed send, so `failed_count` silently
undercounted every one — identical shape to item (106)'s `email.failed`
gap before that fix.

**Fixed** — mirrors the existing `email.bounced` branch exactly (status
update only, no opt-out side effects — unlike `email.complained`,
suppression by itself isn't a spam-complaint signal, so no
`marketing_opt_out_log`/`email_marketing_opt_out` write).

1 new test file (3 cases: status set to `bounced`, no opt-out side effect,
`failed_count` aggregate recount), mutation-verified (`git apply -R` the
fix, 2 of 3 cases RED for the expected reason — status stayed `'sent'`,
`failed_count` stayed 0 — `git apply` restored, GREEN). `tsc --noEmit`
clean, full suite 420/420 files, 2018/2018 tests, zero regressions (same
pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly
per standing rule, no reconcile-gate work this round.

## (121) Archetype depth — `cron/no-show-check`'s own 🚨 EMERGENCY alert was UTC-implicit, missed by every prior timezone sweep because it queries across all tenants in one shot — NOW FIXED

Items (70)/(115)/(117)/(119) closed 17 UTC-implicit date/time renders across
routes and per-tenant crons. `cron/no-show-check/route.ts` — the 15-minute
job that auto-flips a stale scheduled/confirmed/pending booking to
`no_show` and fires an admin alert — was never caught by any of those
sweeps because it's structurally different from every other cron in this
codebase: it queries `bookings` across ALL tenants in a single call rather
than looping `for (const tenant of tenants)`, so it never had a `tenant.
timezone` in scope to begin with; the alert message rendered
`new Date(b.start_time).toLocaleString()` with zero options at all — no
`timeZone`, defaulting to the server's runtime zone (UTC on Vercel).

Most archetype-relevant instance found yet: this is the literal moment a
tech no-showed and the system already flags it `${isEmergency ? '🚨
EMERGENCY — ' : ''}` for `is_emergency`-flagged bookings — an admin reading
this alert to scramble a replacement sees a clock time hours off from their
own tenant's local time, for the one class of alert this whole doc's
archetype is built around.

**Fixed** — after fetching candidates, collect the distinct `tenant_id`s
and fetch a `{id, timezone}` map in one extra query (candidates already
span tenants, so there's no single "the" tenant row to select alongside
them the way per-tenant crons do), then render each alert's `when` with
`timeZone: tzByTenant.get(b.tenant_id) || 'America/New_York'` — same
documented default every other fix in this doc uses.

1 new test file, mutation-verified (`git apply -R` the fix, RED for the
expected reason — the alert showed the UTC reading, "8/10/2026, 1:00:00 AM"
instead of the Pacific "Aug 9"/"10:00 PM" — `git apply` restored, GREEN).
`tsc --noEmit` clean, full suite 421/421 files, 2020/2020 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (122) Fresh ground, new bug class (declared action silently doesn't happen, distinct from every notify/timezone/destructive-column thread this session) — `DELETE /api/bookings/[id]` ignored all three intent query params BookingsAdmin sends it and hard-deleted every booking regardless — NOW FIXED

BookingsAdmin.tsx sends this route three distinct signals depending on
which button fired the request — `?cancel_series=true` ("Cancel All
Future" on a recurring booking, with a comment calling it "precise
server-side series cancellation"), `?hard_delete=true` (only ever sent for
a booking whose status is already `'cancelled'`, confirm dialog: "Permanently
delete this cancelled booking"), or no param at all (the plain "Cancel"
button, shown for every non-cancelled status — including `completed`/
`paid`). The route read none of them. It unconditionally ran
`db.from('bookings').delete().eq('id', id)` no matter which button sent
the request, collapsing three different declared intents into one
undifferentiated hard delete:

1. **Series cancel silently no-op'd.** Clicking "Cancel All Future" hard-
   deleted only the single clicked booking. The `recurring_schedules` row
   kept `status:'active'` and the generator kept refilling the series;
   every other future occurrence stayed fully scheduled. The UI reports
   success and the admin believes the whole series is cancelled — nothing
   about the series actually changed. The already-correct version of this
   exact operation exists one route over (`DELETE /api/admin/
   recurring-schedules/[id]`, which properly flips the schedule to
   `cancelled` and cancels its future bookings) — BookingsAdmin's own
   comment describes calling that logic, but the endpoint it actually hits
   never runs it.
2. **Routine "Cancel" permanently erased financial history.** The plain
   "Cancel" (X icon) button is shown for `scheduled`/`confirmed`/
   `in_progress`/**`completed`** bookings alike, with a confirm dialog that
   just says "Cancel booking for X?" — no permanence warning. Because the
   backend hard-deleted regardless, clicking it on a completed/paid job
   erased that row entirely, taking its `finance/revenue`,
   `finance/payroll-prep`, `finance/tax-export`, and `finance/
   cleaner-income` history with it — same "destructive op on a record with
   financial significance" shape as item (118), just the whole row instead
   of one column, and reachable via what the UI presents as a routine,
   reversible-sounding action.
3. **The UI's own two-step flow was structurally dead.** The "Permanently
   delete" button only renders for `status === 'cancelled'` rows — but
   since plain "Cancel" already hard-deleted the row on step one, no row
   ever survived to reach `'cancelled'` status and show that button. The
   frontend was built for a soft-cancel-then-hard-delete flow the backend
   never implemented.
4. **`skip_email=true` silently ignored.** The legacy batch-cancel fallback
   sends the first booking in a series without this param (wants the
   email) and the rest of the series with it (wants it suppressed) — the
   backend fires the client cancellation email/SMS for all of them either
   way.

**Fixed** — the route now branches on the three params before touching the
row: `cancel_series=true` with a `schedule_id` present delegates to the
same status-flip logic `recurring-schedules/[id]`'s DELETE already uses
(schedule → `cancelled`, its future `scheduled`/`pending` bookings →
`cancelled`, same "no client notification for a bulk series action"
convention that route's own header comment documents — already-completed
bookings on the schedule keep their `team_member_id`/history intact,
untouched). `hard_delete=true` now requires the booking to already be
`status:'cancelled'` server-side (400 otherwise) before running the real
`.delete()` — no longer trusting the query param alone the way item (118)'s
notes flagged as an open question for the sibling `/api/team/[id]` DELETE.
The default (no params) now soft-cancels via `.update({status:'cancelled'})`
instead of deleting — preserves the row (and any finance-report history it
carries) and is what actually lets the UI's two-step Cancel → Delete flow
function for the first time. `skip_email=true` now gates the notification
block.

Two pre-existing cross-tenant isolation tests asserted the OLD hard-delete-
always behavior (`route.isolation.test.ts`, `cross-tenant-routes-booking-
detail.test.ts`) and one asserted the old false-positive 200-on-a-0-row-
scoped-delete status for a cross-tenant DELETE attempt
(`cross-tenant-routes.test.ts` — now correctly 404, matching the sibling
GET's existing 404 for the same cross-tenant target); updated all three to
assert the corrected behavior. The actual security invariant every one of
them proves — tenant B's row is never touched by tenant A's request — is
unchanged and still passes.

1 new test file (6 cases: default soft-cancel preserves the row,
`skip_email` suppresses the notify, `hard_delete` rejected on a
non-cancelled booking, `hard_delete` accepted on an already-cancelled one,
`cancel_series` cancels the schedule + future bookings while leaving a
past/completed booking and a different schedule's booking untouched,
`cancel_series` sends no client notification), mutation-verified (`git
apply -R` the fix, all 6 RED for the expected reason — the schedule stayed
`active`, hard_delete succeeded on a non-cancelled booking, skip_email/
cancel_series were no-ops — `git apply` restored, GREEN). `tsc --noEmit`
clean, full suite 422/422 files, 2025/2025 tests, zero regressions (same
pre-existing, unrelated `tenant-scope` guard warning on `src/app/api/
fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (123) Archetype depth — item (118)'s delete-safety fix landed on the legacy shim, not the route the UI actually calls: `DELETE /api/team/[id]` still hard-deleted unconditionally — NOW FIXED

Item (118) fixed `DELETE /api/cleaners/[id]` — a legacy nycmaid-path shim
over `team_members` — to unassign only upcoming/in-flight bookings (keeping
`team_member_id` intact on completed/paid ones for finance/tax-export
attribution), null `suggested_team_member_id`/`recurring_schedules`, and
notify the admin with a reassignment count. But no UI code calls DELETE on
`/api/cleaners/[id]` at all — `dashboard/team/[id]/page.tsx`'s own "Remove
this team member?" button, the actual reachable delete path, calls DELETE
`/api/team/[id]` directly, a completely separate route file that still ran
the pre-fix unconditional `.delete()` with none of item (118)'s safety:
no booking unassignment, no `suggested_team_member_id`/
`recurring_schedules` cleanup, no admin notification. A client's assigned
tech could vanish from a scheduled/confirmed job with nobody told — the
exact gap item (118) believed it had closed, still wide open on the route
real traffic hits.

**Fixed** — ported item (118)'s exact logic onto this route: same
`UNASSIGNABLE_ON_DELETE_STATUSES` unassign-only-upcoming behavior, same
`suggested_team_member_id`/`recurring_schedules` cleanup, same admin
`notify()` with the reassignment count.

6 new tests (historical bookings keep `team_member_id`, upcoming ones
unassign, notify fires/doesn't fire on the reassignment count,
`suggested_team_member_id` + `recurring_schedules` cleanup, actual row
deletion, cross-tenant isolation), mutation-verified (`git diff+apply -R`
the fix, 3 of 6 RED for the expected reason — `team_member_id` stayed set
on an upcoming booking, `notify()` never fired, `suggested_team_member_id`/
`recurring_schedules` stayed untouched — `git apply` restored, GREEN).
`tsc --noEmit` clean, full suite 423/423 files, 2031/2031 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (124) Fresh ground, new bug class (destructive-op-no-server-guard thread, items 118/122/123, now on the client self-service surface) — `PUT /api/portal/bookings/[id]` let an authenticated client cancel or reschedule ANY booking regardless of status — NOW FIXED

`portal/bookings/[id]/page.tsx`'s own `canReschedule`/`canCancel` constants
(`['pending','scheduled','confirmed']` for reschedule,
`['scheduled','confirmed']` for cancel) only control which buttons render
— the backend `PUT` enforced neither. Any client holding a valid portal
bearer token could POST `{status:'cancelled'}` or a new `start_time`
directly at a `completed`, paid-out, or already-`cancelled` booking's own
id, and the route applied it unconditionally — no different from editing
devtools past a disabled button, except this is a bearer-token API with no
UI in the loop to disable anything.

Financially real, not cosmetic: `finance/payroll-prep` and
`finance/cleaner-income` both filter on `.eq('status', 'completed')` to
compute what a team member is owed. Flipping a completed booking to
`cancelled` silently drops it from both reports — the tech who did the
work goes unpaid for it with no error, no audit trail pointing at the
client, and no admin awareness beyond a normal-looking "cancellation"
notification for a job that already happened. Rescheduling a
completed/cancelled booking was equally nonsensical and just as
unguarded.

**Fixed** — ported the exact status sets the UI already computes into the
route itself: cancelling requires `status` in `['scheduled','confirmed']`,
changing `start_time`/`end_time` requires `status` in
`['pending','scheduled','confirmed']` — 400 otherwise, checked before any
write touches the row. Unrelated field edits (`notes`,
`special_instructions`) still work regardless of status, matching the UI
which never gates those.

9 new tests (reject/allow cancel across every status, reject/allow
reschedule across every status, notes-edit unaffected by status),
mutation-verified (`git diff+apply -R` the fix, 4 of 9 RED for the
expected reason — completed/cancelled bookings accepted the cancel or
reschedule at 200 instead of rejecting at 400 — `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 424/424 files, 2040/2040 tests,
zero regressions (same pre-existing, unrelated `tenant-scope` guard
warning on `src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (125) Fresh ground, same destructive-op-no-server-guard thread (items 118/122/123/124), new endpoint on the consumer self-service surface — `PUT /api/client/reschedule/[id]` enforced none of its own callers' eligibility rules — NOW FIXED

Item (124) closed this gap on `PUT /api/portal/bookings/[id]`. This route is
a sibling on the OTHER client-facing surface — the four consumer sites'
own booking dashboards (`site/book`, `wash-and-fold-hoboken`,
`wash-and-fold-nyc`, `the-florida-maid`), all four of which ship an
identical `canReschedule()`: one-time (non-`recurring_type`) bookings can
never be rescheduled, and recurring ones need 7+ days notice. Every one of
the four computes this purely to decide whether the "Reschedule"
button/page renders — none of it reached the route itself, and the route
never checked booking `status` either (item 124's exact gap, independently
present here since this is a different file). A client hitting this route
directly could reschedule a one-time booking the UI says can never move,
jump the 7-day staffing-notice window, or silently move a
`completed`/`cancelled` booking's date forward — since the route never
touches `status`, a rescheduled-but-still-`cancelled` row stays invisible
to admin (bookings queries filter `.neq('status','cancelled')`) while the
client believes the reschedule succeeded.

**Fixed** — ported the exact `RESCHEDULABLE_STATUSES` set from item (124)'s
thread plus this route's own four callers' `recurring_type`/7-day-notice
rule, checked against the booking's current `status`/`start_time` before
any write, only when the request is actually changing `start_time`/
`end_time` (a team-member-only reassignment is unaffected, matching the UI
which never gates that).

6 new tests (reject one-time, reject inside-7-days, allow 7+-days-out
recurring, reject completed, reject cancelled, team-member-only
reassignment bypasses the gate), plus updated 5 pre-existing test files'
booking fixtures to carry `status`/`recurring_type` so they keep exercising
their own (unrelated) behavior under the new gate. Mutation-verified
(`git diff+apply -R` the fix, 4 of 6 RED for the expected reason — one-time,
inside-notice-window, completed, and cancelled bookings all accepted the
reschedule at 200 instead of rejecting at 400 — `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 425/425 files, 2046/2046 tests,
zero regressions (same pre-existing, unrelated `tenant-scope` guard warning
on `src/app/api/fixture/route.ts`, not touched here).

Noticed, not fixed (out of scope this round — flagging for a future pass):
this same route destructures `body.team_member_id`, but all four consumer
UI callers POST `cleaner_id` in the request body instead — meaning a
client's cleaner selection during reschedule is silently dropped on every
live call site, and the booking keeps its old `team_member_id` regardless
of which cleaner the UI showed as available for the new slot. Separate bug
class (silent feature no-op, not a safety/guard gap) — worth its own
investigation.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (126) Item (125)'s Noticed item, investigated — the `cleaner_id`/`team_member_id` mismatch was NOT a silent-discard, it was a crash: `selectedSlot.cleaners` was always undefined — NOW FIXED

Queued as "same fix shape as W1's item (4)" — self-booking's `POST
/api/client/book` ignoring a real `cleaner_id` a client actually picked
from real data. Investigating found the reschedule surface isn't that
shape at all: `GET /api/client/availability` (`src/lib/availability.ts`)
only ever returns `{ time, available }` per slot — it has never had a
`.cleaners` field — and none of the four reschedule pages (`site/book`,
`wash-and-fold-hoboken`, `wash-and-fold-nyc`, `the-florida-maid`) render
any cleaner-selection UI; there was never a real pick for the client to
make on this surface. `selectedSlot.cleaners[0]?.id` was fictional dead
code reading an undefined property, so `handleReschedule` threw a
`TypeError` on literal every reschedule attempt across all four tenant
surfaces — a total feature outage, not a silent discard. The server-side
route (fixed at item 124/57b5a9f7) already reads and correctly validates
`team_member_id`, not `cleaner_id`, so there was nothing to wire up even
with the field name corrected.

**Fixed** — matched the real fix already landed for this exact bug on
p1-w1 (commit `5dd0fd0b`): dropped the fictional `cleaners` field from the
`TimeSlot` interface and the crash-causing/dead `cleaner_id` param from the
PUT body on all 4 pages. Reschedule now sends only `start_time`/`end_time`,
matching what `/api/client/availability` actually returns and what the UI
actually lets a client choose. Existing server-side route suite (24/24)
unaffected — confirms the `team_member_id` validation logic this doesn't
touch is untouched.

Flagging the discrepancy rather than silently substituting: the queue
instruction described a "pick silently discarded" shape by analogy to item
(4), but the actual code showed a different (and worse) failure mode with a
different correct fix. Investigate-before-porting caught it before writing
a fix that wouldn't have matched reality.

## (127) Fresh ground, real instance of the item-(4) archetype — `POST /api/client/book` never read `cleaner_id`/`extra_cleaner_ids` at all, unlike the reschedule surface this one has live UI + real data behind it — NOW FIXED

Unlike (126)'s dead reschedule-surface field, the self-booking "Choose your
team" step is real: `nycmaid/book/new`, `template/book/new` (shared by
every generic tenant), and `the-florida-maid/book-now` all render an actual
LEAD/EXTRA/YOUR-PICK cleaner picker backed by real per-slot availability
data from `/api/client/smart-schedule`, and all three POST
`cleaner_id`/`extra_cleaner_ids` to `/api/client/book`. The route never
read either field: `create_booking_atomic`
(`migrations/2026_07_13_client_book_dedupe_atomic.sql`) hardcoded
`team_member_id` to a literal `NULL` in its INSERT — a client's explicit
pick was silently discarded on every live call, every time, in favor of
manual admin assignment. Exactly the shape W1 already fixed on
`/api/client/recurring` the same session (`cfc05323`).

**Fixed** — `route.ts` now validates `cleaner_id`/`extra_cleaner_ids` are
tenant-scoped + active before use (the same gate `recurring`/`reschedule`
already enforce — a client picking their crew must stay inside their own
tenant's roster), passes the lead through to `create_booking_atomic`'s new
`p_team_member_id` param, and syncs `booking_team_members` (lead + extras)
the same way `recurring`/`reschedule` already do.
`migrations/2026_07_17_client_book_team_member_id.sql` adds
`p_team_member_id DEFAULT NULL` (backward compatible — this route is the
RPC's only caller, confirmed by repo-wide grep) and uses it in the INSERT
instead of the hardcoded `NULL`. File only — not run against any DB; the
leader runs it after Jeff approves, per standing rules.

5 new tests (valid lead cleaner passes through + syncs to
`booking_team_members`, extras sync as non-lead, foreign-tenant cleaner_id
rejected 400, inactive cleaner_id rejected 400, no-cleaner-id positive
control unaffected). Mutation-verified via `git stash` on `route.ts` alone
(all 5 RED for the expected reason against pre-fix code — `p_team_member_id`
came back `undefined` instead of the picked id or `null`, foreign/inactive
picks got 200 instead of 400 — `git stash pop` restored, GREEN). `tsc
--noEmit` clean, full suite 426/426 files, 2051/2051 tests, zero
regressions.

Left untouched: booking `status` stays `'pending'` regardless of whether a
cleaner is assigned — `recurring`'s `status:'scheduled'`-when-cleaner-picked
convenience isn't mirrored here. That's a separate behavior change nobody
asked for and isn't required for the client's pick to actually take effect.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (128) Fresh ground, different shape from the destructive-op thread (118-127) — client dashboard's assigned-cleaner name was silently blank on every booking, on all four self-service tenant surfaces — NOW FIXED

Not a missing guard this time — a join-alias mismatch. `GET
/api/client/bookings` (feeding `site/book`, `wash-and-fold-hoboken`,
`wash-and-fold-nyc`, and `the-florida-maid`'s `/dashboard` pages, all four
ported from the same nycmaid original) selects the assigned team member as
`team_members!bookings_team_member_id_fkey(name)` — supabase-js returns that
join under the key it's written with, `team_members`. All four dashboards'
`Booking` interface and JSX, unchanged since the nycmaid port, read
`booking.cleaners?.name` — a key the response never had. Every booking, even
a fully staffed one, rendered "Cleaner TBD" (next-booking banner) or "To be
assigned" (booking list), regardless of whether `team_member_id` was set.
Pure display gap, not a security issue — the client's own booking data
wasn't affected, just its presentation.

**Fixed** — aliased the join in `client/bookings/route.ts`'s two queries:
`cleaners:team_members!bookings_team_member_id_fkey(name)`, matching the key
every consumer already reads. Checked every other route sharing this same
join (`client/booking/[id]`, `client/reschedule/[id]`, `client/recurring`,
`client/preferred-cleaner`, and ~40 admin/dashboard/cron routes) — none of
their consumers expect a `cleaners` key, so this is the only route that
needed the alias.

New test (`route.cleaner-alias.test.ts`) captures the actual `select()`
column string passed to the tenantDb-wrapped query and asserts the join is
aliased to `cleaners:team_members`, not the bare join name. Mutation-verified
(`git apply -R` the fix, RED for the expected reason — select string reverted
to the un-aliased `team_members!...`, assertion failed. `git apply` restored,
GREEN). `tsc --noEmit` clean, full suite 427/427 files, 2052/2052 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Noticed, not fixed: the same `.cleaners?.name` read also appears in three
`_components/DashboardMap.tsx` files (`nyc-mobile-salon`,
`wash-and-fold-hoboken`, `wash-and-fold-nyc`) and two team-member
`team/[token]/page.tsx` pages (`wash-and-fold-hoboken`, `wash-and-fold-nyc`).
The three `DashboardMap.tsx` files are confirmed dead — grepped, nothing
imports them from their actual relative path, so no live surface renders
them. The `team/[token]/page.tsx` pages are a different, ambiguous case: they
fetch `/api/team/${token}`, which only resolves to `/api/team/[id]/route.ts`
(admin-authed `team_members` CRUD, returns `{ member }`, not a booking with
`clients`/`cleaners`) — the shape this page expects was never served by that
endpoint. Whether this page is still reachable at all depends on whether
`next.config.js`'s `/team/:uuid` → `/team/checkin/:uuid` permanent redirect
(added for the nycmaid cutover) fires before this page can render for
tenant-domain requests — that's a middleware-ordering question this
investigation didn't verify at runtime, and it's a different subsystem (team
portal, not the client self-service surface this round's queue targeted).
Flagging for a dedicated pass rather than guessing at reachability.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (129) Dedicated pass: the `team/[token]/page.tsx` reachability question flagged in (128), resolved — dead code, not a live bug

(128) left this ambiguous: does `next.config.ts`'s `/team/:uuid` →
`/team/checkin/:uuid` redirect fire before `wash-and-fold-hoboken` and
`wash-and-fold-nyc`'s `(app)/team/[token]/page.tsx` can render on a tenant
domain? Traced the full request path through `src/middleware.ts` — it
doesn't just fire first, the tenant-site page can never be reached at all,
independent of the redirect.

`rewriteToSite()` (`src/middleware.ts:389`) checks `APP_ROOT_PREFIXES`
(`/api/`, `/portal`, `/team`, …) before falling through to the bespoke
per-tenant `/site/<slug>` subtree logic. `/team` is in that list, so on
`wash-and-fold-nyc`'s own domain a request to `/team/<anything>` never
rewrites into `/site/wash-and-fold-nyc/team/<anything>` — it passes through
unchanged (tenant headers injected) to the root-level `/team` route tree,
same as on the main host. There is no code path, on any host, that ever
rewrites a request into that per-tenant `[token]` page — the only way to
reach it is by requesting the internal `/site/wash-and-fold-nyc/team/<token>`
path directly, which no link, redirect, or rewrite in the codebase produces.

On top of that unreachability, the page's own fetches don't work either:
`/api/team/${token}` resolves to `/api/team/[id]/route.ts`, an
admin-authed (`requirePermission('team.view')`) `team_members` CRUD endpoint
that 401s an unauthenticated token holder and, even if it somehow succeeded,
returns `{ member }` (a team_members row) not the `{ start_time, clients,
cleaners, ... }` booking shape the page expects. `/api/team/${token}/check-in`
and `/check-out` don't resolve to anything — no such nested route exists
under `/api/team/[id]/`. And no code anywhere generates a token or a link to
this page (grepped for `team_portal_token`, `team_token`, and any
`` `/team/${...}` `` link-building — none found).

Net: this is inert code ported wholesale from the pre-platform nycmaid
build (`f1b7dbaa`, "port 19 tenant /site/ subtrees from nycmaid") whose
matching backend and link-generation never made the jump to this
architecture. The REAL, working booking check-in/checkout flow for every
tenant, including these two, is the global session-based
`src/app/team/checkin/[bookingId]/page.tsx` + `/api/team-portal/checkin` —
confirmed that path is intact and unaffected by any of this. No fix applied;
nothing here is reachable by a real user, so there's no live bug to
correct. Not touching/deleting the two orphaned `[token]/page.tsx` files
(337 lines each, `wash-and-fold-hoboken` + `wash-and-fold-nyc`) without
Jeff/leader sign-off — flagging for a deletion decision rather than acting
on it unilaterally.

Fresh-ground hunt (queue item 2, same session): re-swept the client-facing
self-service surface for the (126)-(128) archetypes (silently-discarded
picks, join-alias shape mismatches) across `client/recurring`,
`client/preferred-cleaner`, `client/booking/[id]`, and `client/collect`.
`client/recurring` correctly persists `cleaner_id`/`extra_cleaner_ids` to
both `recurring_schedules` and every generated booking, with the same
tenant-ownership gate (128)'s siblings already have. `client/booking/[id]`
returns an un-aliased `team_members` join, but its only consumers (the four
reschedule pages) never read a cleaner name field, so no mismatch.
`client/preferred-cleaner` (GET+PUT) has no frontend caller anywhere in the
codebase — grepped `src/app` for any fetch to it, found only a same-named
TypeScript field on `BookingsAdmin.tsx`'s `Client` interface, not a call
site. Possibly dead API, not a live bug (nothing broken because nothing
calls it) — noting it, not filing it as a fresh-ground item. No new
live bug found this round.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (130) New fresh-ground surface — the dedicated `waitlist` table's own `status` field was declared with a real lifecycle but nothing ever wrote past the insert-time default — NOW FIXED

Picked a surface none of the 129 prior items had touched: the admin
"Waiting List" panel (`GET /api/waitlist`, fed by `BookingsAdmin.tsx`).
Migration `051_waitlist.sql` declares `status: 'open' | 'contacted' |
'booked' | 'expired'`, defaulting new rows to `'open'`, and the GET route
already filters `.neq('status', 'expired')` — both signals that the intent
was a real state machine. Grepped every `.from('waitlist')` call site in the
codebase: only the GET (read) and POST (insert) in `route.ts` existed. No
PATCH, no PUT, no cron, nothing anywhere ever wrote `contacted`, `booked`,
or `expired`. The admin's "Book Now" button on a waitlist card only
pre-fills the create-booking form — it never touched the waitlist row
itself. Net effect: every entry, including ones already booked days ago,
stayed `'open'` and kept cluttering the Waiting List panel forever, with no
way to clear one short of a manual DB edit. Same "declared-value-never-
written" shape as items (91)/(100)/(112), a different subsystem (its own
dedicated table, not a `notify()` type or SMS/JSON column).

**Fixed** — added `PATCH /api/waitlist/[id]` (tenant-scoped via `tenantDb`,
gated on `bookings.edit` matching `booking-notes/[id]`'s convention),
accepting `status` in the declared set and rejecting anything else with 400
before touching the database. Wired `BookingsAdmin.tsx`'s "Book Now" flow to
actually close the loop: clicking it optimistically hides the entry and
stashes it as the pending waitlist origin for the create-booking modal;
completing the booking (any of the modal's emergency/recurring/batch
branches) fires the PATCH to `'booked'`; cancelling or closing the modal
(Cancel button and the panel's own X/backdrop close, both now routed through
one `closeCreateModal()`) restores the entry to view instead of silently
losing it — avoids a false-positive "booked" if the admin backs out.
Legacy `sms_conversations`-sourced waitlist rows (the GET's other union
source, `source:'sms'`) have no row in the `waitlist` table to PATCH, so
those are left alone as before, un-clearable by this fix — a pre-existing
gap in the legacy union, not something this round's fix regresses.

3 new tests (`waitlist/[id]/route.isolation.test.ts`): tenant A transitions
its own entry (positive control), same-id tenant B row survives untouched,
and an invalid status is rejected before any DB write. Mutation-verified
(short-circuited the validity check to always pass, the invalid-status test
went RED for the expected reason — 200 instead of 400 — restored, GREEN).
`tsc --noEmit` clean, full suite 428/428 files, 2055/2055 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Noticed, not fixed: the hardcoded `hours: 2, hourly_rate: 69` seed values
the "Book Now" prefill uses regardless of tenant (same defaults every other
create-booking entry point in this file also hardcodes) — a pre-existing
cosmetic default the admin can edit in the modal before saving, not a silent
bug, not part of this round's scope.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (131) Continuing (130)'s surface — the other two lifecycle states `PATCH /api/waitlist/[id]` now supports had no UI trigger either, so a stale entry the admin doesn't want to book still couldn't be cleared

(130) wired `'booked'`. `'contacted'`/`'expired'` were left reachable only
by hand-crafting the PATCH call — no button fired either, so an entry the
admin decides NOT to book (wrong number, already handled by phone, gave up
waiting) still had no way to leave the panel short of a DB edit. Same root
cause as (130), the remaining half of it.

**Fixed** — added a "Dismiss" action next to "Book Now"/"Text" on each
dedicated-table waitlist card (hidden for `source:'sms'` entries, same
caveat as (130) — no `waitlist` table row to PATCH for those), firing the
same `PATCH /api/waitlist/[id]` with `status:'expired'` and optimistically
removing the card. No new backend code — reuses (130)'s already-tested
route and status validation, so no new tests added; `tsc --noEmit` clean,
full suite 428/428 files, 2055/2055 tests, zero regressions.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (132) New fresh-ground surface — the dedicated `cleaner_applications` table (real job applicants from three live tenant marketing sites) had zero admin UI, and the one notification that pointed at it 404'd — NOW FIXED

Picked a surface none of the 131 prior items had touched: the OTHER applicant
table. `team_applications` (fed by `/api/team-applications`) is fully wired
to the "Applications" tab on `/dashboard/team` — that one's fine. But
`cleaner_applications` (migration `2026_05_19_cleaner_applications.sql`,
its own `status: 'pending'|'reviewed'|'accepted'|'rejected'` lifecycle) is a
separate table written by the public `/api/apply` form, which three tenant
marketing sites actually use (`nyc-mobile-salon`, `the-nyc-interior-designer`,
`landscaping-in-nyc` — grepped every `fetch('/api/apply'` call site to
confirm). Submitting notifies admins via `notify(type:'cleaner_application')`,
and the ported nycmaid-style dashboard chrome (`nyc-mobile-salon` /
`wash-and-fold-hoboken` / `wash-and-fold-nyc` `_components/DashboardHeader.tsx`
+ `AdminSidebar.tsx`) maps that notification type to a `/admin/cleaners` deep
link — which the platform's own middleware rewrites to `/dashboard/cleaners`
for the tenant's Loop dashboard. That page never existed (confirmed no
`src/app/dashboard/cleaners` directory) — a genuine 404, not a permissions
wall. The ONLY other access to these rows was Selena's owner-only chat tools
(`list_cleaner_applications`/`approve_cleaner_application`/
`reject_cleaner_application` in `lib/selena/tools.ts`) — text commands only,
no visible list, no button, and gated to whichever role counts as "owner"
for that tenant's Selena config. Real applicants to three live tenant sites
had, in practice, no admin-visible review surface.

Also noticed while reading the approve tool: its `team_members` insert never
sets a `pin` (the portal-login credential) — unlike `POST /api/team` and the
shared `provisionApprovedApplicant` helper, both of which mint one. An
applicant "approved" via that chat tool would be created as a team member
who could never actually log into the team portal — same silent-non-
functional shape as the (130)/(131) waitlist gap, different subsystem.

**Fixed** — added `GET /api/team/cleaner-applications` (list, `team.view`)
and `PATCH /api/team/cleaner-applications/[id]` (`action: 'accept'|'reject'`,
`team.edit`, tenant-scoped via `tenantDb`) plus `/dashboard/cleaners` (styled
to match the sibling `SalesAppsTab.tsx` pattern already used for the other
applicant-review tab), giving every tenant — not just the three whose ported
chrome links to it — a real place to see and act on these applications.
Deliberately did NOT port the chat tool's bare insert: `accept` instead calls
the same `provisionApprovedApplicant` helper `POST /api/team-applications`
already uses, so accepting from `/dashboard/cleaners` mints a real PIN,
dedupes by phone, geocodes the address, and sends the welcome-PIN email —
fixing the pin gap above as a byproduct rather than reproducing it in new
code. `reject` appends the optional reason to `notes` (table has no
`rejected_reason`/`rejected_at` columns, matching the chat tool's existing
workaround). Named the new API path `/api/team/cleaner-applications`
specifically to avoid colliding with the existing `/api/cleaner-applications`
alias, which forwards to the unrelated `team_applications` table for the
ported nycmaid `/site/apply` frontend — same-ish name, different table,
already a landmine before this fix; flagging the naming collision itself as
a pre-existing footgun, not something to rename unilaterally here.

5 new tests (`cleaner-applications/route.isolation.test.ts` +
`cleaner-applications/[id]/route.isolation.test.ts`): tenant A's GET never
sees tenant B's applications, the `team.view`/`team.edit` gates 403 when
denied, tenant A's accept/reject never mutates a same-id tenant B row, reject
appends the reason to notes, and an unrecognized action is rejected before
any DB write (mutation-verified — short-circuited the action check to always
pass, the invalid-action test went RED for the expected reason, 200 instead
of 400 — restored, GREEN). `provisionApprovedApplicant` is mocked in the
accept test (unit-isolated; that helper has its own untested surface —
noted below, not fixed here). `tsc --noEmit` clean, full suite 430/430
files, 2062/2062 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not touched
here).

Noticed, not fixed: `provisionApprovedApplicant` (`lib/team-provisioning.ts`)
and the `team_applications` PUT/bulk-approve routes that call it have zero
existing test coverage of their own — grepped for any test file referencing
either, found none. Also, the main/modern `/dashboard` shell has no
notification-type routing at all (`/dashboard/notifications` is a flat list,
not a per-type deep-linker), so tenants NOT on the ported nycmaid-style
chrome get no deep link to `/dashboard/cleaners` either — this fix makes the
page reachable via direct nav for every tenant, but only the three ported-
chrome tenants get a one-click notification path to it. Neither is this
round's scope.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (133) Continuing (132)'s surface — the third declared `cleaner_applications` status, `'reviewed'`, still had no writer either

(132) wired `'accepted'`/`'rejected'`. The table's own enum also declares
`'reviewed'` — same "declared-value-never-written" root cause, the third of
three states, same table. An admin looking through a growing pile of
applicants had no way to flag "I looked at this one, still deciding" without
prematurely accepting or rejecting it outright.

**Fixed** — added `action: 'mark_reviewed'` to `PATCH /api/team/cleaner-
applications/[id]` (same route (132) added, `team.edit`), setting
`status: 'reviewed'` + `reviewed_at`. Wired a "Mark Reviewed" button on
`/dashboard/cleaners`, shown only for `'pending'` cards (a `'reviewed'` entry
still shows Accept/Reject — mark-reviewed is a one-way "seen" flag, not a
dead end). No new backend dependencies — reuses (132)'s already-tested fetch
+ tenantDb update pattern.

1 new test (`cleaner-applications/[id]/route.isolation.test.ts`): marking an
application reviewed sets the right status/reviewed_at and does not call
`provisionApprovedApplicant` (that path is accept-only). `tsc --noEmit`
clean, full suite 430/430 files, 2063/2063 tests, zero regressions.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (134) New fresh-ground surface — the monthly-close page's `reopened` status was fully built on both ends and never actually connected: the API silently collapsed it back to `open` — NOW FIXED

Picked a different subsystem than 128-133's tenant-facing tables: the
finance/accounting monthly-close feature (`accounting_periods`, migration
`035_close_audit.sql`). Its `status` CHECK constraint declares four values —
`open`, `in_review`, `locked`, `reopened` — and the close page
(`/dashboard/finance/close`) is built end-to-end for all four: a TypeScript
union type includes `'reopened'`, `STATUS_COLORS` gives it its own blue
badge, and clicking "Reopen" on a locked period sends
`PATCH /api/finance/periods/[id]` with `status: 'reopened'`. But the route
(`src/app/api/finance/periods/[id]/route.ts`) treated `'reopened'` and
`'open'` as the same branch and always wrote `status: 'open'` to the row —
so the literal string `'reopened'` was never persisted, the blue badge could
never render, and a period that had just been locked and reopened looked
identical to a period that was never closed at all. The audit trail columns
(`reopened_at`/`reopened_by`/`reopened_reason`) WERE being written correctly
and were even selected back by the GET route (`select('*')`) — just never
displayed anywhere, so that data existed but was invisible. Same
declared-value-never-written root cause as (130)-(133), different table and
different subsystem (finance/accounting rather than a tenant-facing
applicant/waitlist table).

Checked for fallout before changing the persisted value: the only other
consumer of `accounting_periods.status` is the `check_period_lock` trigger
that blocks journal entries, and it matches on `status = 'locked'`
exclusively — a period moving from `'open'` to `'reopened'` (still
not-`'locked'`) doesn't affect it. No dashboard or API elsewhere aggregates
periods by status, so there was no other code silently relying on
`'reopened'` collapsing into `'open'`.

**Fixed** — split the PATCH route's branch: a `'reopened'` request now
persists `status: 'reopened'` literally (still stamping
`reopened_at`/`reopened_by`/`reopened_reason` from the authenticated
session, unchanged from before); an explicit `'open'` request (not sent by
the current UI, but accepted by the route) now just sets `status: 'open'`
without also stamping the reopen audit columns, since it isn't a reopen
event. Also surfaced the previously-invisible audit data: the close page now
shows a small "Reopened {date} — {reason}" banner in the expanded period
panel whenever `status === 'reopened'`, using data the GET route was already
returning.

3 new tests (`route.status-persistence.test.ts`): a `reopened` PATCH
persists the literal status and reason instead of collapsing to `open`; an
explicit `open` PATCH still works; a `notes`-only PATCH updates notes
without touching status (isolation-verified — the mock store only applies
whatever `updates` object the route builds, so a wrong branch would leave
`status` unpersisted or persist `open`, and the test would catch either).
`tsc --noEmit` clean, full suite 431/431 files, 2066/2066 tests, zero
regressions (same pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (135) Continuing (134)'s surface — the same close page had a second declared-but-dead field: `notes`, writable by the API since day one, with zero UI to ever set it

While fixing (134) on `/dashboard/finance/close`, noticed the `Period` type
already destructures `notes` from the API response but the page never
renders or edits it anywhere. The PATCH route has supported
`if ('notes' in body) updates.notes = body.notes` since the route existed —
a fully working write path with no caller. An admin doing a monthly close
who wants to leave a note for next month (e.g. "AR aging still off, chase
in April") had no way to do it short of a raw DB edit — same
declared-but-unreachable shape as (134), one field over on the same table.

**Fixed** — added a "Notes" textarea to the expanded period panel (below the
reopened-banner from (134), above the checklist) with an explicit "Save
note" button, disabled until the draft actually differs from the saved
value. Reuses the existing PATCH route unchanged — no new backend code.
Local draft state is keyed by period id so switching between expanded
periods doesn't bleed one period's unsaved text into another's.

Covered by the same (134) test file: the `notes`-only PATCH test doubles as
this item's backend coverage (no separate frontend test framework wired for
this page — matches the existing close page having zero prior test
coverage of its own, noted but not addressed here). `tsc --noEmit` clean,
full suite 431/431 files, 2066/2066 tests, zero regressions.

Noticed, not fixed: the close page's "Reopen" flow still uses a native
`window.prompt()` for the reopen reason instead of an in-page input — a
pre-existing UX rough edge, not part of either fix above. Also, the
`/dashboard/finance/close` page itself has no test coverage of its own
(only the API route does) — same gap as `/dashboard/cleaners` noted in
(132), not this round's scope.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (136) New fresh-ground surface — the platform-level prospect intake's declared `cancelled` status already had a badge color prepared and nothing that could ever write it — NOW FIXED

Picked a different subsystem than (130)-(135)'s tenant-facing tables and the
finance close page: the super-admin prospect-intake pipeline (`prospects`
table, migration `037_leads_qualification.sql`, fed by the public `/qualify`
form and reviewed at `/admin/prospects`). Its `status` CHECK constraint
declares six values — `new`, `reviewing`, `approved`, `rejected`, `paid`,
`cancelled` — and `admin/prospects/page.tsx`'s own `STATUS_COLORS` map
already has a dedicated slate badge for `cancelled`, the same "UI was built,
data never arrives" signal as (134)'s blue `reopened` badge. But
`PATCH /api/admin/prospects/[id]` only had three action branches
(`approve`→`approved`, `reject`→`rejected`, `review`→`reviewing`); the
Stripe webhook writes `paid` on checkout completion; the public POST route
defaults new rows to `new`. Grepped every `.update(` and `.insert(` call
site touching `prospects.status` in the codebase — none ever wrote
`cancelled`. Net effect: an application that goes stale (spam, duplicate
submission, the business changes its mind before paying, or the admin
simply decides not to pursue it) had no way to leave the pipeline short of
sitting in `new`/`reviewing`/`approved` indefinitely or a raw DB edit. Same
declared-value-never-written root cause as (130)-(135), a fifth subsystem
(platform-level prospect intake, not a tenant-scoped table).

Checked fallout before adding the branch: the only other consumer of
`prospects.status` is the public intake route's slot-collision check
(`.in('status', ['approved','paid'])` in `src/app/api/prospects/route.ts`),
which already correctly excludes anything not `approved`/`paid` — a
`cancelled` row won't block a new applicant from claiming that trade × zip,
which is the right behavior, not a fix needed here.

**Fixed** — added `action: 'cancel'` to the PATCH route (`updates.status =
'cancelled'`, same minimal shape as the existing `review` branch, no reason
field since the schema has none). Wired a "Cancel" button on
`/admin/prospects`: shown alongside Approve/Reject for `new`/`reviewing`
rows, and alongside the existing "Copy link" button for `approved` rows (an
admin who approved and sent a checkout link but the prospect never pays can
now retire it instead of it sitting `approved` forever). Also added the
missing `Cancelled` option to the status filter `<select>` — it was
absent even though the badge color existed, so the new status would have
been unreachable via the page's own filter tool the moment it existed.

5 new tests (`route.actions.test.ts` — this route had zero prior test
coverage of any kind, same starting point as (132)'s cleaner-applications
route): `cancel` persists the literal `cancelled` status; `review` persists
`reviewing` (see (137)); an unrecognized action is rejected with 400 before
any DB write; an unknown prospect id 404s; a caller without a valid admin
token is rejected before any DB write. Mutation-verified the `cancel`
branch (swapped the persisted literal to a wrong value, the status-assertion
test went RED for the expected reason, restored, GREEN). `tsc --noEmit`
clean, full suite 432/432 files, 2071/2071 tests, zero regressions (same
pre-existing, unrelated `tenant-scope` guard warning on
`src/app/api/fixture/route.ts`, not touched here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (137) Continuing (136)'s surface — the route's own `action:'review'` branch had already existed with zero UI trigger, so an admin could never flag "still deciding" without prematurely approving, rejecting, or now cancelling

While fixing (136), noticed `PATCH /api/admin/prospects/[id]` already
supported `action:'review'` (→ `status:'reviewing'`) — `STATUS_COLORS` and
the filter dropdown both already treat `reviewing` as a first-class state.
But grepping `admin/prospects/page.tsx`'s own `act()` call sites, only
`'approve'` and `'reject'` were ever fired from a button — no code path
ever called `act(id, 'review')`. An admin who wanted to sit with an
application longer (checking territory availability, waiting on another
prospect's slot to free up) had no way to distinguish it from an
application nobody had opened yet — both stayed `new`. Same declared-but-
unreachable shape as (133)'s `reviewed` cleaner-application status and
(131)'s waitlist states: a backend branch that already existed with no
button wired to fire it.

**Fixed** — added a "Mark Reviewing" button next to Approve/Reject, shown
only for `status === 'new'` (a `reviewing` row already shows
Approve/Reject/Cancel, so a second "Mark Reviewing" there would be a
no-op button, not offered). No new backend code — reuses the same PATCH
action (136) already added test coverage for.

Covered by the same (136) test file: the `review` branch test doubles as
this item's backend coverage (no separate frontend test framework wired for
this page — it had none before this round, matching (135)'s note about the
finance close page). `tsc --noEmit` clean, full suite 432/432 files,
2071/2071 tests, zero regressions.

Noticed, not fixed: `prospects.reviewed_by` (UUID) is a declared column
that's never written by any code path, including (136)/(137)'s new
branches — the super-admin auth system is a single global PIN
(`ADMIN_PIN`/`ADMIN_TOKEN_SECRET`) that mints a `role:'super_admin'` token
with no per-admin identity, so there's no UUID to stamp it with yet. Fixing
this for real needs a multi-admin-user identity system, not a one-line
write — out of scope for a file-only round, flagging rather than faking a
value.

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.

## (138) `invoices.status = 'refunded'` fully declared, never written

CHECK constraint on `invoices.status` names `'refunded'` as a valid value,
the invoices list page's `STATUS_COLORS` map already has a badge for it,
`invoice_activity`'s `event_type` union already includes it, and
`DELETE /api/invoices/[id]`'s own error message already tells the caller to
"refund first" — but grepping every insert/update site under
`src/app/api/invoices/**` and `src/app/api/webhooks/stripe/**` found zero
code paths that ever set `status: 'refunded'`. A paid invoice that needed
reversing (Zelle/cash/check returned outside Stripe, or just closing out
manually) had no route to do it through — the only escape hatch was voiding,
which is a different lifecycle state with a different meaning (never
collected vs. collected-then-returned) and the DELETE route's own guard
explicitly refuses that substitution.

**Fixed** — added `POST /api/invoices/[id]/refund`: reverses the payment
rows that funded `amount_paid_cents` (`status → 'refunded'`), flips the
invoice to `status:'refunded'` with `amount_paid_cents:0` (the recompute
trigger on `payments` only ever drives status to `paid`/`partial`, never
`refunded`, so the explicit invoice write is required regardless of that
trigger), logs an `invoice_activity` row, and posts the GL reversal via the
same `postRefundToLedger()` the Stripe webhook path already uses. Wired a
"Refund" button on the invoice detail page (shown once anything is paid and
the invoice isn't already void/refunded) and added the missing `Refunded`
tab to the list page's status filter — same "badge existed, filter option
didn't" gap as (136)'s prospects `Cancelled` filter.

7 new tests (`route.test.ts` — zero prior coverage): flips invoice +
payment + writes activity on a full refund; posts the ledger reversal;
rejects an invoice with nothing paid; rejects double-refunding an
already-refunded invoice; rejects refunding a voided invoice; 404s on an
unknown id. `tsc --noEmit` clean.

## (139) Continuing (138)'s surface — Stripe-initiated refunds never touched the invoice/payment row either

The `charge.refunded` Stripe webhook handler already called
`postRefundToLedger()` on a refund, so the GL was correctly reversed — but
exactly like (138), it never touched the linked invoice or payment row.
A customer refunded directly through Stripe (not through the new (138)
route) left the invoice permanently stuck at `'paid'`, no `Refunded` badge,
invisible to the new filter tab, and `amount_paid_cents` still showing the
refunded money as collected — silent state drift between the ledger (source
of financial truth) and the invoice UI (what an operator actually looks at).

**Fixed** — on a full-charge refund only (`charge.amount_refunded >=
charge.amount`; a partial refund of one charge has no clean single-payment-
row representation and is intentionally left to the ledger, same reasoning
as (138)'s void/refund distinction), the webhook now calls a new
`markInvoicePaymentRefunded()` in `lib/invoice.ts`: flips the funding
payment row to `refunded`, recomputes the invoice's remaining paid total
from `payments` directly, and flips the invoice to `refunded` only if that
total is now zero (so a second, still-active payment on the same invoice
correctly blocks the flip). `tenantFromPaymentIntent()` extended to also
return `paymentId`/`invoiceId` so the webhook has what it needs without a
second round-trip query.

**Caught and fixed a real bug in my own first pass before landing this**:
the initial version decided whether to flip the invoice by re-reading
`invoices.amount_paid_cents` after marking the payment refunded, trusting
that a real Postgres trigger (`invoices_recompute_paid`, migration
`027_invoices.sql`) had already zeroed it as a side effect of the payment
update. That trigger is real and does fire synchronously against a live
Supabase connection — but `fake-supabase.ts` (this repo's test double) does
not simulate DB triggers at all, so the new test went RED
(`expected 'paid' to be 'refunded'`) the moment it ran: the invoice's
`amount_paid_cents` never actually left the fake's seeded 20000, so the
zero-check never fired and the flip never happened. Rewrote the function to
recompute the paid total explicitly from a fresh `SUM` over `payments`
instead of depending on the trigger's invisible side effect — same
result in production, but no longer silently coupled to a side channel
this file never mentions, and now actually verifiable in tests. Lesson for
the pattern: a fix that "should work in prod" because of a DB trigger the
test double doesn't model is unverified, not done, until the test that
exercises it actually goes green.

4 new tests (`route.refund-invoice-flip.test.ts`): flips invoice + payment
+ writes activity on a full-charge refund; still posts the ledger reversal
(pre-existing behavior, unaffected); leaves the invoice/payment alone on a
partial refund of a single charge; does not touch anything when the
payment intent has no linked `invoice_id` (a booking-only payment, most
Stripe traffic today). `tsc --noEmit` clean, full suite 434/434 files,
2082/2082 tests, zero regressions (same pre-existing, unrelated
`tenant-scope` guard warning on `src/app/api/fixture/route.ts`, not touched
here).

Reconcile-gate lane (this worker's other standing lane): the tenant-config
reconcile token env var is still absent this session — skipped cleanly per
standing rule, no reconcile-gate work this round.
