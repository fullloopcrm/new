# cron/phone-fixup could double-email a cleaner the phone-confirmation link (2026-07-17 23:15)

## Fresh-ground discovery

Continuing tonight's sweep of untouched cron surfaces for the same
check-then-act bug class after the auto-reply-reviews fix (23:03). `cron/
phone-fixup` had **zero prior test coverage** and a variant of the same
shape: dedup by scanning `notifications` for a `type='phone_fix_email'`
row within the last 7 days, regex-parsing `cleaner_id=<uuid>` out of the
message text to build a skip-set — but that notification row is only
inserted AFTER `sendEmail()` resolves.

Two overlapping invocations (a retried cron delivery, or a manual
re-trigger while a prior run is still mid-flight emailing up to CAP=10
cleaners per tenant) can both read zero matching notifications rows for
the same cleaner before either write landed, and both send that cleaner
the "we can't text you, confirm your number" email. Lower blast-radius than
tonight's earlier finds (no money, no external public-facing content —
just a duplicate internal-ish email to a contractor), but real, and it's
the same root cause: the app-code dedup check races its own write.

## Fix (file-only, no push/deploy/DB)

- **`src/lib/migrations/2026_07_17_team_members_phone_fix_email_sent_at.sql`**
  (new, prepared-not-applied) — adds `team_members.phone_fix_email_sent_at
  timestamptz NOT NULL DEFAULT epoch`. Repeatable like
  `last_payment_followup_sent_at` (this cron re-emails every 7 days until
  the phone is fixed, not a one-shot marker), so `NOT NULL DEFAULT epoch`
  lets the same `.lt(sevenDaysAgo)` comparison cover both a cleaner's first
  eligible pass and one whose last email has aged out of the window — a
  nullable column would never match `.lt()` on its first attempt, since
  NULL comparisons are NULL, not true, in Postgres.
- **`src/lib/migrations/2026_07_17_team_members_phone_fix_email_sent_at.backfill.sql`**
  (new, prepared-not-applied) — recovers real history from the existing
  `notifications` audit trail (parsing the same `cleaner_id=<uuid>` format
  the route already writes) so post-migration eligibility matches
  pre-migration eligibility instead of every existing row defaulting to the
  epoch and causing a one-time duplicate-email burst on deploy.
- **`src/app/api/cron/phone-fixup/route.ts`** — moved the 7-day eligibility
  filter into the initial Postgres query (`.lt('phone_fix_email_sent_at',
  sevenDaysAgo)`) instead of pulling the column into JS and comparing as
  strings (Postgres may return a `timestamptz` in a different ISO-8601
  timezone-suffix format than `.toISOString()`'s `Z`, and lexical string
  comparison across differing suffix formats isn't reliably orderable).
  Then claims `phone_fix_email_sent_at` via compare-and-swap (`WHERE
  phone_fix_email_sent_at < sevenDaysAgo`) BEFORE calling `sendEmail`; the
  losing invocation's claim affects 0 rows and it skips before ever
  building the signed token or sending. Unlike a pure one-shot marker, a
  failed send releases the claim back to the epoch on both the
  `result.success === false` branch and the `catch` block — the old
  notifications-based dedup only ever recorded a *successful* send, so a
  transient failure was implicitly retried the next day; releasing the
  claim on failure preserves that same behavior instead of silently
  blocking a cleaner for a full 7 days over one bad send.

## Verification

- New test file `src/app/api/cron/phone-fixup/route.claim-before-send.test.ts`
  (first-ever test coverage for this route): claim is written before
  `sendEmail` fires (not after); two concurrent invocations racing the same
  cleaner send exactly once; a cleaner claimed within the last 7 days is
  skipped; a cleaner whose claim aged out past 7 days is re-emailed; the
  claim is released back to the epoch on both a `{success:false}` result
  and a thrown exception; a cleaner with a valid phone is never a
  candidate. 8/8 passing.
- RED-confirmed: `git diff` of `route.ts` saved to a patch, `git apply -R`
  to fully revert the fix (not `git stash` — shared `.git` dir across all 4
  worker worktrees), re-ran the 8 new tests — 4 genuine failures with the
  exact predicted symptoms (claim column never written, the race sends
  twice, a cleaner claimed 1 day ago still gets re-emailed because the old
  code never looked at the column at all); the other 4 tests don't depend
  on the fix (aged-out re-email, both failure-release paths, valid-phone
  exclusion — none of these distinguish old vs new code paths) and passed
  either way. Restored via `git apply`, re-ran — 8/8 green again.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors elsewhere — admin-auth route typing, two unrelated cron test
  files' spread-argument typing, sunnyside-clean-nyc's site-nav.ts import
  names — none touch this change).
- Full suite: `npx vitest run` — 611/611 files, 3279 passed + 1 pre-existing
  expected-fail, 0 regressions (net +8 tests over the prior 610-file/3271-
  passed baseline from the auto-reply-reviews pass).

## Not fixed / flagged, not touched

- `cron/recurring-expenses` (checked as a fresh-ground candidate before
  landing on phone-fixup): its own `alreadyPosted` pre-check against
  `journal_entries` is the same check-then-act shape, but the real
  double-post is already closed at the DB level once
  `064_unique_journal_entries.sql` is applied — `post_journal_entry()`'s
  `ON CONFLICT (tenant_id, source, source_id) DO NOTHING` makes the RPC
  itself idempotent and returns NULL on a duplicate, so the caller's
  pre-check racing its own write no longer matters. Confirmed
  `recurring-expenses`'s code doesn't check `postJournalEntry`'s return
  value, but that's fine — it doesn't need to; a NULL return and a real
  UUID return both leave the row in the same only-once-posted state.
  Flagging only because 064 (like this pass's migrations) is prepared but
  not yet applied — until it lands, `recurring-expenses` is still exposed
  to a live double-post race, tracked under the existing 064 migration,
  not a new item.
- tenant_domains schema lane reconfirmed intact, no drift (043/055/056/059/
  068/069/072 unchanged; this pass's migrations are unrelated tables).

File-only. No push/deploy/DB.
