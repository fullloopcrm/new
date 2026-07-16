# W4 — Archetype depth (dumpster/junk/moving) + a real quote-acceptance bug found while verifying it

## 1. Real bug fixed: public quote acceptance stores `bookings.price` 100x wrong (or crashes)

Found while actually running the deepened archetype sim end-to-end (not inferred — reproduced the
crash, traced it, fixed it, re-ran clean). `bookings.price` is documented and used everywhere in the
app as **cents** (`src/app/dashboard/page.tsx:8` — "bookings.price is stored in CENTS"; every display
site does `(booking.price / 100).toFixed(...)`). Two conversion paths, both reachable from the
customer-facing `POST /api/quotes/public/[token]/accept` endpoint, divided by 100 before inserting:

- `src/lib/sale-to-booking.ts:113` (single-booking quote conversion):
  `price: quote.total_cents ? (quote.total_cents as number) / 100 : null` — fixed to store
  `total_cents` directly.
- `src/lib/sale-to-recurring.ts:148` (recurring-series quote conversion, generates up to ~7 weeks of
  bookings per acceptance): `pricePerVisit = ((quote.total_cents as number) || 0) / 100` — same fix,
  same file line 194 (`price: pricePerVisit`) inherits the fix.

Real-world impact, live today until this is deployed:
- **Crash**: whenever `total_cents / 100` isn't a whole number — true for essentially any quote with
  tax applied (e.g. 8.875% NYC tax practically guarantees a non-round total) — the INSERT throws
  `invalid input syntax for type integer`, and the customer's public "Accept Quote" click fails with
  a 500. `createJobFromQuote` (the third sibling, used for Job/multi-touch conversions) doesn't set
  `price` on its bookings at all, so multi-touch quotes were unaffected — only single-booking and
  recurring conversions hit this.
- **Silent corruption when it doesn't crash**: on the rare quote whose total happens to be a whole
  dollar amount (e.g. $604.00), the insert succeeds but stores the price 100x too small (a $604 job
  stored as `price = 604`, displayed everywhere as $6.04) — wrong revenue on that booking in the
  admin calendar, bookings list, client "total spent," finance P&L, and CSV exports.

Verified: reproduced the exact crash via the sim (see below), traced to these two lines, confirmed
`bookings.price` is cents-denominated via `dashboard/page.tsx`'s own comment and ~15 display sites
that all divide by 100, confirmed the sibling `POST /api/admin/recurring-schedules` route passes
`price` through raw with no conversion (same convention), applied the one-line fix to both files,
confirmed `npx tsc --noEmit` clean (no new errors — 3 pre-existing errors in unrelated files
untouched), confirmed `sale-to-booking-race.test.ts` + `sale-to-recurring-race.test.ts` (7 tests)
still pass, then re-ran the full archetype sim end-to-end and confirmed the crash is gone.
**Fixed, not just proposed** — this is a code change (not a DB write/migration), consistent with
other code-only fixes committed this session; no prod DB action needed or taken.

## 2. Archetype depth — three new scenarios in the shared sim harness

Per leader order to continue deepening dumpster/junk/moving coverage
(`~/flwork-sim/platform/scripts/sim-archetype-scenarios.ts`, the shared harness dir per the earlier
redirect). Added three scenarios targeting gaps the earlier feature-gap audit
(`w4-broad-hunt-2026-07-16-1255-...md`) flagged as never actually exercised:

- **Dumpster mid-rental swap** (3-touch: delivery → swap → pickup). `src/lib/jobs.ts`'s own header
  comment calls out "delivery, pickup, and/or a swap" as the Job model's intended shape, but the
  existing sim coverage (and, per the audit, the real staff-facing UI) only ever exercised 2 touches.
  This scenario is the first to actually drive a 3-touch Job through the sim.
- **Junk removal hazardous/regulated item disposal** (paint/motor-oil + tire disposal fees as two
  separate upcharge lines on the same job) — a realistic edge case for this archetype that wasn't
  covered before (previous coverage was a single generic "extra volume" upcharge).
- **Moving with overnight storage-in-transit** (2-touch Job: load & store, then deliver days later).
  This is the first time the multi-touch Job primitive has been exercised on a **non-dumpster**
  trade — previously only ever verified for dumpster, so "the Job model generalizes across
  archetypes" was an assumption, not something actually tested.

To support the swap/storage scenarios without duplicating the dumpster-specific delivery+pickup
code, generalized the multi-touch branch in `runScenario` from a hardcoded 2-session (delivery,
pickup) shape to a data-driven `touches: Array<{dayOffset, label}>` list on each scenario, looped
generically. This also let scenario 6 (moving) reuse the exact same code path as dumpster, which is
the point — it's testing that the primitive isn't secretly dumpster-only.

Also changed `extraFeeLine` (singular) → `extraFeeLines` (array) across all 6 scenarios so a job can
carry more than one real-world post-service upcharge (needed for the hazardous-disposal and
mid-rental-swap scenarios, which each have two distinct fee lines).

### Two harness-only bugs found and fixed while verifying (not product bugs — data/logic local to the sim script)

- **`extraFeeLines` entries were missing `quantity`.** `normalizeLineItems` (the real product function,
  `src/lib/invoice.ts`) does `Number(li.quantity) || 0`, so an upcharge line with no `quantity`
  silently contributes **zero** to the invoice subtotal — the "invoice: post-service upcharge
  reflected in the total" check was failing on **every** scenario, including the original 3 I didn't
  touch, meaning this check had never actually passed before. Root cause was in the test data (this
  scenario file), not the product function's reasonable default. Fixed by adding `quantity: 1` to
  every extra-fee-line entry.
- **`slugify()`'s tenant-slug suffix was deterministic, not unique.** It took `id.slice(0, 6)` from a
  `runId` shaped `arch-${idx}-${timestamp36}-${hex4}` — the first 6 characters of that string are
  always exactly `"arch-N"` for a given scenario index, discarding the actual timestamp/random
  entropy that was supposed to make each run's slug unique. Any two runs of the same scenario index
  collide on `tenants.slug` (unique constraint) — hit this directly mid-verification (a leftover
  tenant from an earlier run blocked a rerun with `duplicate key value violates unique constraint
  "tenants_slug_key"`). Fixed by taking `id.slice(-8)` (the tail, which actually varies) instead.

### Verification

Wrote a throwaway standalone runner (not part of `sim-all-trades.ts`, which has unrelated in-flight
uncommitted edits I didn't touch) that calls `runArchetypePhase` directly against the same Supabase
project this worktree uses. Before the price-cents fix: 2 of 6 scenarios FATAL'd with the integer-cast
crash (reproducing the real bug above), the other 4 all failed the same invoice-upcharge check (the
missing-`quantity` issue). After both fixes: **all 6 scenarios pass clean, 156/156 checks, 0
failures.** Deleted the throwaway runner after use; each scenario's tenant row is cleaned up by the
existing `finally` block (verified no `sim-arch-%` tenant rows left behind after the final run).

`npx tsc --noEmit` on the sim repo's `sim-archetype-scenarios.ts` is clean.

## Files touched

- `platform/src/lib/sale-to-booking.ts` (this worktree) — real fix, one line.
- `platform/src/lib/sale-to-recurring.ts` (this worktree) — real fix, one line.
- `~/flwork-sim/platform/scripts/sim-archetype-scenarios.ts` (shared sim harness, separate repo,
  never git-tracked there before this — pre-existing untracked working file) — 3 new scenarios +
  generalized multi-touch + the two harness-bug fixes above.
- `~/flwork-sim/platform/src/lib/sale-to-booking.ts` / `sale-to-recurring.ts` (shared harness repo) —
  same one-line fix applied locally there too so the sim's own copy of these files isn't running
  the stale buggy version; that repo is on an older/divergent branch (`sim/trade-simulation-2026-07-08`,
  missing an atomic-claim race fix present in this worktree's copies) so I did not attempt to sync
  anything beyond this one bug fix — not this worktree, not committing there, informational only.
