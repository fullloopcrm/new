# W4 — admin/payments/confirm-match double-payment race fix — 2026-07-18 05:49

Per the 05:40 LEADER order's 3-deep queue: (1) new fresh-ground surface, (2)
continue whatever it opens up, (3) keep gap/fluidity current.

## This pass

1. **Fresh-ground surface.** Continued the 0540 checkpoint's own next-target
   candidate ("payments.status / team_member_payouts — worth confirming
   there's exactly one write door and not a second one that bypasses
   whatever idempotency/reconciliation guard the primary one has"). Swept
   every write door onto `team_member_payouts` and `bookings.team_member_paid`
   first (`admin/bookings/[id]/cleaner-payout`, `payment-processor.ts`,
   `webhooks/stripe/route.ts`, `bookings/[id]/payment` PATCH,
   `finance/mark-paid`) — all either already atomic-CAS-guarded from earlier
   sessions, or (the two mirror-only flag setters in `payment/route.ts` and
   `mark-paid`) explicitly documented as forward-only/no-ledger-side-effect
   by design, matching this session's existing reasoning. Nothing new there.
2. Pivoted to the client-payment side of the same table family (`payments` /
   `unmatched_payments`) since that hadn't been swept yet this session.
   **`POST /api/admin/payments/confirm-match` — genuine, previously-
   unaddressed double-payment race, fixed.** This route (an admin manually
   matching an unmatched Zelle/Venmo transfer to a booking) read
   `unmatched_payments.status`, checked it against `'matched'` in plain JS,
   then — with no guard between the read and the write — unconditionally
   flipped the row to `status:'matched'`, inserted a `payments` row, and
   marked the booking `payment_status:'paid'`. Two near-simultaneous calls on
   the same unmatched payment (double-click "Confirm match" in the
   reconciliation UI, or two admins working the queue at once) would both
   read `'pending'` before either write landed, and both would insert a
   payments row + mark the booking paid — double-recording real money
   received, exactly the class of bug the sibling
   `finance/bank-transactions/[id]/match` route already guards against with
   an explicit atomic claim (its own header comment cites this precise
   scenario). `confirm-match` was the one door in the `payments`-adjacent
   family that never got the same treatment.
   - Fixed by moving the "mark unmatched as matched" write to be the very
     first side effect, with `.neq('status','matched')` in the WHERE clause
     (mirrors the bank-transactions/match route's own CAS pattern exactly).
     Only the caller that wins the claim proceeds to insert the payment row
     and mark the booking paid; the loser gets a clean 409 "Already matched"
     — same message the route already returned for the sequential case, so
     no client-visible behavior change on the happy path.
   - If the target booking turns out to be missing after the claim succeeds,
     the claim is released back to `pending` (status/matched_booking_id/
     matched_at all cleared) so a retry against the correct booking still
     works, rather than leaving the unmatched payment permanently stuck
     looking "matched" with nothing recorded — same release-on-failure shape
     used throughout this session's other claim-based fixes.
   - Left the pre-existing plain-JS status check in place as a fast-path
     (returns 409 immediately without touching the DB when the row is
     already visibly matched); the new atomic claim is the real guard for
     the concurrent case that check alone can't catch.
   - Checked `admin/payments/finalize-match/route.ts` (a separate,
     internal-key-gated Zelle/Venmo finalizer used by automated
     reconciliation tools, ported from nycmaid) for the same shape — it
     delegates to `processPayment()` in `payment-processor.ts`, which is a
     different, already-audited code path from earlier this session. Not
     touched; out of scope for this specific `unmatched_payments` claim bug.

## Verification

- New test `route.double-match-race.test.ts` (4 tests: single match succeeds
  and marks matched, two concurrent confirm-match calls on the same unmatched
  payment via `Promise.all` — only one records a payment/notification and the
  loser gets 409, missing-booking releases the claim back to pending, already-
  matched-before-the-request 409s outright via the fast path). RED confirmed
  pre-fix via `git diff` + `git apply -R` on `route.ts` alone (the concurrent-
  race test failed — both calls returned 200 instead of one 200 + one 409, and
  a duplicate payment/notification was recorded — the other 3 tests already
  passed pre-fix since they don't depend on the atomic claim); GREEN confirmed
  post-fix.
- Extended the existing hand-rolled Supabase mock in the pre-existing
  `route.permission-gate.test.ts` (additive only, no assertion changes) with
  `.neq()` and `.maybeSingle()` support — same "additive mock gap" pattern hit
  repeatedly this session.
- `npx vitest run "src/app/api/admin/payments/confirm-match/"` — 2 files / 7
  tests pass.
- `npx vitest run "src/app/api/admin/payments/" "src/app/api/finance/bank-transactions/" "src/app/api/finance/mark-paid/"`
  — 15 files / 31 tests pass (broader blast-radius check).
- `npx tsc --noEmit` — no new errors (same 2 pre-existing baseline errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts` only, unchanged from every prior
  checkpoint this session).
- Full suite: see commit log / next checkpoint for final tally (ran in
  background; confirmed clean before commit per this session's standing
  verification rule).
- 1 commit.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0540 report's list — see the 0528/0505 checkpoints for the
full inventory (create-tenant-from-lead atomic-claim migration, referrers
atomic-bump migrations, clients dedup unique indexes, admin/cleanup-test-
bookings name-collision, comhub_get_or_create_contact_by_email TOCTOU,
post-labor.ts entity_id design question, categorization_patterns semantics,
team-portal photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET,
4 dead clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports, notify()'s
latent `channel:'push'` no-op, comhub voice admin_phone/transfer-target
whitelisting, invoices/quotes/documents do_not_service product question,
sendPushToTeamMember/AllTeamMembers do_not_service applicability, the 0844
indirect-prompt-injection finding on `agent.ts`/`tools.ts`, the `/api/yinez`
residual unverified-tenant edge and self-reported-phone-establishes-client-
identity items, the `cleaners` vs `team_members` ID-space mismatch,
`client/confirm/[token]` dead code, the `telegram_webhook_events` pruning cron
(not wired), Jefe's non-refund owner tools lacking per-tool idempotency keys,
`lead-media/signed-url`'s 32-bit random path entropy note, the
`leads/block`/`leads/verify` `leads.view`-tier write-gate observation, the
still-generated-but-never-consumed `team_member_token`/`cleanerToken` on
bookings, the `bookings/[id]/team` PUT double-booking gap,
`finance/periods/[id]` PATCH / `reviews/[id]` PUT's last-write-wins footgun,
`admin/prospects/[id]` PATCH `approve`'s missing re-approve guard, and
`campaigns/send/route.ts` dead-code duplicate send implementation.

## New aging items opened this pass

None. The `team_member_paid`/`team_member_payouts` write-door sweep found
nothing new (all clean or already-documented-safe-by-design); the only real
finding was the `confirm-match` race, now fixed.

## Next-target candidates if continuing fresh-ground hunting

- `admin/payments/finalize-match/route.ts` delegates to `processPayment()` —
  already audited this session, but worth a dedicated pass confirming its
  `referenceId`-based idempotency key actually covers this exact
  internal-key-gated entry point end-to-end (not just the Stripe-webhook
  callers of the same function), since it's a distinct trust boundary
  (internal API key, not tenant auth) from the other callers.
- The `payments`/`unmatched_payments` family itself is otherwise clean:
  `finance/bank-transactions/[id]/match` (already CAS-guarded),
  `invoices/[id]/record-payment` (part of the earlier invoices/quotes sweep,
  confirmed clean), `webhooks/stripe/route.ts` (already audited extensively
  in prior sessions). Worth picking an entirely different table next if
  continuing this "does every write door share the guard" pattern —
  `documents`/e-signature status, or `expenses`/`bank_transactions` categorize
  flow (`finance/bank-transactions/[id]/categorize`, referenced in this
  route's own comment as the "sibling categorize route" — worth confirming it
  has the same atomic-claim shape as `match`, not just a passing mention).

No push/deploy/DB this pass.
