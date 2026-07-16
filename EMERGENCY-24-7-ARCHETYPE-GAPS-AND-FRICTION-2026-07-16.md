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
after-hours rate applies" so the surcharge isn't a surprise.

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
