# cron/auto-reply-reviews could double-post an AI reply to the same Google review (2026-07-17 23:03)

## Fresh-ground discovery

Scanning the untouched cron surfaces for a new bug class after tonight's long
run of bookings/deals-marker claim-before-send fixes. `lib/google-reviews.ts`
(`autoReplyReviews`, called by `cron/auto-reply-reviews`) had **zero prior
test coverage** and the exact same check-then-act shape as this session's
other fixes, but on a surface none of them touched: an *external, publicly
visible* side effect instead of an internal SMS/email send.

The old flow: select reviews with `reply IS NULL` → generate an AI reply
(real Anthropic API call) → `PUT` it to Google's Business Profile reply
endpoint → only THEN write `reply` locally. Two overlapping invocations (a
retried cron delivery, or a manual re-trigger via the same `CRON_SECRET`
while a prior run is still mid-flight generating replies for up to 10
reviews) can both read the same unreplied review and both act on it:

- Two real Anthropic API calls generating two different reply texts for the
  same review (direct, doubled cost, non-deterministic content).
- Two `PUT` calls to Google's reply endpoint — which is a **last-write-wins
  overwrite slot, not an append** (confirmed against the same endpoint
  `src/app/api/admin/google/reply/route.ts` already uses for manual
  replies). Whichever `PUT` lands last wins on Google; the local `reply`
  column gets whatever the losing invocation happened to write last, which
  is not guaranteed to be the same text — a silent split-brain between the
  dashboard's review list and what's actually publicly live on Google.

Lower blast-radius than the financial-hold/payment races fixed earlier
tonight (no money moves), but it's real, unbounded-retry-cost, and produces
customer-facing content that can visibly not match what the operator's
dashboard shows was sent.

## Fix (file-only, no push/deploy/DB)

- **`src/lib/migrations/2026_07_17_google_reviews_reply_claim.sql`** (new,
  prepared-not-applied) — adds `google_reviews.reply_claimed_at
  timestamptz`, nullable. Deliberately a **separate column from `reply`**
  rather than reusing `reply` itself as an in-flight sentinel: `reply` is
  read directly by the dashboard review list and re-synced (read-only from
  the claim's perspective) from Google's own reply data by
  `cron/sync-google-reviews`'s upsert — it must only ever hold real
  posted-reply text or NULL, never a transient marker.
- **`src/lib/google-reviews.ts`** (`autoReplyReviews`) — claims
  `reply_claimed_at` via compare-and-swap (`WHERE reply_claimed_at IS
  NULL`) BEFORE calling `generateReviewReply`/`postReviewReply`; the losing
  invocation's claim affects 0 rows and it skips before spending an
  Anthropic call. Unlike this session's usual one-shot `*_sent_at` markers
  (accepted tradeoff: a failed send just doesn't retry), losing the retry
  here isn't acceptable — an unanswered review has no other mechanism to
  catch it later — so the claim is explicitly reverted back to `NULL` on
  every failure path (empty AI reply, `postReviewReply` returning false,
  or a thrown exception), so the next cron pass retries it. On success,
  also fills `replied_at` (an existing column on `google_reviews` that was
  already in the schema but never written by this path — a one-line
  completion of the same `UPDATE` statement, not a separate change).

## Verification

- New test file `src/lib/google-reviews.claim-before-reply-race.test.ts`
  (first-ever test coverage for this module): concurrent invocations
  produce exactly one Anthropic call + one Google `PUT` for the same
  review; claim is set before the Anthropic call fires (not after); claim
  is released and the review is picked up again on the next pass when
  Google's `PUT` fails; claim is released when the generated reply text is
  empty. 4/4 passing.
- RED-confirmed: `git diff` of `google-reviews.ts` saved to a patch,
  `git apply -R` to fully revert the fix (not `git stash` — shared `.git`
  dir across all 4 workers), re-ran the 4 new tests — 2 genuine failures
  with the exact predicted symptoms (`expected 2 to be 1` on the
  double-call count, claim timestamp `null` when checked mid-generate; the
  other 2 tests don't depend on the fix and passed either way). Restored
  via `git apply`, re-ran — 4/4 green again.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors elsewhere — admin-auth route typing, two unrelated cron test
  files' spread-argument typing, sunnyside-clean-nyc's site-nav.ts import
  names — none touch this change).
- `eslint` on both touched/new files: 0 errors, only pre-existing-style
  warnings (underscore-prefixed unused mock args, already this repo's test
  convention).
- Full suite: `npx vitest run` — 610/610 files, 3271 passed + 1 pre-existing
  expected-fail, 0 regressions (net +4 tests).

## Not fixed / flagged, not touched

- `cron/sync-google-reviews`'s upsert writes `reply` straight from Google's
  API response on every sync, unconditionally, for every review including
  ones this cron never touched. That's correct self-healing behavior (Google
  is the source of truth for what's actually posted) and doesn't conflict
  with the new claim column — flagging only because it's the other writer
  to this table, confirmed it doesn't race against the new claim (it never
  touches `reply_claimed_at`).
- Did not add a claim/lock to `src/app/api/admin/google/reply/route.ts`
  (the manual admin-reply endpoint) — a human clicking "reply" twice in the
  dashboard UI on the same review is a different, much lower-probability
  race (not an unattended cron firing on a schedule) and out of scope for
  this pass.
- tenant_domains schema lane reconfirmed intact, no drift (043/055/056/059/
  068/069/072 unchanged; this pass's migration is an unrelated table).

File-only. No push/deploy/DB.
