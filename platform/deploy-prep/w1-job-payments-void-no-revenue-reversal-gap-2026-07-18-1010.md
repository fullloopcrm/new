# Voiding a paid job_payment never reversed its posted revenue (2026-07-18 10:10)

## Bug
Continuation of the job_payment revenue-posting surface a recent pass on
this session opened (`postJobPaymentRevenue` in `src/lib/finance/post-revenue.ts`,
wired into `PATCH /api/jobs/[id]/payments`'s 'paid' transition). That pass
closed the "money never posts" gap; it never touched the other side of the
same state machine: `PATCH /api/jobs/[id]/payments` lets `status` flip from
`paid` straight to `void` with **zero** reversal, unlike every sibling
money-reversal path in this codebase (`charge.refunded` in
`webhooks/stripe/route.ts` reverses via `postRefundToLedger`;
`charge.dispute.closed` reverses a won chargeback via
`postChargebackReversalToLedger`; `invoices/[id]` DELETE outright *refuses*
to void an invoice with `amount_paid_cents > 0`, forcing a refund instead).

Concretely: operator marks a Jobs/Projects payment-plan line (deposit /
progress / final / milestone) 'paid' → `postJobPaymentRevenue` posts DR 1050
/ CR 4000. Operator later corrects a mistake (wrong amount entered, payment
never actually cleared, duplicate line) by marking it 'void' → the route
just flipped `job_payments.status` to `'void'`, full stop. The journal entry
stays posted forever with nothing explaining why — the P&L/trial balance
permanently overstates revenue for money the payment plan itself no longer
claims was received, with zero visibility (no admin_task, no ledger trail,
nothing) unless someone manually reconciles `job_payments.status` against
`journal_entries.source = 'job_payment'`.

Same route also had **no CAS** on the status transition at all — unlike
every other status-transition route touched this session (`jobs/[id]`,
`sessions/[sessionId]`, `invoices/[id]`, `quotes/[id]`), the write here was a
blind `.update({status}).eq('id', payment_id)` with no re-assertion of the
status the caller actually read. A concurrent status change (a second click,
another admin editing the same payment plan) landing between the read and
the write would be silently clobbered instead of surfaced as a conflict —
e.g. a 'void' landing between another request's read and its own
'paid'-write could resurrect a voided line back to 'paid' and re-post
revenue nobody meant to re-post.

## Fix (file-only, no push/deploy/DB)

**Reversal — `reverseJobPaymentRevenue` (`src/lib/finance/post-revenue.ts`):**
New function, same spine as `postRefundToLedger` (DR 4000 / CR 1050, the
mirror image of `postJobPaymentRevenue`'s DR 1050 / CR 4000). Keyed under a
distinct source (`'job_payment_void'`) so it can never collide with, or be
mistaken for a duplicate of, the original entry (`'job_payment'`). Only
reverses when the original entry actually exists (`journalEntryExists(...,
'job_payment', id)` guard) — same "no orphan reversal" discipline as
`postChargebackReversalToLedger` — so voiding a payment that went
`invoiced → void` without ever being paid (the common case) posts nothing.
Idempotent via the same `journalEntryExists` + `post_journal_entry` RPC
unique-constraint pattern as every other posting function in this file — a
double-void can't double-reverse.

**Wiring — `PATCH /api/jobs/[id]/payments`:** on a `void` transition where
the pre-read status was `paid`, calls `reverseJobPaymentRevenue` with the
same best-effort/never-fails-the-status-flip contract already used for the
'paid' → `postJobPaymentRevenue` call (try/catch, `console.error` on
failure, status flip still returns 200).

**CAS:** the route now reads `current.status` first and re-asserts it in the
update's own WHERE (`.eq('status', oldStatus)`), returning 409 on a
mismatch — same archetype as every sibling status-transition route this
session. A resend of the same status (double-click) still matches its own
WHERE and succeeds as a no-op, same as the sibling routes' behavior.

No new migration needed — this is app-layer-only (no schema change), unlike
the entities/is_default pass earlier today.

## Tests
- `src/lib/finance/post-revenue.job-payments.test.ts` (+3 tests): posts
  DR 4000 / CR 1050 keyed `job_payment_void` when a real original entry
  exists; no-ops (`no_original_entry`) when the payment was never actually
  posted; idempotent — reversing twice creates exactly one reversal entry.
- `src/app/api/jobs/[id]/payments/route.revenue.test.ts` (+7 tests, 2 new
  `describe` blocks):
  - CAS: 404 on an unknown payment_id; 409 when a concurrent write (injected
    right after the route's own read, same fire-once-after-read convention
    as `team-portal/jobs/reassign/route.race.test.ts`) already moved the row
    off the status this request read — concurrent winner's state verified
    to survive untouched; no-regression case with no concurrent writer.
  - Reversal: paid→void posts exactly one `job_payment_void` entry;
    void-without-ever-being-paid posts nothing; re-voiding an already-void
    payment doesn't double-reverse; a reversal RPC failure doesn't fail the
    status flip itself (mirrors the existing 'paid'-side failure test).
- RED-confirmed: `git stash`'d both source files (route.ts,
  post-revenue.ts) and re-ran the new tests — the 3 tests that exercise the
  actual fix failed for the exact predicted reasons (409 test got 200 back;
  both reversal-entry-count tests got 0 instead of 1), the 8 pre-existing
  tests still passed unchanged. Restored via `git stash pop`, all 11 green.
- `src/app/api/jobs/[id]/payments/route.revenue.test.ts` +
  `src/lib/finance/post-revenue.job-payments.test.ts` + every other file
  under `src/lib/finance/` and `src/app/api/jobs/`: 17 files, 131/131 tests
  green, 0 regressions.
- Full suite: 683/683 files, 3523 passed + 1 pre-existing expected-fail, 0
  regressions.
- `tsc --noEmit`: clean on both touched files (4 pre-existing unrelated
  errors elsewhere — stale `.next` admin-auth types, 2 pre-existing cron
  test-file type errors, the known `sunnyside-clean-nyc/site-nav.ts` gap
  already flagged by another worker — none reference the touched files).

## Swept for more siblings
Grepped every route that flips a money-bearing status
(`invoices/[id]`, `quotes/[id]`, `jobs/[id]`, `sessions/[sessionId]`,
`bookings/batch-update`, `admin/schedule-issues/fix`,
`webhooks/stripe/route.ts`, `team-portal/jobs/{claim,release,reassign}`) —
all already carry CAS and/or the correct ledger idempotency/reversal
pattern from earlier passes this session; `jobs/[id]/payments` was the one
gap. Confirmed `finance/expenses/[id]` PUT/DELETE has no equivalent
paid→void transition to reverse (expenses don't post revenue — they're a
COGS/expense entry with no matching "posted" lifecycle in this table).

## Not touched
- Whether `job_payments.status` should also gain a DB-level state-machine
  constraint (e.g. disallow `void → paid` resurrection entirely, forcing a
  fresh line instead) — the app-level CAS + idempotent reversal/re-post
  already make that path safe (a resurrected 'paid' after a reversed void
  correctly re-posts, since the reversal's `journalEntryExists` check for
  `'job_payment'` — not `'job_payment_void'` — still finds the ORIGINAL
  entry and would block a second reversal, while `postJobPaymentRevenue`'s
  own idempotency check also still finds that same original 'job_payment'
  entry and refuses to re-post a SECOND time). That specific resurrection
  edge case (void→paid→void again) is a real but low-probability admin-only
  operator flow; flagging as a possible follow-up rather than building extra
  machinery now (YAGNI, same discipline as this session's other "not every
  theoretical edge needs its own guard" calls).
