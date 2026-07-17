# Gap: recurring-service bookings never carry `referrer_id` — referral commission is structurally impossible on any recurring series

**For:** Jeff (product decision), then whoever implements.
**From:** W1, 09:05 order item (2), fresh-ground.
**Status:** flagging, NOT fixing — this depends on undocumented referral-commission business intent, not a clear-cut bug.

## What I found

`bookings.referrer_id` is the ONLY field `team-portal/checkout`'s referral-commission
logic reads (`src/app/api/team-portal/checkout/route.ts:156` — `if (booking.referrer_id
&& updatedPriceCents > 0)` — no fallback to any client-level field). Grepping every
`referrer_id:` WRITE across the codebase, exactly 3 routes ever set it on a booking:

- `POST /api/client/book` (one-off self-service booking)
- `POST /api/client/collect` (client-facing payment collection creating a booking)
- `POST /api/portal/collect` (portal payment collection creating a booking)

All 3 resolve it the same way: `if (body.ref_code) { look up referrers by ref_code,
set referrerId }`, then write `referrer_id: referrerId` on the new booking row. None of
them fall back to an already-stored `clients.referrer_id` if `ref_code` isn't on *this*
particular request — so today, even a manual repeat one-off booking only earns
commission if the client (or the front-end) re-sends `ref_code` on that specific call.

**Every recurring-series booking-creation path — 4 of them — never touches
`referrer_id` at all, not even the FIRST occurrence:**

- `POST /api/admin/recurring-schedules` (staff manual setup) — insert rows have no `referrer_id` field.
- `POST /api/client/recurring` (client self-service recurring signup — gated on ≥1 prior completed booking, so the client necessarily already went through `client/book` at least once) — no `ref_code`/`referrer_id` handling anywhere in the route.
- `src/lib/sale-to-recurring.ts` (`createRecurringSeriesFromQuote`, the quote→recurring-series conversion used by quotes/accept, webhooks/stripe deposit payment, and deals/stage close-to-Sold) — insert rows have no `referrer_id` field; quotes don't even carry a `referrer_id`/`ref_code` column to source one from.
- `GET /api/cron/generate-recurring` (the weekly refill that generates the bulk of a series' lifetime bookings) — insert rows have no `referrer_id` field, and `recurring_schedules` itself has no `referrer_id` column to carry forward even if the initial batch had set one.

Net effect: **a referred client who converts to any recurring service (weekly/biweekly/
monthly cleaning etc.) generates zero referral commission on zero visits of that
series, forever** — not "commission stops after the first batch," but "commission
was never possible on a single recurring visit," including the very first one, even
when the client came in through a real, active referral link.

## Why I'm not just fixing this

Two materially different designs are both plausible, and I can't tell which one is
intended from the code:

1. **One-time-acquisition commission** (current apparent behavior for one-off
   bookings too, since repeat one-off bookings without a re-sent `ref_code` also miss
   commission): the referrer is paid once, for the specific booking action that came
   through the link. Under this reading, a recurring service's bookings never
   qualifying isn't a bug — recurring bookings are system/cron-generated, not a
   "referred action" at all, and the model already works this way for manual repeat
   one-off visits.
2. **Per-visit/lifetime commission**: the whole point of `referral_commissions`
   having a `UNIQUE(booking_id)` dedup key (not a per-referrer or per-client cap) is
   to support the referrer earning on *every* booking a referred client generates —
   under this reading, recurring series (arguably the highest-value referred clients,
   since they're the ones who converted to a standing contract) are the biggest
   silent leak: a referred client's very first sign-up commission is fine, but 100%
   of their recurring lifetime value pays the referrer $0.

Guessing wrong here has real money on both sides — either underpaying referral
partners on exactly the clients most worth rewarding (recurring/high-LTV), or (if I
"fix" it toward always propagating `clients.referrer_id` and design #1 was actually
intended) creating a payout obligation product/finance never signed up for. Same
shape of call as the Selena SMS weekly/monthly auto-recurring question flagged
08:55 — a real product question, not a guessable bug fix.

## What it would take to close, once the design is confirmed

If Jeff confirms **design 2 (per-visit/lifetime)** is intended:
- Add a `clients.referrer_id`-lookup fallback in `team-portal/checkout`'s commission
  block (`booking.referrer_id ?? client-level referrer_id`) — single point of change,
  retroactively covers every existing/future recurring booking with no backfill
  needed (computed at checkout time, not at booking-creation time).
- Optionally also propagate `referrer_id` explicitly onto the 4 recurring-series
  insert paths for consistency/reporting (`referrers/analytics`'s "bookings referred"
  count currently reads `booking.referrer_id` directly, so it would still undercount
  recurring visits unless this is set at write time, not just read-time-falled-back at
  checkout).

If Jeff confirms **design 1 (one-time-acquisition)** is intended: no code change,
just confirms this doc's finding is expected behavior, not a gap.
