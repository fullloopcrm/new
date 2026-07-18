# bank-import ghost-batch-on-partial-failure fix (2026-07-18 07:22)

## Fresh-ground discovery

`POST /api/finance/bank-import` inserts the `bank_import_batches` row (unique
on `(bank_account_id, sha256)` via `idx_bank_import_batches_sha`) BEFORE
inserting the parsed `bank_transactions` rows. That ordering has two gaps,
neither of which the route had ever handled:

1. The `existingBatch` "reject exact same file re-uploaded" check
   (`SELECT ... WHERE bank_account_id=... AND sha256=...`) is a plain
   check-then-act TOCTOU: two concurrent uploads of the identical file can
   both pass it before either `INSERT` commits. The second `INSERT` then
   hits `idx_bank_import_batches_sha` for real and threw a raw, uncaught
   `bErr` — surfaced to the caller as a generic 500 instead of the friendly
   409 the sequential path already returns one branch above.

2. The transactions bulk `INSERT` (all rows in one call) is all-or-nothing.
   If ANY accepted row collides with `idx_bank_txns_account_fp
   (bank_account_id, fingerprint)` — a real concurrent-upload race where
   another request's write landed in the gap between this request's own
   `existingFps` SELECT and its bulk INSERT, or any other transient failure
   on that INSERT — the whole insert throws. The batch row from step 1
   **already committed** by this point, and there was no compensation: the
   route just re-threw, leaving a batch row with `accepted_count`/
   `duplicate_count` never finalized and **zero transactions actually
   recorded** for it.

**Concrete failure**: that ghost batch row now permanently occupies the
`(bank_account_id, sha256)` slot. The uploader sees a 500, retries the exact
same file (natural behavior), and the `existingBatch` check at the top of the
route now finds the ghost row and returns 409 "This exact file was already
imported" — forever. The file can never be successfully imported for that
bank account again, even though nothing was ever actually recorded from it.
This is a real, deterministic reliability bug in a financial data-entry path
(not a rare theoretical race — a single transient failure on the second
INSERT is enough to trigger it), and it was completely untested before this
fix (no existing test file for this route at all).

## Fix (file-only, no push/deploy/DB)

`src/app/api/finance/bank-import/route.ts`:

- On the batch insert's own `23505`, return the same friendly 409 the
  sequential existingBatch-check branch already returns, instead of falling
  through to the generic 500.
- On the transactions insert's error, delete the just-created batch row
  before rethrowing — freeing the sha256 slot so a genuine retry (whether of
  the original request or a fresh upload after the race resolves) can
  actually succeed instead of hitting a permanent 409. Same compensating-
  rollback shape already established in `cron/generate-monthly-invoices`
  ("roll back this invoice rather than leave a ghost draft with no real
  visits behind it").

## Verification

- New test file: `route.ghost-batch.test.ts` (3 new tests, no prior test
  file existed for this route):
  1. A transactions-insert failure (simulated via a `raceRows` mechanism in
     a purpose-built fake store — a row visible to the INSERT's uniqueness
     check but NOT to the earlier `existingFps` SELECT, modeling the real
     TOCTOU gap without needing true concurrency) rolls back the batch row;
     a subsequent retry then succeeds (200, not 409).
  2. Normal single upload still records both the batch and the transaction
     (no regression).
  3. A true concurrent double-upload of the identical file (`Promise.all`,
     same interleaving pattern as the existing
     `bank-transactions/[id]/match/route.race.test.ts`) yields exactly one
     200 and one friendly 409 — never two 500s, never a raw duplicate-key
     message.
- Mutation-verified live: `git diff` of the fix saved to a patch, `git apply
  -R` to revert (shared `.git` dir across workers — this session's
  established convention over `git stash`), re-ran the new test file — test
  1 failed exactly as predicted (`expected [...] to have a length of +0 but
  got 1` — the ghost batch row survived), the other 2 passed either way (they
  don't exercise the rollback path). `git apply` to restore, re-ran — all 3
  green.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors — admin-auth route typing, two cron test files' spread-argument
  typing, sunnyside-clean-nyc's site-nav.ts import names — unchanged).
- `eslint` on both touched files: 0 errors (1 pre-existing unused-import
  warning on `getTenantForRequest` in route.ts, present before this change,
  unrelated to it).
- Full `vitest run`: 668/668 files, 3469 passed + 1 expected-fail (3470), 0
  regressions (was 667/667, 3466+1/3467 — net +1 file/+3 tests).

## Surface note

The other two candidate 2-column unique-index tables from this same sweep
(`chart_of_accounts(tenant_id, code)`, `bank_import_batches` itself for the
sequential case) were checked and are already correctly handled — insert-then-
catch-23505 with no false-narrowing existence check, unlike the
`categorization_patterns` class fixed earlier this session. This bank-import
ghost-batch defect is a different bug shape (missing compensation on a
committed side-effect, not a mismatched existence-check filter) — not a
continuation of that surface, a new one.

tenant_domains schema lane reconfirmed intact, no drift. No new SQL — this
was an application-layer fix only.

File-only. No push/deploy/DB.
