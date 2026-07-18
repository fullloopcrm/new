# W1 — cron/follow-up: mark-after-send [THANKYOU_SENT] race closed with a dedicated column

**Date:** 2026-07-17 22:14 ET
**Worker:** W1 (schema + backfill lane, tenant_domains)
**Files:** file-only, no push/deploy/DB command run

## Background

Fresh-ground pass for this round. The 16:30 sweep
(`w1-cron-followup-family-sweep-2026-07-17-1630.md`) found `cron/follow-up`
had zero duplicate-send protection and fixed it with a `[THANKYOU_SENT]`
notes marker, checked before send / written after — but **explicitly
accepted the residual sent-before-claim race as a deliberate tradeoff**:
"`notes` is a free-text append field, not a nullable timestamp column, so
an atomic claim-then-send isn't expressible without a schema change."

That tradeoff is now stale. The 21:50 round (`w1-postjobfollowup-
latecheckin-claim-before-send-2026-07-17-2049.md`) established exactly the
missing piece for `post-job-followup`'s identical shape: add a dedicated
`_sent_at` timestamptz column via a file-only migration and claim on it via
compare-and-swap, same low-cost pattern already used for
`review_followup_sent_at` and `confirmation_reminder_sent_at`. Revisiting
`follow-up` with that same tool now available — **correcting the 16:30
round's "accepted, not fixable without a schema change" verdict.**

## What was broken

`cron/follow-up`'s dedup was a substring marker in `bookings.notes`
(`'[THANKYOU_SENT] <iso>'`), checked client-side against a row read earlier
in the invocation and written back AFTER `notify()` resolved. Two
independent bugs from the one design, both already-documented failure
shapes for this bug family:

1. **Race:** an overlapping invocation (manual re-trigger of this
   endpoint, or a platform-retried cron delivery) landing inside the
   `notify()` await window could read the same not-yet-marked booking and
   double-send the "thank you + 10% off" email before either write landed.
2. **Silent resend, no race required:** `notes` is in `PATCH
   /api/bookings/:id`'s allowed field list. Any admin edit to a booking's
   notes after checkout (unrelated to this cron) overwrites the whole
   field via that route, erasing the marker with zero relation to whether
   the email was actually sent — the client gets an unprompted second
   thank-you + discount code on the next 3-day-window cron pass, no
   concurrency involved.

## Fix

- New migration `2026_07_17_bookings_thank_you_sent_at.sql` — adds
  `bookings.thank_you_sent_at timestamptz`, nullable, no default (NULL is
  the permanent "not yet sent" state, same shape as
  `review_followup_sent_at` / `confirmation_reminder_sent_at`).
- `route.ts`: pre-filters the candidate query on
  `.is('thank_you_sent_at', null)`, then claims via compare-and-swap
  (`.update({thank_you_sent_at, notes: updatedNotes}).eq('id',...).is
  ('thank_you_sent_at', null).select('id')`) BEFORE calling `notify()`, not
  after. A lost claim (0 rows) skips the send. `notes` still gets the
  human-readable `[THANKYOU_SENT]` marker in the same atomic write for
  admin visibility, but it's cosmetic only — the column is the sole dedup
  source of truth and is never touched by any other route, so bug #2
  (notes-edit resurrection) is closed too.
- Distinct marker text from `post-job-followup`'s `[FOLLOWUP_SENT]` on the
  same `notes` column preserved as-is (different cron, different marker,
  unchanged from the 16:30 fix — no reason to touch it).

No DB command run — migration is a file for the leader to apply after Jeff
approves, matching every other `_sent_at` column this session.

## Verification

- Updated `route.dedup.test.ts`: existing "skip already sent" case now
  seeds `thank_you_sent_at` (not just notes text) as the gate; added a new
  case proving a later notes edit (simulating the PATCH route) does NOT
  resurrect the dedup marker — the exact bug #2 scenario above.
- New `route.claim-before-send-race.test.ts` (2 tests, `Promise.all`
  concurrency): proves the email sends exactly once under two overlapping
  invocations, and proves the claim lands in the store BEFORE `notify()`
  is called (not after) via a `notify` mock that inspects store state at
  call time.
- `npx tsc --noEmit`: 0 errors in `follow-up/route.ts` or either touched/new
  test file. Pre-existing baseline noise only, unrelated to this change
  (stale `.next` admin-auth generated types, known pre-existing
  test-signature mismatches in `cron/outreach`/`cron/payment-reminder`, and
  another worker's untracked `sunnyside-clean-nyc/_lib/site-nav.ts`) —
  none touched this round.
- `npx vitest run src/app/api/cron/follow-up/`: 2 files, 5/5 tests passed.

## tenant_domains schema lane

Reconfirmed intact, no drift — this round's fix is entirely in `bookings`,
outside that table.

## Not touched / flagged for a future round

- **`cron/sales-follow-ups`** — same select-then-insert-if-unmatched dedup
  shape (checks `notifications` inserted in the last hour for a matching
  `deal_id` in `metadata`), previously flagged in the 16:30 sweep as
  "lower blast radius, not fixed, flagged for a possible dedicated pass."
  Still true and still not fixed this round — kept in scope-of-one to
  avoid piling unrelated crons into this pass.
- **`cron/auto-reply-reviews`** — still not independently re-audited past
  the 16:30 round's note (delegates to `lib/google-reviews.ts`'s
  `autoReplyReviews()`, presumed self-dedup via "unreplied" state).
