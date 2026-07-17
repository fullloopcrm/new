# W4 broad hunt — 2026-07-17 16:00

Redispatch per 15:53 LEADER order (post usage-limit-reset). File-only,
no push/deploy/DB.

## Fixed

**`documents/[id]/void` TOCTOU + tenant scope on UPDATE** — ported two
fixes that had already landed on P1/W1 (`84a9e42c`) and P1/W2 (`968bd0f4`)
but were missing from this branch:

1. The route read `doc.status` once, gated on `isTerminalStatus`, then
   unconditionally UPDATEd `status='voided'` with no re-check in the
   write's own WHERE. The public sign route's `finalizeDocument` (atomic
   per-signer claim → stamps `status='completed'` + writes the signed PDF
   + emails all parties) could land in the gap — an admin's void click
   racing a signer's final signature could silently revert an
   already-completed, already-emailed document back to `voided`.
2. The UPDATE was also missing the redundant `tenant_id` filter every
   sibling mutation in this feature carries (SELECT was already
   tenant-scoped, so never a live cross-tenant bug on the UUID-PK schema,
   but hardens against a future refactor loosening the read-side guard).

Fixed by re-asserting `.eq('status', doc.status).eq('tenant_id', tenantId)`
in the UPDATE, `maybeSingle()` + 409 on zero rows matched. 3 new tests
written in this worktree's own inline-mock style (W1/W2 used a shared
`supabase-fake`/`tenant-isolation-harness` helper that doesn't exist on
this branch — didn't port the helper itself, just matched the existing
convention already used by this dir's other `*-race.test.ts` files).
RED-confirmed via `git apply -R` (200 instead of 409, doc silently
clobbered). tsc --noEmit clean (2 pre-existing unrelated errors confirmed
present on HEAD too, not introduced). Full `documents/` suite 16/16
passed, 0 regressions. Committed as `ffa5530f`.

## Checked, no bug found

- **`payments.entity_id` never-set pass** (flagged twice in prior
  checkpoints as a candidate). Confirmed `postPaymentRevenue` already
  documents and correctly handles this: `payments.entity_id` is indeed
  never set on any of the 6 INSERT call sites, but the function
  deliberately derives `entity_id` from the linked booking/invoice rather
  than trusting the column, exactly because of this gap. Grepped every
  other reader of `entity_id` alongside a `payments` reference — the only
  other match was `bank_transactions.entity_id` (a different table,
  already correctly populated per this session's earlier passes). No live
  bug; closing this candidate.
- **Lower-signal read-endpoint candidates** from the 15:08/15:23
  checkpoints: `documents/[id]/route.ts` GET, `documents/[id]/signers/
  route.ts` (list), `documents/route.ts` (list/create),
  `documents/public/[token]/route.ts`. All four reviewed — tenant scoping
  correct on every authenticated route, and the public token route
  correctly masks other signers' field values (`value: f.signer_id ===
  signer.id ? f.value : null`). No bugs found.

## Aging items still open (re-confirmed present, not re-litigated)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  — still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races — migrations
  proposed (2026-07-16), not wired, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `post-labor.ts` / `postDepositToLedger` entity_id design decision —
  needs Jeff/leader input, not a straight copy of the postJournalEntry
  pattern already applied elsewhere.

## Next-target candidates if continuing fresh-ground hunting

Both explicit next-target candidates from the 15:23 checkpoint are now
closed out (documents void port done; payments.entity_id confirmed
clean). Suggest either the `post-labor.ts`/`postDepositToLedger` design
decision (needs input) or opening a fresh surface — no unread candidates
remain queued from this session's prior passes.

No push/deploy/DB write this pass.
