# Gap/fluidity checkpoint — W4, 2026-07-17 15:03

Per 14:55 order's fresh 3-deep queue. File-only, no push/deploy/DB.

## This pass

1. Fresh-ground surface: `finance/bank-import/route.ts` — CSV/OFX bank
   statement import, zero prior coverage. Found + fixed two distinct real
   bugs:
   - **Fingerprint race drops the whole losing batch.** A real Postgres
     UNIQUE index on `(bank_account_id, fingerprint)` already exists
     (applied, not proposed). Two different-sha256 imports sharing one
     overlapping transaction can race past the in-memory dedup snapshot;
     the loser's multi-row insert is rejected all-or-nothing by Postgres,
     silently dropping every other genuinely-new row in that file, leaving
     the batch's counts stuck at zero, and permanently blocking retry
     (sha256-reupload guard fires even though nothing was saved). RED via a
     deterministic forced-stale-read (Promise.all timing over real
     multipart parsing wasn't a reliable clock — tried first, dropped it).
     Fixed with the same row-by-row 23505 retry pattern as this session's
     `clients/import` fix, but this one is live today, not dormant.
   - **Missing `entity_id` propagation.** migrations/034_entities.sql added
     `entity_id` to `bank_accounts`, `bank_import_batches`, and
     `bank_transactions`, and `bank-accounts/route.ts` POST sets it
     correctly. `bank-import/route.ts` — the only currently-live path that
     inserts new `bank_transactions` rows (Plaid sync is documented as a
     future step, not built) — never read or forwarded it. Every CSV/OFX
     import landed with `entity_id` NULL, invisible to any
     `?entity_id=X`-scoped view for multi-entity tenants. RED-confirmed,
     fixed by selecting `entity_id` off the bank account and threading it
     onto both the batch row and each transaction row.
   - tsc clean (2 pre-existing unrelated errors, confirmed present via
     `git stash` before my edit). `npx vitest run src/app/api/finance` —
     48 files / 105 tests green, no regressions.
   - Full writeup:
     `w4-broad-hunt-2026-07-17-1459-bank-import-fingerprint-race-batch-drop-fix.md`.
2. Continued the surface: read `bank-connect/session/route.ts` (Stripe
   Financial Connections session start) — minor, low-severity finding only:
   two concurrent first-time-link POSTs before `stripe_customer_id` is set
   both create a Stripe customer and last-write-wins on the tenant row,
   leaving one orphaned unused Stripe customer object. Not a money-loss or
   data-integrity bug (no double charge, no lost data) — noted, not fixed,
   to keep this pass's diff focused on the two confirmed real bugs above.
   Re-read `bank-transactions/route.ts` (list) — clean, correctly
   tenant-scoped, entity filter behaves correctly now that import sets
   `entity_id`.
3. This checkpoint.

## Noticed, not fixed (flagging, not deciding)

- `bank-transactions/accept-suggestions/route.ts` and
  `bank-transactions/[id]/match/route.ts` both call `postJournalEntry(...)`
  without passing `entity_id`, even though the helper already supports it
  (`ledger.ts` line 96/115). After this pass's fix, an imported
  transaction now correctly carries its `entity_id` — but once it's
  matched/categorized and posted to the ledger, the resulting
  `journal_entries`/`journal_lines` rows still land with `entity_id` NULL.
  Same class of gap, one layer downstream. Did not fix this pass (would
  touch two more routes' journal-posting call sites) — worth a dedicated
  fresh-ground pass rather than folding into this one.

## Aging items still open (re-confirmed present, not re-litigated)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  — still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races — migrations
  proposed (2026-07-16), not wired, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `documents/[id]/void` TOCTOU fix — exists on P1/W1 (`84a9e42c`) and
  P1/W2 (`968bd0f4`), not yet on p1-w4. Leader merge note from the 15:08
  checkpoint still applies unchanged.

## Next-target candidates if continuing fresh-ground hunting

- The `postJournalEntry` entity_id gap noted above (2 call sites).
- `documents/[id]/route.ts` GET, `documents/[id]/signers/route.ts` (list),
  `documents/route.ts` (list/create), `documents/public/[token]/route.ts` —
  carried over from the 15:08 checkpoint, still unread.
- `bank-accounts/[id]/route.ts` — not yet read this session (has a
  `.witness.test.ts` already, so likely lower-signal, but worth confirming
  it also handles `entity_id` correctly on updates).

No push/deploy/DB write this pass.
