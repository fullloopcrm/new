# W4 session report — 22:05 queue

LEADER order: (1) continue cross-archetype HR/payroll/finance depth. (2)
continue fresh-ground hunting. (3) keep gap/fluidity current.

## (1) Finance depth: bank-txn match route's deferred journal-post gap (from 21:53 session)

Picked up the item flagged-but-not-fixed at the end of the last session:
`POST /api/finance/bank-transactions/[id]/match`'s expense-target branch
posts an optional journal entry (bank + operating-expense CoA) *after* the
atomic claim has already flipped `bank_transactions.status` to `'matched'`
and updated `expenses.matched_bank_transaction_id`. Those two writes are the
real, correct outcome of the match — but the optional journal-post call
(CoA lookup + `postJournalEntry`) had no try/catch of its own, so a failure
there propagated to the route's outer catch and returned a 500. The caller
sees "request failed" for a match that actually succeeded, and can't even
retry: the top-of-route check now rejects any second attempt with `Already
matched` since `txn.status` is no longer `'pending'`. Net effect: a
transient ledger-post failure (bad CoA state, DB hiccup) makes a real,
successful expense match look like an error with no way to recover except
manually querying the DB.

Fixed by wrapping the CoA-lookup + `postJournalEntry` + final-update block
in its own try/catch. On failure it now logs and the request still returns
`{ ok: true }` — the txn is left at `status: 'matched'` with no
`journal_entry_id` (missing its optional ledger post, same "no rollback
path today" state already accepted for the invoice/booking branches' own
optional side effects), instead of a misleading 500 for work that already
committed.

2 new tests (`route.journal-post-failure.test.ts`): confirms `ok: true` +
committed match state when `postJournalEntry` throws, and confirms a
follow-up retry correctly reports `Already matched` (not silently lost) so
nobody mistakes this for still being retryable. All 6 tests on the route
(4 existing race + 2 new) pass.

## (2) Fresh-ground: outreach cron double-texts on concurrent invocation

`GET /api/cron/outreach` (Saturday seasonal SMS check-ins) sent the SMS
*before* inserting its `outreach_log` dedup row. The per-moment
`alreadyTexted` SELECT at the top of the loop is a point-in-time snapshot,
not a lock — two overlapping invocations (a slow run + a manual re-trigger,
or a scheduler retry firing while the previous run is still mid-flight)
would both see the same client as un-texted for the same moment, both call
`sendSMS`, and only then race to insert the log row. The
`outreach_log_dedup` UNIQUE(tenant_id, client_id, moment_id) constraint
only deduped the *log row* afterward (one insert wins, the loser's
duplicate-key error was already caught and silently ignored) — the client
still got texted twice. Exact same bug class already fixed elsewhere in
this codebase (rating-prompt, campaign-send, find-cleaner-broadcast) via
"claim before you act," just never applied here.

Fixed by moving the `outreach_log` insert to *before* the `sendSMS` call:
the unique constraint now gates the send itself (a duplicate-key error on
insert means another invocation already claimed this client+moment, so
this one skips without sending). If `sendSMS` itself throws after a
successful claim, the log row is deleted so a genuinely failed send isn't
permanently marked as "already texted" with nothing actually sent — it can
retry next Saturday.

3 new tests (`route.race.test.ts`): concurrent double-invocation sends
exactly one SMS and leaves exactly one log row; a sequential re-run doesn't
re-text an already-claimed client; a send failure releases the claim so a
later run can retry. All pass.

## Also checked, no fix needed

- **`POST /api/cron/auto-reply-reviews` → `autoReplyReviews()`**: same
  read-then-act shape (SELECT unreplied Google reviews, generate an AI
  reply, POST to Google) with no claim on the `google_reviews` row before
  posting. Concurrent invocations could both generate + POST a reply to the
  same review. Lower severity than the fixes above: the side effect is an
  external Google Business Profile write (Google's reply endpoint is
  create-or-replace, not append), so the worst case is wasted AI-generation
  + Google API calls and the final visible reply is whichever POST lands
  last — not a duplicated customer-facing artifact or a money bug. Flagging
  in the gap report below rather than bundling a fix into this session.
- **`GET /api/finance/payroll-prep`**: read-only report endpoint (no
  writes), so no race to find. Already carries two fix comments from prior
  sessions (permission gate, 1099 YTD window) — re-read end to end, both
  still correct.
- **`GET /api/cron/release-due-payments`**: single atomic
  `UPDATE ... WHERE status='pending' ... RETURNING`, no read-then-write
  gap — double cron fire only picks up rows still `pending`. Correctly
  built already.
- **`GET /api/cron/sales-follow-ups`** and **`GET /api/cron/retention`**:
  both already have the same "check existing notifications in a time
  window before sending" dedup guard as the already-fixed crons in this
  class (follow-up, no-show-check, etc). Consistent with the accepted
  pattern for this severity tier; not re-flagging.
- **`GET /api/cron/lifecycle`**: recalculates client status (New→
  Active→At-Risk→Churned) idempotently off current booking data with no
  outbound message side effect — double-fire produces the same result, not
  a duplicate anything. No fix needed.

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **New this session:** `autoReplyReviews()` (used by
   `/api/cron/auto-reply-reviews`) has no claim/lock before generating +
   posting an AI reply to a Google review — see "Also checked" above for
   why this is lower severity than the two fixes and deserves its own pass
   if the AI-generation cost or Google API rate becomes a concern.
2. **Carried, still open:** `match/route.ts`'s expense-target branch — the
   journal-post failure-swallow itself is now fixed (item 1 above), but the
   underlying design (a "matched" state that can silently lack its optional
   ledger post forever, with no retry surface in the UI) is unchanged. A
   future pass could add a "missing journal entry" indicator/retry action
   in the bank-transactions UI.
3. **Carried, still open:** `DELETE /api/deals/[id]` has no delete-guard.
   Needs a product decision on what makes a deal "worth protecting" before
   a threshold can be picked.
4. **Carried, still open:** the bookings admin "Cancel booking" button
   hard-deletes via `DELETE /api/bookings/[id]` instead of the
   state-machine-guarded `PATCH /api/bookings/[id]/status` route.
5. **Carried, still open:** two-going-on-three tenant-creation doors
   reimplement activation independently.
6. **Carried, still open:** `hr_document_reminders.document_id` is
   `NOT NULL`, so there's no way to attach a "missing required document"
   reminder until a `hr_documents` row exists for that requirement.
7. **Carried, still open:** `reviewed_by_name` migration
   (`2026_07_16_hr_documents_reviewed_by_name_PROPOSED.sql`) is drafted but
   not applied to prod.

**UX-FRICTION:**
1. (Carried) The client/team-member/booking hard-delete 409s don't offer an
   inline "cancel/set inactive instead?" action.
2. (Carried, still open) HR onboarding badge/handoff gap and finance
   period-lock enforcement gap — block-vs-override policy isn't a worker's
   call.

## Verification

- `npx tsc --noEmit`: same 2 pre-existing baseline errors
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/
  site-nav.ts`) present before and after this session's changes (confirmed
  via `git stash`); zero new errors introduced.
- `npx vitest run` on both touched routes: 9/9 tests pass (6 on the match
  route, 3 new on the outreach cron).
- File-only session: no push, no deploy, no prod DB writes.
