# cron/confirmation-reminder + cron/payment-followup-daily: sent-before-claim races (2026-07-17 21:20)

## Surface (fresh-ground, opened into a second file of the same class)
This session has now closed the "mark sent AFTER the send, not before" race
on seven crons (rating-prompt, comhub-email, payment-reminder, outreach,
post-job-followup, late-check-in, reminders). Auditing the remaining
sms_logs-based dedup checks for the same unfixed pattern
(`grep -rn "sms_logs" src --include="*.ts"`) surfaced two more files.

## Bug 1 — cron/confirmation-reminder
Dedup was a pre-send `count()` on `sms_logs` (`booking_id`, `sms_type =
'confirmation_reminder'`), but that row is only written inside
`lib/nycmaid/sms.ts`'s `sendSMS()` — AFTER the Telnyx call resolves, and
only when `options.smsType` is set. Check and write never raced correctly:
this cron runs every 5 min with no run-lock, so two overlapping invocations
could both read zero matching `sms_logs` rows before either write landed,
and both text the same still-pending-confirmation client.

Fix: new `bookings.confirmation_reminder_sent_at` timestamptz column
(nullable, one-shot), claimed via compare-and-swap (`WHERE
confirmation_reminder_sent_at IS NULL`) BEFORE calling `sendClientSMS()` —
same shape as `review_followup_sent_at` from the post-job-followup fix
earlier this session.

## Bug 2 — cron/payment-followup-daily
Same shape, different cadence: per-slot idempotency was a pre-send
`count()` on `sms_logs` (`booking_id`, `sms_type =
'payment_followup_daily'`, `created_at >= idempotencyCutoff`), with the
claim row inserted AFTER `sendSMS()`. This booking gets chased repeatedly
across multiple slots/days until paid (not a one-time send), so a plain
NULL-claim column doesn't fit — a `.lt(idempotencyCutoff)` filter against a
NULL column is never true in Postgres (NULL comparisons are NULL, not
true), so a fresh booking would never claim on its first attempt.

Fix: new `bookings.last_payment_followup_sent_at` timestamptz column, **NOT
NULL DEFAULT '1970-01-01T00:00:00+00'** (the epoch) so `.lt(cutoff)` alone
covers both a booking's first attempt and one whose last send has aged out
of the current slot — no separate IS NULL branch needed. Claimed via
compare-and-swap BEFORE `sendSMS()`. The `dry=1` estimate path is
untouched (still reads `sms_logs` directly) since it never sends or
claims — nothing to race there. The `sms_logs` insert after a real send is
kept as an audit trail only; it's no longer the dedup source of truth.

## Fix files (file-only, no push/deploy/DB)
- `src/app/api/cron/confirmation-reminder/route.ts` — claim-before-send via
  new column, replacing the `sms_logs` count-check.
- `src/app/api/cron/payment-followup-daily/route.ts` — real-send path
  claims via new column before `sendSMS()`; `dry=1` path unchanged.
- `src/lib/migrations/2026_07_17_bookings_confirmation_reminder_sent_at.sql`
  (new) — nullable column, no backfill needed (NULL is the permanent
  "not yet sent" state going forward).
- `src/lib/migrations/2026_07_17_bookings_last_payment_followup_sent_at.sql`
  (new) — NOT NULL DEFAULT epoch column, no backfill needed (every existing
  row gets the epoch default, which is `.lt()`-eligible immediately).
- `src/app/api/cron/payment-followup-daily/route.sms-consent.test.ts`
  (updated) — its hand-rolled Supabase mock chain gained `update()`/`lt()`
  no-ops so the new claim call doesn't throw `TypeError: chain.update is
  not a function`; behavior of that file's existing assertions is
  unchanged.
- 8 new tests across 2 new `route.claim-before-send.test.ts` files: an
  ordering assertion (claim visible to the mock before `sendSMS`/
  `sendClientSMS` resolves), a single-send happy path, a genuine
  concurrent-invocation race (`Promise.all`, exactly one send lands), and
  (payment-followup-daily only) two slot-boundary tests proving the epoch-
  default `.lt()` claim both blocks a same-slot resend and allows a
  next-slot re-chase.

## Verification
Targeted suites green: confirmation-reminder 2 files/5 tests, payment-
followup-daily 4 files/12 tests (all passed, including the pre-existing
auth-gate/sms-consent/recency-floor suites — none regressed by the mock
chain update). `tsc --noEmit` clean against my changes: the only remaining
errors are pre-existing, unrelated baseline errors already flagged in this
session's earlier commits (admin-auth route typing, outreach's own spread-
argument error, payment-reminder's own arg-count error, sunnyside-clean-nyc
site-nav) — none new, none touched. Full suite: 600/600 files, 3226 passed
+ 1 pre-existing expected-fail (the same one flagged all session), 0
regressions.

## Not fixed this round — flagged
`lib/nycmaid/review-engine.ts` also queries `sms_logs` (matching an inbound
SMS reply to the most recent outbound `rating_prompt`/`review_request` by
phone+type within a time window), but that's not a send-dedup check — it's
an inbound-message router picking the most recent matching outbound log to
attribute a reply to. No send-then-claim race there; not the same bug
class, deliberately not touched.

`tenant_domains` schema lane (043/055/056/059/068/069/primary-invariant/
domain-normalization) reconfirmed intact, no drift — this round's fixes are
outside that table entirely (bookings only).
