# closeout-summary: tip split divided by billed team_size, not actual crew (2026-07-18 10:52)

## Bug
`GET /api/admin/bookings/[id]/closeout-summary` splits an overpayment (tip)
evenly across the crew shown in `cleaner_payouts`. It computed the per-member
share as:

```ts
const tipShareCents = teamSize > 0 ? Math.floor(tipCents / teamSize) : 0
const tipShareRemainder = tipCents - tipShareCents * teamSize
```

`teamSize` here is `bookings.team_size` — a **billing multiplier** used
correctly elsewhere in this same route (`grossCents = billedHours * hourlyRate
* teamSize * 100`) to charge the client for however many people the job is
*billed* for. It is set once, either at booking creation or via
`PUT /api/bookings/[id]/team`, and is explicitly allowed to exceed the number
of `booking_team_members` rows actually assigned — that route's own comment
says the caller can set `team_size` ahead of naming every crew member (e.g.
"billed as a 3-person job, 1 named so far"), and the admin UI
(`BookingsAdmin.tsx`) only trims extras down when team_size *shrinks*; it
never forces extras up to `team_size - 1`.

`cleaner_payouts` only ever lists the crew that actually has a
`booking_team_members` row (`teamMembers`, built at line ~45). When
`teamMembers.length < teamSize` — a real, UI-permitted state, not an edge
case — the tip was divided by the larger `teamSize`, but only
`teamMembers.length` people ever appear in `cleaner_payouts` to receive a
share. The remaining share(s), sized for the unfilled "billed but
unassigned" slots, were computed and then never attributed to anyone: not
paid to the real crew, not logged, not flagged. Reproduced in the new test:
team billed for 3, only 1 crew member named, $100 tip collected — the crew
member's `cleaner_payouts[].tip_cents` came back `$33.34`, the other
`$66.66` vanished with zero trace.

## Fix (file-only, no push/deploy/DB)
`src/app/api/admin/bookings/[id]/closeout-summary/route.ts` — split the tip
across `teamMembers.length` (the crew that actually appears in
`cleaner_payouts`), not `teamSize` (the client-billing headcount):

```ts
const payoutCount = teamMembers.length
const tipShareCents = payoutCount > 0 ? Math.floor(tipCents / payoutCount) : 0
const tipShareRemainder = tipCents - tipShareCents * payoutCount
```

`teamSize` is untouched everywhere else in the route (bill math is still
correctly billed-headcount-based) — only the tip-share divisor changed. This
also fixes the inverse case (more crew assigned than billed team_size), where
the old code would have handed out MORE than the actual tip collected.

## Verification
New test file `route.tip-split.test.ts`: booking billed `team_size: 3`,
`hourly_rate: 100`, `actual_hours: 2` (gross $600), only 1
`booking_team_members` row, one $700 payment (→ $100 tip). RED-confirmed
pre-fix: `cleaner_payouts` summed to $33.34, not the full $100
`payment_totals.tip_cents`. GREEN after the fix: sums exactly.

Swept every other `tip_cents`-touching site for the same divide-by-billed-
headcount shape: `team-portal/checkout` and `team-portal/15min-alert` also
multiply by `teamSize`/`teamSizeForBilling`, but only for the client's GROSS
charge (a legitimate use of the billing headcount) — neither splits a tip
per-member. `closeout-summary` was the only per-crew-member tip-split site
in the codebase.

Full suite green, tsc clean on the touched file (pre-existing unrelated
baseline errors elsewhere, none new). File-only, no push/deploy/DB.
