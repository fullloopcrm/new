# Batch DDL review — 2026-07-16 session PROPOSED migrations

All of the below are **file-only, NOT applied to prod**. Each file is
self-documenting (full rationale in its own header comment) — this doc is
just the consolidated index so they can be reviewed and applied together in
one sitting instead of one at a time. None are wired into their route.ts —
every one was written specifically so that leaving it unapplied breaks
nothing live (either the calling code isn't written yet, or it still uses
its pre-fix reactive/non-atomic path).

Recommended apply order: independent of each other (different tables /
columns), so any order is safe. Suggest applying all 8 in one batch since
they're small, additive (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT
EXISTS` / `CREATE OR REPLACE FUNCTION`), and none carry data-loss risk.

Separately tracked, NOT included here: the older RLS policy batch
(`rls-pass3` through `rls-top10-migration-proposal.md`,
`idor-remediation-status.md`, 07-13/07-14 dated) — that's a larger, already
its-own-batch review; this doc is scoped to today's cron/webhook/photo
migrations so it doesn't get lost inside that larger set.

## 1. Late-check-in duplicate-alert claim columns
`src/lib/migrations/2026_07_16_bookings_late_alert_claim_columns_PROPOSED.sql`
Adds `bookings.late_check_in_alerted_at` / `late_check_out_alerted_at`.
Closes: GET /api/cron/late-check-in double-texting team member + owner on
overlapping runs. Follow-up: wire a conditional-UPDATE claim into route.ts
(not done — needs the columns to exist first).

## 2. Confirmation-reminder claim column
`src/lib/migrations/2026_07_16_bookings_confirmation_reminder_claim_column_PROPOSED.sql`
Adds `bookings.confirmation_reminder_sent_at`.
Closes: GET /api/cron/confirmation-reminder (every 5 min) double-texting a
client — the existing sms_logs-count dedup is written by the shared sender
after send completes, too late to prevent the race. Follow-up: same as #1.

## 3. Payment-followup-daily claim column
`src/lib/migrations/2026_07_16_bookings_payment_followup_daily_claim_column_PROPOSED.sql`
Adds `bookings.payment_followup_daily_sent_at`.
Closes: GET /api/cron/payment-followup-daily (3x/day) double-texting a
client about an unpaid balance — a plain INSERT dedup check doesn't
serialize the way a conditional UPDATE does. Follow-up: same as #1, mirrors
the already-fixed payment-reminder cron's pattern (7f0698bb).

## 4. Telnyx inbound-SMS webhook event dedup table
`src/lib/migrations/2026_07_16_telnyx_inbound_event_dedup_PROPOSED.sql`
Adds `telnyx_inbound_events(telnyx_message_id PK, tenant_id, received_at)`.
Closes: POST /api/webhooks/telnyx (753-line inbound SMS handler) has ZERO
redelivery protection — a Telnyx retry can re-send STOP/START confirmation
SMS, double-log a client rating, or send a duplicate AI-generated Selena/
Yinez reply. **Highest-value item in this batch** — biggest blast radius,
still needs a dedicated code pass after this table exists (claim on
payload.id at the top of message.received, gating every branch below it —
flagged as too large/risky for an end-of-session patch, needs its own
review + testing pass).

## 5. Referrer total_earned atomic bump
`src/lib/migrations/2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql`
Adds `referrer_bump_total_earned(p_referrer_id, p_amount_cents)` RPC.
Closes: a lost-update race on `referrers.total_earned` when the same
referrer earns commissions on two concurrent bookings — read-then-write
increment in team-portal/checkout + referral-commissions routes. Follow-up:
swap both call sites' `.update({ total_earned: ref.total_earned + x })` for
the RPC once applied.

## 6. Telnyx-voice admin-leg ring-claim column (new this pass, task 2 of today's 3-deep queue)
`src/lib/migrations/2026_07_16_comhub_active_calls_ring_claim_column_PROPOSED.sql`
Adds `comhub_active_calls.ring_claimed_index`.
Closes the second half of the admin-leg redelivery-dedup gap in
POST /api/webhooks/telnyx-voice (first half — call.answered — was fixed
code-only this pass, commit 019a8e03, no DDL needed). The dial.failed/
no_answer branch (ring the next admin, or voicemail) can't use
`admin_call_id` as a claim key because SIP-transfer targets never populate
it — this column gives a target-kind-agnostic claim (ringIndex-based)
instead. Follow-up: wire the conditional-UPDATE claim into route.ts's
dial.failed/no_answer branch (has an inline TODO comment pointing at this
file).

## 7. Photo/proof-of-work capture columns + append RPCs (new this pass, task 1 of today's 3-deep queue)
`src/lib/migrations/2026_07_16_bookings_photo_proof_columns_PROPOSED.sql`
Adds `bookings.checkin_photos` / `checkout_photos` (jsonb arrays) +
`booking_append_checkin_photo` / `booking_append_checkout_photo` RPCs.
New capability (not a race fix): zero photo capture anywhere in check-in/
check-out today, most valuable for dumpster/junk/moving proof-of-work.
Companion endpoint already written (also unwired):
`src/app/api/team-portal/photo-upload/route.ts`. Full design writeup:
`deploy-prep/w4-photo-proof-of-work-design-2026-07-16-1531.md`. Follow-up:
apply migration, then wire the endpoint into the team-portal UI + build an
admin-side photo gallery display (neither exists yet — out of scope for
this pass, schema + endpoint only).

## 8. Booking-overlap trigger advisory lock
`src/lib/migrations/2026_07_16_booking_overlap_trigger_advisory_lock_PROPOSED.sql`
Not authored by me this session (found already present in the tree, no
matching W4->LEADER report referencing it) — listed here for completeness
of the batch since it's the same PROPOSED/not-applied convention in the
same directory. Adds a transaction-scoped advisory lock to
`trg_block_booking_overlap` to close a READ-COMMITTED race where two
concurrent booking-creates for the same team_member can both pass the
overlap check before either commits. Did not re-verify its correctness in
this pass — flagging for the leader/whoever authored it to confirm before
batching it in with the rest.

## Self-review addendum (2026-07-16, later pass) — gaps found re-reading this doc against the actual files

Re-read all 8 migration files end-to-end against this index rather than
just trusting my own summaries. All 8 files exist, contents match what's
described above, and the "independent, any order" claim holds (verified no
two items touch the same column/function/table). Two gaps found, neither
blocking, both worth fixing before this batch is actually applied:

1. **Broken internal cross-reference in migration #7.** The header comment
   in `2026_07_16_bookings_photo_proof_columns_PROPOSED.sql` cites
   `deploy-prep/w4-broad-hunt-2026-07-16-1637-referrer-total-earned-race-plus-checkin-photo-gap.md`
   as the source finding — that file does not exist anywhere in this repo
   (checked `deploy-prep/` directly). The *correct* design doc is
   `w4-photo-proof-of-work-design-2026-07-16-1531.md`, which item 7 above
   already links correctly. The migration file's own comment appears to
   reference an earlier/renamed draft filename that was never actually
   committed. Low-stakes (doesn't affect the SQL itself, just a dead
   pointer a future reader would hit), but worth a one-line fix to the
   migration file's header so it doesn't send someone hunting for a file
   that isn't there.

2. **Item 8 doesn't follow this batch's file conventions**, which matters
   specifically because it's the one item being folded in from someone
   else's work rather than authored as part of this batch: (a) it opens
   with the filename as a comment instead of the "PROPOSED — not yet
   applied to prod..." boilerplate every other file in this batch leads
   with, and (b) it wraps its own DDL in `BEGIN; ... COMMIT;` while items
   1-7 are bare statements, and (c) it embeds a literal ready-to-run
   `PGPASSWORD='<pw>' psql ... -f <file>` apply command in its header —
   the other 7 files deliberately don't include a runnable apply command,
   consistent with the standing rule that only the leader runs prod DDL
   after Jeff approves. None of this makes the SQL wrong, but if the
   leader concatenates all 8 files into one script to run "in one batch"
   as this doc recommends, item 8's embedded `BEGIN/COMMIT` splits the
   batch's transaction boundary in a way items 1-7 don't expect (each of
   those would then run in its own implicit autocommit statement rather
   than one wrapping transaction, and item 8 would commit independently
   mid-file). Not a correctness bug — each file's DDL is idempotent/
   additive on its own — but worth the leader running item 8 as its own
   step rather than literally concatenating it into the other 7, and
   confirming its authorship/review status separately as already flagged
   above.
