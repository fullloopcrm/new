# W4 broad-hunt — 2026-07-17 15:08 EDT — clients CSV import duplicate race

Queue (14:55 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

## (1) New surface: `src/app/api/clients/import/route.ts`

A second, standalone CSV client-import endpoint (`clients.create`-gated),
completely separate from the staged import pipeline (`import-staging.ts` +
`dashboard/import/*`) fixed last pass. Zero prior mentions in any of the
~290 prior `deploy-prep/*.md` reports, zero prior tests.

Same bug class as the just-fixed `commitBatch` double-commit race: the route
loads the tenant's existing clients ONCE into an in-memory Set
(`existingEmails`/`existingPhones`), dedupes the incoming CSV rows against
that snapshot, then bulk-inserts survivors. `clients` has no unique
constraint on `(tenant_id, email)` or `(tenant_id, phone)` at all, and
dedup only happens against that one in-memory read. Two concurrent POSTs
for the same CSV (double-click on "Import" during a slow upload, or a retry
after a timed-out first response) both read the same pre-insert snapshot
before either write lands — neither sees the other's rows as duplicates,
and the whole batch gets inserted twice with both requests reporting
success.

RED-confirmed empirically before any fix: 2 rows submitted by 2 concurrent
requests landed as 4 in the store (`route.concurrent-duplicate.test.ts`,
first version, `git apply -R`'d after to prove the retry-fallback branch
alone, not incidental test structure, closes it).

### Why this isn't the same fix shape as `commitBatch`

`commitBatch` had an existing `status` column on a real row to claim
atomically (`UPDATE ... WHERE status = 'staged' ... RETURNING`) — no schema
change needed. This route inserts brand-new rows with no existing row to
claim; the only airtight fix is a DB-level unique constraint. Per standing
worker rules (no DB writes; DB scripts are files for the leader to run
after Jeff approves), the real close is
`migrations/2026_07_17_clients_import_dedup_unique_index_PROPOSED.sql`
(two partial unique indexes, normalized the same way the route's own
in-memory dedup already normalizes: lowercased email, phone stripped to
digits at ≥10-digit threshold) — **not applied this pass.**

What *is* safe to ship today, mirroring the
`2026_07_13_bookings_same_date_dedup_PROPOSED.sql` precedent (migration +
23505-handling shipped in the same commit, code dormant until the index
exists): `route.ts` now catches a `23505` on the batch insert and retries
that batch row-by-row, so one concurrent duplicate doesn't sink the other
~199 valid rows sharing its batch — the conflicting row(s) get reported as
duplicates instead of the whole batch failing with a raw "Database error."
This branch cannot fire without the migration (no such conflict exists on
today's schema), so it changes nothing in prod until Jeff approves the
index — verified by simulating the future constraint in the fake Supabase
harness (`fake._addUniqueConstraint`), same technique
`client/book/route.same-date-race.test.ts` uses for
`uq_bookings_client_same_date_active`.

## (2) Continued the surface

Read the sibling staged-import route files again for anything the last
pass's fix might have missed sibling-wise: `stage/route.ts`,
`batch/[id]/route.ts`, `analyze/route.ts` — no additional bugs (last
pass's commitBatch fix + this pass's clients/import fix cover the two live
duplicate-insert-capable entry points into `clients`). Checked
`documents/[id]/void/route.ts` and `documents/[id]/duplicate/route.ts`
(both flagged as next-target candidates in the 15:02 checkpoint):

- `void/route.ts` **on this branch (p1-w4) still has the unconditional
  check-then-act write** (no `.eq('status', doc.status)` claim in the
  UPDATE) — the exact same TOCTOU a void racing a concurrent signer's
  final signature would exploit. Did NOT re-fix it here: `git log --all`
  shows it was already independently found and fixed twice on other
  worker branches not yet merged into p1-w4 — `84a9e42c` (P1/W1,
  "document void could clobber a concurrently-completed signature") adds
  the atomic `.eq('status', doc.status)` claim + 409 response, and
  `968bd0f4` (P1/W2) additionally hardens the same write with a
  `tenant_id` scope. Re-doing this fix on p1-w4 independently would just
  create a three-way merge conflict for the leader over the same 8 lines;
  flagging for the leader to carry W1's fix forward into this branch (or
  dedupe at merge time) rather than duplicating the work.
- `duplicate/route.ts` — confirmed clean again: every write is a fresh
  `insert` (new draft doc), no read-then-branch on existing state: a
  double-click just creates two duplicate drafts, not a data-loss or
  state-corruption bug.

## Verification

- New test file `route.concurrent-duplicate.test.ts` (3 tests): documents
  the current-prod-state gap (no constraint → doubles the batch, 4 rows
  from 2 concurrent requests) and mutation-verifies the code fix against a
  simulated post-migration constraint (`git apply -R` on the isolated code
  diff — the "once applied" tests fail pre-fix: a raw `Database error`
  surfaces instead of a clean duplicate classification; `git apply`
  restores GREEN).
- `npx vitest run src/app/api/clients/`: 10 files, 23 tests, all green.
- `npx tsc --noEmit`: same pre-existing 2-error baseline as every prior
  report this session (`bookings/broadcast` test mock typing,
  `sunnyside-clean-nyc` site-nav import), none in touched files.
- No push, no deploy, no DB write. 1 source file fixed (dormant-safe
  23505 handling), 1 new test file, 1 proposed migration file (unapplied),
  1 deploy-prep report (this one).

## Aging items still open (re-confirmed, not re-litigated)

- `documents/[id]/void/route.ts` TOCTOU — fixed on other worker branches
  (P1/W1 `84a9e42c`, P1/W2 `968bd0f4`), not yet on p1-w4. New this pass —
  flag for leader merge, don't re-fix.
- `create-tenant-from-lead.ts` missing atomic claim, `referrers.total_earned`
  / `total_paid` lost-update races — both still pending Jeff's DDL approval,
  now with a third same-shaped item (`clients` dedup indexes) joining the
  same pending-migration queue.
- `admin/cleanup-test-bookings` name-collision — Jeff's product-call
  pending.

No push, no deploy, no DB write this pass.
