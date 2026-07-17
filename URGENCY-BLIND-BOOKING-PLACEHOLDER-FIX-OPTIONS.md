# Urgency-blind +3-day booking placeholder — fix options (prep doc, no code changed)

Source: LEADER 15:15 3-deep queue item (1), W3. This is prep only — file-only,
no push/deploy/DB, no behavior change applied. The actual fix is a product
call (what counts as "urgent," how far out the placeholder should land) —
this doc lays out the concrete diff options for review.

## The problem, confirmed by reading the code

`createBookingFromQuote()` (`platform/src/lib/sale-to-booking.ts:97-101`) turns
every accepted quote into a `pending` booking on a fixed **+3 calendar days,
9:00am** placeholder, unconditionally:

```ts
// bookings.start_time is NOT NULL, so a sold-but-unscheduled service can't be
// dateless. Place it on a near-future placeholder slot as 'pending' — the
// operator confirms/moves the real date. status 'pending' = needs scheduling.
const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
start.setHours(9, 0, 0, 0)
```

This runs identically whether the accepted quote is a routine estimate
scheduled a week out, or an emergency same-day accept (burst pipe, no heat) —
there is no signal anywhere in this function that distinguishes the two. It
was first flagged in the emergency-archetype sim (`scripts/sim-all-trades.ts`
P11.4/P11.13, commits `12a23f40`..`bd3e2bdf`): a plumbing/HVAC/restoration
customer who calls in an emergency, gets a same-day quote, and accepts it
on the spot still gets a booking dated 3 days out. Nothing else in that flow
currently notifies anyone urgently either (P11.10-13, already reported
separately, not addressed by this doc) — this doc is scoped to the placeholder
**date** only.

`quotes` (`platform/src/lib/migrations/026_quotes.sql`) has **no urgency /
priority / rush column today** — confirmed by reading the full migration.
Any fix has to either infer urgency from data that already exists on the
quote, or add a column.

## Option A (recommended) — infer from the accepted line item, no schema change

Every quote carries its line items (`quotes.line_items`, `[{ id, name,
description, quantity, unit_price_cents, subtotal_cents, optional, selected
}]`) and a `title`. Item (2) of this same queue adds a named "Emergency X"
tier to each emergency-prone vertical's service presets
(`Emergency Plumbing`, `Emergency HVAC`, `Storm Damage` for restoration,
`Emergency / Storm` for tree service, etc. — see
`platform/src/lib/industry-presets.ts`). When the customer's accepted quote
selects one of those tiers, that IS the existing "this is urgent" signal —
no new data needed, just read what's already selected.

```ts
// bookings.start_time is NOT NULL, so a sold-but-unscheduled service can't be
// dateless. An accepted quote whose line items select one of the tenant's
// "Emergency"-tier presets (Emergency Plumbing, Emergency HVAC, Storm Damage,
// ...) signals the customer needs same-day service — the generic +3-day
// "confirm the date" placeholder silently reschedules them past the point
// they were sold. Detect it from data already on the quote (no schema
// change) and place it on a near-term slot instead.
const lineItemNames = (Array.isArray(quote.line_items) ? quote.line_items : [])
  .map((li: { name?: string }) => li?.name || '')
const isEmergencyAccept = [...lineItemNames, quote.title || ''].some((s) => /emergency|storm damage|24\/7|after-hours/i.test(s))

const start = isEmergencyAccept
  ? new Date(Date.now() + 2 * 60 * 60 * 1000) // ~2hr out — same-day, operator still confirms/moves it
  : (() => { const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); d.setHours(9, 0, 0, 0); return d })()
const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
```

**Pros:** no migration, no other call site to touch, ships in one file.
**Cons:** regex-matches a service *name* string — renaming a preset (or a
tenant editing their own service names during onboarding, which the docstring
at the top of `industry-presets.ts` says operators do) silently breaks the
match. Also does nothing for a routine (non-Emergency-tier) quote that's
still genuinely urgent for some other reason (e.g. a same-day walk-in repair
quoted under the *regular* service call, not the emergency SKU).

## Option B — add `quotes.is_emergency` (or `urgency`), explicit column

Add a boolean (or `urgency TEXT CHECK (urgency IN ('normal','urgent'))`)
column to `quotes`, set explicitly wherever a quote is created (manual
`POST /api/quotes`, the Selena AI quote-creation path, the public
quote-request flow) rather than inferred from a name string. `createBookingFromQuote`
then just reads the flag.

**Pros:** robust to renaming, and generalizes to "urgent but not an
Emergency-tier SKU" quotes Option A can't catch.
**Cons:** real migration + touches every quote-creation call site (at least 3
found by grep: the manual quotes API, Selena's AI tool, the public
quote-request endpoint) to actually set the flag correctly — much larger
blast radius for a fix to a single scheduling placeholder. Also introduces a
second "is this urgent" definition alongside the client/book/route.ts
`bkIsEmergency` same-day heuristic that already exists for direct bookings —
worth reconciling the two rather than adding a third independent notion of
urgency.

## Recommendation

Option A for now — it's a same-file, no-migration change that fixes the exact
case the sim caught (P11.4), and doesn't block on a schema/product decision
about a general-purpose urgency taxonomy. Flag Option B as a follow-up if
product wants "urgent" to mean more than "the emergency-tier SKU was
selected."

Not applied — awaiting Jeff's call on which option (or whether to fold this
into the P11.13 dispatch-path fix, since both touch the same function).
