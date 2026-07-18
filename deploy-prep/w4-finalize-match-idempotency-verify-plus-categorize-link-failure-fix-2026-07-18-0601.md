# W4 — finalize-match idempotency verification + categorize journal-link failure fix — 2026-07-18 06:01

Per the 05:50 LEADER order's 3-deep queue: (1) finalize-match's processPayment()
idempotency across its internal-key trust boundary, (2) bank-transactions
categorize claim-shape parity, (3) keep gap/fluidity current.

## This pass

### 1. finalize-match internal-key trust boundary — verified end-to-end, no code bug found

The referenceId-based dedup in `processPayment()` (partial unique index
`uq_payments_tenant_booking_reference`, 23505-as-idempotent-no-op — added in
commit `150d91ad`) was previously only exercised by calling `processPayment()`
directly in unit tests (`payment-processor.duplicate-reference.test.ts`,
`.double-payout.test.ts`, `.clientid-injection.test.ts`,
`.money-engine.test.ts`). Nothing exercised the actual HTTP entry point —
`admin/payments/finalize-match/route.ts` had **zero** test coverage of its
own: the internal-key auth gate, the booking→tenant resolution, and the
hand-off into `processPayment()` wired together.

Added `route.internal-key-idempotency.test.ts` (7 tests, real `POST` handler,
mocked DB only): missing/wrong `x-internal-key` → 401 with no DB write; a
single valid call records one payment; **two concurrent finalize-match POSTs
through the real HTTP route with the SAME referenceId only record one
payment** (both resolve 200 — this route's contract is redelivery-safe, not
claim/loser-409, unlike `confirm-match`); a sequential retry with the same
referenceId is a no-op; missing booking → 404; missing fields → 400. All 7
pass against the current code — **confirmed clean, no bug in the route
itself**. The protection genuinely covers this trust boundary correctly; the
gap was coverage, not correctness, and that gap is now closed.

Reconfirmed the remaining real gap is exactly what's already tracked: the
`uq_payments_tenant_booking_reference` unique index
(`2026_07_13_payments_reference_dedup_PROPOSED.sql`) is still unapplied to
prod. The application-side 23505 catch is a no-op without it — two
concurrent finalize-match calls with the same referenceId would currently
both insert a `payments` row until that DDL runs. File-only per worker rules;
still needs Jeff's approval to run. Not re-drafting the file, it already
exists and is correct — just re-flagging since it's the actual blocking item.

### 2. bank-transactions categorize claim-shape parity — confirmed at parity, found + fixed an adjacent real gap

Compared `[id]/route.ts` PATCH (categorize) against `[id]/match/route.ts`
POST claim-by-claim: both guard the `pending`→terminal-status transition with
an atomic `.eq('status','pending')` compare-and-swap *before* any side
effect, both release the claim back to `pending` on a downstream failure
(match: invoice/booking/expense-not-found + insert error via `releaseClaim()`;
categorize: `postJournalEntry` failure). Both already have dedicated race +
release tests (`route.race.test.ts` / `route.post-failure-release.test.ts`
for categorize; `match/route.race.test.ts` /
`match/route.journal-post-failure.test.ts` for match). **Confirmed: the two
routes' claim shapes are already at parity for the load-bearing race
protection — no gap there.**

While tracing the exact boundary of the release-on-failure try/catch to
confirm parity, found one real, narrower, previously-undocumented gap:
categorize's trailing `.update({ journal_entry_id: entryId })` — the write
that links the newly-posted journal entry back onto the `bank_transactions`
row — sat **outside** the try/catch that releases the claim on failure
(unlike the sibling `accept-suggestions` route, whose equivalent link write
is inside its try). If `postJournalEntry` succeeded (a real ledger entry now
exists) but that trailing link write then failed (network blip), the row was
left permanently stuck `status:'posted'` with `journal_entry_id: null` —
invisible in the UI's reconciliation link and excluded from every future
retry (status ≠ `'pending'` excludes it from both this route's own claim and
`accept-suggestions`), forever, with the ledger entry orphaned (unlinked, not
missing).

**Fixed**, matching the exact `posted:false, reason:'already_posted'`
idempotency idiom already used by `post-labor.ts`/`post-revenue.ts` for
`postJournalEntry()`'s own null-on-dedup return:
- Widened the try/catch to cover the link write too, so *either* failure
  releases the claim back to `pending` (retryable, not stuck).
- On a retry, `postJournalEntry()` hits its own RPC-level `(tenant, source,
  source_id)` dedup claim (see `ledger.ts`'s `post_journal_entry`) and
  correctly returns `null` for the entry this same row already posted —
  proving the retry does **not** double-post. Added `findJournalEntryId()` to
  `ledger.ts` (id-returning sibling of the existing `journalEntryExists()`,
  which is now a one-line wrapper over it — pure extraction, zero behavior
  change for its 8 existing call sites in `post-labor.ts`/`post-revenue.ts`/
  `post-adjustments.ts`) so the retry looks up and re-links the real entry id
  instead of silently writing `journal_entry_id: null` again.

## Verification

- New test `route.journal-link-failure.test.ts` (2 tests: link-write failure
  releases the claim back to `pending`, not stuck-`posted`; a retry after
  release heals the link using the recovered entry id — `postJournalEntry`
  called twice but only ONE journal entry ever exists, proving no duplicate
  post). RED confirmed pre-fix via `git stash` on `route.ts` + `ledger.ts`
  alone (both tests failed — txn stayed `'posted'` with no release, and
  `journal_entry_id` came back `null` instead of the recovered id); GREEN
  confirmed post-fix (stash restored).
- New test `route.internal-key-idempotency.test.ts` (7 tests, described
  above) — all pass against the unmodified route, confirming (not fixing) the
  trust-boundary coverage.
- `npx vitest run "src/lib/payment-processor" "src/app/api/admin/payments/" "src/app/api/finance/bank-transactions/" "src/lib/ledger"` —
  22 files / 57 tests pass.
- Broader blast-radius: `npx vitest run "src/lib/" "src/app/api/finance/" "src/app/api/admin/"` —
  236 files / 1101 tests pass, 1 expected-fail (pre-existing, unrelated).
- `npx tsc --noEmit` — no new errors (same 2 pre-existing baseline errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts` only, unchanged from every prior
  checkpoint this session).
- 0 commits yet (about to commit this pass).

## Aging items (unchanged, re-confirmed present, not re-litigated)

Same inventory as the 0549 checkpoint's list, PLUS this pass's own
reconfirmation:
- `uq_payments_tenant_booking_reference` (payments-table dedup index) — still
  unapplied to prod, now doubly-confirmed as the real remaining blocking item
  for finalize-match's (and every other `processPayment()` caller's)
  referenceId dedup to be load-bearing rather than a no-op.
- Everything else carried unchanged from the 0549/0528/0505 checkpoints (see
  those reports for the full inventory — create-tenant-from-lead atomic-claim
  migration, referrers atomic-bump migrations, clients dedup unique indexes,
  `hr_document_reminders.document_id` NOT NULL constraint, `team_pay` vs
  `team_member_pay` divergence, `deals.status` vestigial column, etc.)

## New aging items opened this pass

None. The categorize journal-link gap found this pass was fixed in the same
pass, not queued.

## Next-target candidates if continuing fresh-ground hunting

- The `payments`/`unmatched_payments`/`bank_transactions` claim-pattern family
  is now thoroughly swept (confirm-match, match, categorize, accept-
  suggestions, finalize-match all confirmed at parity or fixed). Worth
  picking an entirely different table/route family next — e.g. the
  `invoices`/`quotes` status-transition write doors, or the `documents`
  e-signature flow's claim shape (last touched in the 2300 esign-void-bypass
  fix), for the same "does every write door share the guard" pattern.

No push/deploy/DB this pass.
