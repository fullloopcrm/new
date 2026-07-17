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
