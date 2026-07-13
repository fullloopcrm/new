# TOCTOU audit — W3 — 2026-07-13

Systematic sweep for the select-then-insert / select-then-update TOCTOU shape
(the same bug family as the payment races fixed earlier today), beyond
payments. Grep-scoped to files with both a `maybeSingle()`/`limit(1)`
existence-check AND an `.insert(`/`.update(` (112 candidate files), then
manually read the money/PII/capacity-relevant ones.

## Fixed (atomic claim / insert-then-catch-23505, same pattern as the stripe webhook fix)

| # | File | Severity | Bug | Fix |
|---|------|----------|-----|-----|
| 1 | `src/lib/create-tenant-from-lead.ts` | **CRITICAL** — money/billing | select-then-branch on `partner_requests.converted_tenant_id`; concurrent admin-convert + paid-proposal webhook could both create a full duplicate tenant (billing, seats, territory claim, owner PIN) | Atomic claim UPDATE on new `conversion_claimed_at` col, `WHERE converted_tenant_id IS NULL AND conversion_claimed_at IS NULL ... RETURNING`. Migration: `src/lib/migrations/2026_07_13_partner_requests_conversion_claim.sql` (not applied). Test: `create-tenant-from-lead-race.test.ts` |
| 2 | `src/lib/sale-to-booking.ts` (`createBookingFromQuote`) | **HIGH** — money, public unauth endpoint | select-then-branch on `quotes.converted_booking_id`; reachable from the public quote-accept page — double-tap/retry duplicates the booking | Atomic claim UPDATE reusing shared `converted_at` marker (same shape as `createJobFromQuote`). Test: `sale-to-booking-race.test.ts` |
| 3 | `src/lib/sale-to-recurring.ts` (`createRecurringSeriesFromQuote`) | **HIGH** — money, public unauth endpoint, biggest blast radius | same shape as #2 but duplicates a whole recurring series + up to 7 weeks of bookings | Same atomic claim pattern. Test: `sale-to-recurring-race.test.ts` |
| 4 | `src/app/api/quotes/[id]/convert/route.ts` | MEDIUM — same bug as #2, operator-authed (double-click, not public) | same select-then-branch on `converted_booking_id` | Same atomic claim pattern. Test: `route.race.test.ts` |
| 5 | `src/app/api/finance/bank-transactions/[id]/match/route.ts` | **HIGH** — money | read `txn.status` at top, payment INSERT + status update many lines later; two concurrent match requests on the same txn could both insert a payment (double revenue / double-marks a booking or invoice paid) | Atomic claim UPDATE (`status NOT IN (matched,posted)`) before any payment/journal side effect; explicit revert-the-claim path if the target doesn't resolve (client error, not the race). Test: `route.race.test.ts` |
| 6 | `src/lib/ledger.ts` + `post-revenue.ts` + `post-adjustments.ts` + `post-labor.ts` | **HIGH** — money, whole ledger spine | `journalEntryExists()` SELECT backed only by a non-unique index; 9 call sites (payment revenue incl. backfill loop, deposit, refund, chargeback, commission accrual, commission paid, labor payout/payroll) could all double-post on a concurrent retry | New UNIQUE index `idx_journal_entries_source_unique` makes the RPC insert the atomic guard; all 9 sites catch 23505 via new `isUniqueViolation()` helper. Migration: `2026_07_13_journal_entries_source_unique.sql` (not applied — **needs a pre-apply check for existing duplicate (tenant,source,source_id) rows**, since the index creation will fail if any already exist). Test: `post-revenue-race.test.ts` |

All six verified: `npx tsc --noEmit` clean, full repo suite green (115 files / 812 tests) after each fix.

## Checked — NOT vulnerable (has a DB-level backstop already)

- **`src/app/api/referral-commissions/route.ts` POST** — looks like the same shape (select existing commission by `booking_id`, then insert), but `referral_commissions` already has `UNIQUE (booking_id)` (migration `019_referral_commissions.sql`). A concurrent duplicate insert already 23505s at the DB level — no double commission row is possible. Gap: the loser currently falls into the generic catch-all and returns a bare 500 instead of a friendly "already exists" — cosmetic, not a correctness bug. Not fixed (not a real race); flagging in case a friendlier error response is wanted later.
- Also worth noting: `referral_commissions.total_earned` / `referrers.total_paid` are updated via non-atomic read-modify-write (`(ref.total_earned || 0) + commission`) in the same route — a **lost-update** risk (different bug family: two concurrent commission postings for the *same referrer* on *different* bookings could race this increment and lose one). Out of scope for this TOCTOU sweep but worth a follow-up if referral volume grows.

## Flagged — real gap, not fixed (needs a product/schema call, not just a code change)

- **`src/app/api/client/verify-code/route.ts`** — MEDIUM. Two bugs stacked: (1) the one-time code is checked via SELECT then burned via a separate DELETE — a double-tap on "verify" can race both requests past the check before either delete lands; (2) worse, the client-lookup-then-create block (`if (!client && email) { insert clients... }`) has no unique constraint on `(tenant_id, email)` backing it — the `clients` table isn't in the tracked migrations (created out-of-band) and the existing code's own "pick the oldest of possibly-multiple email matches" logic implies duplicate-email clients are already a tolerated/expected state in this schema. A real double-tap (not just a malicious replay) can create two client rows for one signup. **Not fixed** — adding a unique constraint here is a schema decision (could break tenants that already have legitimate duplicate-email clients) that needs a call from Jeff/leader, not a unilateral fix.
- **`src/app/api/team-portal/jobs/claim/route.ts`** — LOW/MEDIUM. The job-assignment itself is already atomic (`UPDATE ... WHERE team_member_id IS NULL ... RETURNING`, correctly race-safe). But the *daily-cap* check just above it (`count` of today's bookings vs `max_jobs_per_day`) is read-then-decide with no atomic backstop — two near-simultaneous claims from the same member could both pass the cap check and claim one job over the cap. Not money, not data corruption — worst case a member ends up with cap+1 jobs in a narrow race window. Not fixed; lowest priority of everything found.

## Scope note

This was a manual read-through of the highest-priority candidates (money movement, capacity limits, one-time tokens, tenant/account creation) out of 112 grep-matched files, not an exhaustive line-by-line pass over all 112. Files not covered: cron/* backfill jobs (mostly single-threaded batch, lower concurrent-race likelihood), seo/* ingest paths, chat/selena tool-calling paths, and the various `site/<tenant>/_lib` per-site helpers. Flagging in case leader wants a deeper pass on any of those.
