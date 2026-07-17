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

**Not fixed, noticed but out of scope for this pass** (same class, lower
confidence or bigger lift):
- `cleaner_pay_rate` (createForm, the per-job tech pay-rate field on the
  "New Booking" modal) — not a naming mismatch, `POST /api/bookings`'s
  `validate()` allowlist doesn't accept ANY per-job pay-rate field at all,
  under any name. Needs a schema/endpoint decision, not a rename.
- `POST /api/bookings/batch` doesn't accept `team_size`/extra-crew fields
  at all (only the single `team_member_id` lead) — multi-worker jobs can
  only get extra crew assigned via a follow-up edit, not at initial
  creation. Missing feature, not a bug.
- Batch series edits ("apply to all future bookings") silently drop
  `service_type` and `recurring_type` changes — `BATCH_UPDATE_FIELDS` in
  `/api/bookings/batch-update` only allows `service_type_id`, not the plain
  `service_type` text field the edit form actually sends. Same bug class as
  this section, not yet verified/fixed.

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
