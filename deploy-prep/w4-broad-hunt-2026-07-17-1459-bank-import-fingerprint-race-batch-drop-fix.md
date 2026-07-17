# Bank import: fingerprint race silently drops the losing batch's legit rows

W4, 2026-07-17 14:59. Fresh-ground surface per 15:02 checkpoint's
next-target list. File-only, no push/deploy/DB.

## Surface

`platform/src/app/api/finance/bank-import/route.ts` — CSV/OFX bank
statement import. Zero prior coverage, zero tests before this pass (flagged
as "worth a full read" in the 15:08 checkpoint's next-target list).

## Bug

The route dedupes incoming rows against a snapshot of existing
`bank_transactions.fingerprint` values read once near the top of the
request, then does **one multi-row `insert()`** of everything it decided
was new. A real Postgres UNIQUE index already exists on
`(bank_account_id, fingerprint)` (`migrations/032_ledger.sql`, already
applied — not a proposed/pending migration like most of this queue's other
open items). A multi-row `INSERT` is all-or-nothing: if **any** row in the
batch conflicts with that index, Postgres rejects the **whole statement**,
not just the conflicting row.

So: two different statement files (different `sha256`, so neither is
blocked by the exact-file-reupload guard) that happen to share one
overlapping transaction — routine with banks' rolling-window CSV exports,
or a plain double-submit of overlapping date ranges — can race. Both read
the fingerprint snapshot before either has committed, so neither sees the
shared row as an existing duplicate. Whichever import's insert lands
second gets a 23505 on the entire statement and throws. Concretely, for
that request:

1. Its own **non-overlapping, genuinely new** transactions are silently
   lost — never inserted, never counted as duplicates, gone.
2. Its `bank_import_batches` row was already created successfully (sha256
   differs from the other file), with `row_count` set but
   `accepted_count`/`duplicate_count` stuck at their zero defaults forever,
   because the crash happens before the `.update()` that sets them.
3. Retrying with the exact same file now hits the sha256 "already
   imported" guard (line 42 of the original) and returns 409 — permanently
   blocking recovery even though **zero** transactions from that file were
   ever actually saved. The only way out is a manual DB fix.

This is a real-money-adjacent surface (bank reconciliation ledger) with an
already-live unique constraint, so this isn't a dormant/pending-migration
bug like most of this queue's other findings — it's exploitable today.

## RED confirmation

`route.race.test.ts`: imports file A (commits its shared-fingerprint row
for real), then forces the *next* fingerprint-snapshot read on file B to
return empty — deterministically reproducing the exact TOCTOU window a
real concurrent request would hit, since `Promise.all` timing over real
multipart parsing wasn't a reliable clock for this (tried first, didn't
reproduce reliably). Before the fix: file B's `Gym Membership` row (no
fingerprint conflict at all) vanished along with the one row that actually
conflicted, and `secondJson.ok` was `false` (500). Batch B's counts were
stuck at the zero defaults, `accepted_count + duplicate_count !==
row_count`.

## Fix

Mirrors the established pattern from this session's `clients/import` fix
(commit `c126b001`): catch 23505 on the batch insert, retry row-by-row so
one race loser doesn't sink the rest of the batch, and derive
`accepted`/`duplicates` counts from what actually landed instead of what
was merely attempted. Unlike that fix, the backing unique index here
already exists in the deployed schema, so this fix is live immediately,
not dormant pending a migration.

## Verification

- `route.race.test.ts` — new, RED before fix (Gym Membership row lost,
  `ok:false`, batch counts inconsistent), GREEN after.
- `npx vitest run src/app/api/finance` — 47 files / 104 tests, all green
  (no regressions in sibling finance routes).
- `npx tsc --noEmit` — 2 pre-existing errors unrelated to this change
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/
  site-nav.ts`), confirmed present on a clean stash of this branch before
  my edit. Zero new errors.

## Files changed

- `platform/src/app/api/finance/bank-import/route.ts` — row-by-row 23505
  retry + accurate count derivation.
- `platform/src/app/api/finance/bank-import/route.race.test.ts` — new.

No push/deploy/DB write this pass.
