# W4 broad-hunt — 2026-07-16 21:04

Queue (20:59 order): (1) continue cross-archetype HR/payroll/finance depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity current.

File-only, no push/deploy/DB. tsc --noEmit clean (3 pre-existing unrelated errors only: `bookings/broadcast/route.xss.test.ts`, `site/sunnyside-clean-nyc/_lib/site-nav.ts` x2 — none touch these changes).

## (1) Cross-archetype HR/payroll/finance depth — mark-paid client double-payment race

`POST /api/finance/mark-paid` (type: `'client'`) had the same TOCTOU class fixed
everywhere else this session, in a spot nobody had reached yet: it read
whether a `payments` row already existed for the booking, then inserted one +
posted revenue — but only wrote `bookings.payment_status='paid'` at the very
end, with **no compare-and-swap** on the status it read. `payments` has no
unique constraint on `(tenant_id, booking_id)` (confirmed via
`011_parity_with_nycmaid.sql` — only `stripe_session_id UNIQUE`, null for
manual payments), so two concurrent "mark client paid" requests (double-click,
two admin tabs) would both pass the `existing` check and each insert their own
payment row + post their own revenue journal entry — double-recording money
received on the P&L.

Fixed: claim the unpaid→paid transition on `bookings` atomically with
`.neq('payment_status','paid')` **before** the payment/revenue side effect,
mirroring the bank-transactions match/categorize fix already landed this
session (commit 2534f6ff). Only the caller that actually wins the claim runs
the payment insert + `postPaymentRevenue`; a losing/repeat call is now an
idempotent no-op instead of a second insert. The `'cleaner'` branch is
untouched — it's a boolean flag flip with no ledger side effect, so it stays
a plain idempotent update.

3 new tests (`route.race.test.ts`), mutation-verified (stashed the fix →
concurrent test failed with 2 payments inserted instead of 1 → restored →
green). Full finance suite 16/16 files, 42/42 tests, 0 regressions.
Commit `56e7b947`.

## (2) Fresh ground — payroll POST ignored period_start/period_end on this branch

While re-checking the payroll POST route for the same claim-race class, found
it does **not** scope the bookings claim to `period_start`/`period_end` at
all, despite destructuring both from the request body — it unconditionally
flips every `completed` booking for the team member to `'paid'`, regardless of
which period the caller is actually paying. Paying one small period silently
marks unrelated, never-actually-paid bookings from *other* periods as settled
too, permanently dropping them out of `payroll-prep`'s `status='completed'`
gross-pay window even though the crew was never paid for that work — a real
money-accuracy bug, same class as several other fixes landed today.

Note for the record: this exact bug (same root cause, same file) was already
found and fixed independently by W2 on their own branch (commit `72d23c91`,
"finance/payroll POST blind-marked ALL completed bookings paid, not just the
period being paid") — but each worker operates on an isolated git worktree/
branch (p1-w1..w4), so that fix never reached this branch's copy of the file.
Verified the bug is genuinely still present here (re-read the current file,
confirmed no period filter exists) rather than assuming W2's fix applied,
then ported the same fix independently, adapted to this branch's current
file — mirrors `payroll-prep`'s own `from`/`to` windowing (`gte`/`lte` on
`start_time`), no-period calls keep the prior blanket behavior.

2 new tests (`route.period-scope.test.ts`), mutation-verified (stashed the
fix → "leaves other periods alone" test failed with the June booking wrongly
flipped to `paid` → restored → green). Full payroll suite 5/5 files, 9/9
tests, 0 regressions. Commit `58b49b50`.

**Flag for leader/Jeff**: since each worker branch is independent, it's worth
checking whether other already-fixed-on-one-branch bugs from today's session
are still open on the other 3 branches before the eventual merge/reconcile —
this one was caught only because it happened to sit right next to a bug I was
independently investigating. Not something I can systematically check from
inside my own worktree (no visibility into what actually landed on p1-w1/w2/w3
vs what was just reported in this channel).

## (3) Gap/fluidity — re-verified, unchanged

Re-grepped (not assumed) the still-open items from prior reports:

- **HR reminder 'missing' milestone**: still not implemented. `hr-document-reminders`
  cron's own comment (line 11) confirms scope is expiry milestones only —
  `document_id` FK is `NOT NULL` so no row exists for a doc never submitted,
  design call stays with leader/Jeff, not guessed.
- **`reviewed_by_name` migration**: still proposed/unapplied
  (`src/lib/migrations/2026_07_16_hr_documents_reviewed_by_name_PROPOSED.sql`
  exists, not wired into the live PATCH route since the column doesn't exist
  in prod yet).
- **`activate-tenant.ts` fragmentation**: still true — `webhooks/stripe/route.ts`
  (re-checked directly) calls `seedChartOfAccounts` + `seedHrDefaults` +
  `provisionTenant` as separately-imported steps rather than funneling through
  `activateTenant()`, same deliberate scope decision as before (a payment
  webhook shouldn't unilaterally also trigger domain/geo/SEO registration).

No new gap/fluidity items found this round beyond the branch-divergence flag
in (2) above.

Idle, awaiting next order.
