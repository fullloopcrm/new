# Renumber note: `061_nycmaid_routing_reconcile` → `063` (2026-07-12, W1)

## What changed
`061_nycmaid_routing_reconcile.sql` and its `.verify.sql` were renumbered **061 → 063**.
Internal self-references (RAISE/notice message prefixes, the `psql -f` run lines,
the reconcile `notes` string, the post-verify comment) were updated to `063` in the
same move. No SQL logic changed — this is a pure number/reference bump.

## Why
Two collisions forced the move off `061`:

| Slot | Owner | File |
|------|-------|------|
| `061` | **W2** | `061_unique_journal_entries.sql` (journal dedup unique index) |
| `062` | already taken | `062_add_tenant_id_inbound_emails.sql` (present in w3/w4/integration; assigned in the `integ/wave2` 060/061/062 run-order pack) |
| `063` | **W1 (this file)** | `063_nycmaid_routing_reconcile.sql` — next free slot |

W1 originally flagged only the `061` clash with W2. Checking the integration branch's
run-order pack showed `062` was **also** already claimed, so `062` would have been a
second collision — hence `063`.

## Apply-order impact: none
The nycmaid routing reconcile still runs **after** `055_tenant_domains_routing.backfill.sql`
and is safe after `056/059/060`. It only writes CHECK-valid `tenant_domains` values and
touches a different table than `061` (journal_entries) and `062` (inbound_emails), so its
position relative to those two is immaterial.

## Stale references to update (NOT changed here — flagged for the leader/integration)
These deploy-prep docs still call this migration `061` and now point at a filename that
no longer exists:
- `deploy-prep/rollback-note-per-migration.md` — the `#owner-phone`-adjacent apply-order
  line (`061 → 060 → …`) and the section headed `061` for the nycmaid reconcile reversal.
- `deploy-prep/rollback-plan.md` — its numbering note (already flagged stale in
  `rollback-note-per-migration.md`).
- `deploy-prep/migration-verify.sql` (integ/wave2) — its `061` entry is W2's journal
  dedup, which is correct; no change needed there, but confirm `063` gets its own
  verify entry when this lands.
