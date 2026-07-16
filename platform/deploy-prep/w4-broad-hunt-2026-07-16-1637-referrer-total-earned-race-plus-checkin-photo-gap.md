# W4 broad hunt — 2026-07-16 16:37 ET

Course-correction round per leader's 14:37 order: last several rounds were bug-fixes only, so this round explicitly carries a gap/fluidity item alongside the bug finding — not letting that track go quiet.

## 1. BUG (found, migration-only prepared — not wired into routes yet)

**`referrers.total_earned` is a lost-update race, not an atomic increment.**

Two call sites do the same read-then-write:

- `src/app/api/team-portal/checkout/route.ts` (line ~163, NYC Maid cleaner-checkout path)
- `src/app/api/referral-commissions/route.ts` (line ~145, admin/manual commission creation)

Both do:
```ts
const { data: ref } = await ...select('total_earned')...
await ...update({ total_earned: (ref.total_earned || 0) + commissionCents })
```

The underlying ledger is safe — `referral_commissions` has `UNIQUE(booking_id)`, so each commission row is idempotent per booking (verified via `route.commission-race.test.ts`, which covers the duplicate-*insert* race and confirms it returns 409 not a dup row). But `total_earned` is a separate denormalized running total read from a stale in-memory value fetched earlier in the request. If the same referrer earns commissions on two *different* bookings that complete concurrently (a normal shape for a busy affiliate, not a rare edge case), both requests can read the same starting `total_earned` before either writes — the second write clobbers the first's increment instead of adding to it. Net effect: the referrer's displayed lifetime earnings (referrer portal pages, `referral_converted` admin notification, referrer email) silently undercounts. No ledger corruption, just a wrong rollup number a real referral partner sees.

Verified against actual code (both call sites read + confirmed identical pattern), not inferred.

**Not fixed in route code this round** — same reasoning I've applied consistently today to other DDL-gated races (late-check-in, confirmation-reminder, payment-followup-daily): a reorder-only shortcut doesn't close a lost-update window, and referencing an undefined RPC before the migration is approved+applied would break every checkout and every manual commission creation outright. Instead, mirrored the exact pattern this codebase already used once for the identical problem class — `cpa_token_bump_usage` (migration 039, atomic `UPDATE ... SET x = x + n` RPC) — as a new `referrer_bump_total_earned(p_referrer_id, p_amount_cents)` function.

Prepared: `src/lib/migrations/2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql` (docs-only, not applied). Once approved+run, both call sites should swap their `.update({ total_earned: ... })` for `.rpc('referrer_bump_total_earned', { p_referrer_id: ref.id, p_amount_cents: commissionCents })`.

## 2. GAP/FLUIDITY (new finding, not previously reported)

**No photo/proof-of-work capture anywhere in the check-in/check-out flow.**

Read both `src/app/api/team-portal/checkin/route.ts` and `.../checkout/route.ts` in full, plus grepped for `photo` across `src/app/api/team-portal/*` and `bookings`-related migrations: zero hits. Check-in accepts only `booking_id, lat, lng`; checkout accepts only `booking_id, lat, lng, payment_method`. There is no `photo_url` / before-after image column on `bookings`, and no upload endpoint for job-completion evidence (the only existing upload endpoint in team-portal is `video-upload`, unrelated — used elsewhere, already hardened for URL injection in a prior session).

This is a distinct gap from my earlier-reported (13:01) junk-removal *quote-photo* gap (client-side, load-size self-report at quoting time). This one is team-side, at job completion, and matters most for exactly my archetype: dumpster placement/pickup (proof the unit was actually placed at/removed from the right spot, dispute prevention for property damage claims), junk removal (before/after proof of what was hauled, protects against "you didn't take everything" disputes), and moving (proof of item condition at pickup/drop-off, the single most common source of moving-company damage claims industry-wide). Competitors in all three trades commonly require photo evidence at checkout; this platform currently has no way for a team member to attach one, and no way for a client/admin to see one if a dispute arises.

Not fixed this round (net-new column + upload flow + storage/RBAC design, out of proportion for an end-of-loop patch) — flagging as a concrete, verified gap for a future planned pass.

Prior fluidity/gap items (13:01 feature-gap report + 13:26 UX-friction report) unchanged and still open: HR/compliance trade-dimension, multi-touch session template for delivery+pickup, junk-removal quote photos, quote/booking button-labeling ambiguity, no auto-navigate after job creation, no one-click delivery+pickup pair, crew picker not defaulting to last visit, flat catalog line items with no trade fields (rental days/overage/weight tier).

tsc not run — no application route code changed this round (migration SQL only + this report). File-only, no push/deploy/DB.
