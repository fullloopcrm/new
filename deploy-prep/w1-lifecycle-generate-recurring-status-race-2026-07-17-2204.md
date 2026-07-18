# W1 — cron/lifecycle + cron/generate-recurring: check-then-blind-write status races

**Date:** 2026-07-17 22:04 ET
**Worker:** W1 (schema + backfill lane, tenant_domains)
**Files:** file-only, no push/deploy/DB command run

## Background

Continuing this session's claim-before-write sweep across `cron/*`. The
previous round's doc (`w1-noshow-healthcheck-status-race-notes-overwrite-
2026-07-17-2200.md`) ruled `lifecycle` and `generate-recurring` clean for
this bug class on structural grounds alone ("status transitions driven by
fresh aggregate queries, no narrow candidate-then-write gap"). That
reasoning didn't check for an actual *external* writer to the same
column — re-auditing both against real concurrent write paths in the
codebase (not just the cron's own internal shape) found the same race in
both. **Correcting that prior "not touched / ruled clean" note.**

## What was broken

### 1. `cron/lifecycle` — client status flips overwrote a concurrent status edit

Two blocks, both the same shape: SELECT candidates by `status`, run one or
two `bookings` lookups to narrow the set, then bulk `UPDATE ... WHERE
tenant_id=... AND id IN (...)` — never re-checking `status` in the write
itself. Confirmed real concurrent writers to `clients.status`:
`PATCH /api/clients/[id]` (admin can set status to anything), and
`/api/lead` + `/api/ingest/lead` (both set `status:'active'` on an existing
client match). A status change from either landing in the gap between the
candidate SELECT and the bulk UPDATE — two sequential `bookings`
round-trips per tenant, easily seconds on 1000+ tenants — got silently
stomped back to `'inactive'`/`'active'` by this cron.

### 2. `cron/generate-recurring` — auto-resume overwrote a concurrent re-pause

The NYC-Maid-scoped auto-resume block (added for the ET/day-boundary fix
earlier this session) selects `recurring_schedules` where
`status='paused' AND paused_until<=today`, then per-row `UPDATE ...
.eq('id', s.id)` sets `status:'active', paused_until:null` — no re-check.
Confirmed writer: `POST /api/admin/recurring-schedules/[id]/pause` lets an
admin re-pause with a NEW (later) `paused_until`. Landing in the gap, that
re-pause got silently reverted to `'active'`, reactivating a schedule the
admin just explicitly extended.

## Fix

Both re-assert the exact condition that made the row a candidate inside
the UPDATE's own WHERE, counting/trusting only what the write itself
claimed:

- `lifecycle`: added `.eq('status', 'active')` / `.eq('status', 'inactive')`
  to the respective UPDATEs, switched to `.select('id')` and count actual
  claimed rows instead of the pre-computed candidate-list length.
- `generate-recurring`: added `.eq('status', 'paused').lte('paused_until',
  todayStr)` to the auto-resume UPDATE (no counter existed to adjust here —
  fix is pure write-guard).

No migration needed — no new columns, no backfill, pure write-guard fixes.

## Verification

- `lifecycle`: new `route.claim-before-write-race.test.ts` (4 tests) — two
  getter-based store-interception races (one per direction: inactivate and
  reactivate) prove a concurrent status change survives the cron untouched;
  two control tests prove genuine transitions still flip and still count
  correctly.
- `generate-recurring`: new `route.auto-resume-race.test.ts` (2 tests) —
  same interception technique on the `recurring_schedules` store, proves a
  concurrent re-pause survives; existing `route.auto-resume-et.test.ts` (the
  ET/day-boundary test from earlier this session) still green, confirming
  the new filter doesn't reintroduce that bug.
- `tsc --noEmit`: clean on both touched route files and both new test
  files (0 new errors). Pre-existing baseline noise only, unrelated to this
  change (stale `.next` admin-auth generated types, 2 known pre-existing
  test-signature mismatches in `cron/outreach`/`cron/payment-reminder`, and
  another worker's untracked `sunnyside-clean-nyc/_lib/site-nav.ts`).
- Full suite: 605/605 files, 3250 passed + 1 expected fail (same one
  flagged all session by other workers), 0 regressions (net +6 tests vs.
  this round's starting baseline).
- Committed `a7157fa2` (lifecycle) and `4675fb9b` (generate-recurring),
  file-only, no push/deploy/DB.

## Not touched / flagged for next round

- **`cron/schedule-monitor`'s self-healing reconcile** (`schedule_issues
  .update({status:'resolved',...}).in('id', staleIds)`, line ~270) — same
  bug class, **also incorrectly ruled clean by the previous round's doc**
  ("no external writer ever touching schedule_issues.status
  concurrently"). Confirmed writers exist: `PATCH /api/admin/schedule-
  issues` (admin sets status to anything, including `dismissed`) and
  `POST /api/admin/schedule-issues/fix` (sets `status:'resolved'` with its
  own `resolution_note`). An admin dismissing or manually resolving an
  issue in the gap before this cron's auto-resolve sweep would have their
  action silently overwritten with the generic auto-resolution note. Not
  fixed this round — flagging so the next pass doesn't have to
  re-discover it.
- **`cron/generate-monthly-invoices`** line ~108
  (`.update({invoice_id: invoice.id})` on a schedule row after invoice
  creation) — not yet audited against this bug class; worth a look next
  round.
- **`cron/recurring-expenses`** — `postJournalEntry`'s dedup is DB-enforced
  (RPC unique constraint, confirmed safe, same as the finance-post surfaces
  below), but the `recurring_expenses.update({next_due_date: advance(...)})`
  write after a successful/already-posted fire doesn't re-check
  `next_due_date` against the row's current value. Two overlapping
  invocations would compute the same next date from the same stale
  snapshot (not a corruption), but this is worth a closer look if this
  cron ever gains an admin edit path for `next_due_date`/`frequency` mid-
  flight — currently no such endpoint exists, so not flagged as exploitable
  today, just noted.
- **`src/lib/finance/{post-revenue,post-labor,post-adjustments}.ts`** —
  audited the same `journalEntryExists()`-then-`postJournalEntry()` shape
  across all three; **confirmed already race-safe**, not a gap. The RPC
  (`post_journal_entry`, migration 064) enforces `(tenant_id, source,
  source_id)` uniqueness at the DB level and returns `NULL` on a duplicate
  instead of throwing — the caller's pre-check `SELECT` is a fast-path
  only, not the real idempotency gate. No action needed.
- **`/api/lead` + `/api/ingest/lead`** — both do candidate-SELECT-by-phone
  then INSERT-if-not-found for new clients; a check-then-insert race under
  concurrent duplicate submission (double-click, retried form POST) could
  create two client rows for the same phone. Rate-limited (5 req/10min/IP)
  which narrows but doesn't close the window. Not investigated deeply this
  round (public unauthenticated surface, heavily audited already this
  session for PII/XSS/dedupe-correctness — different bug family, flagging
  for a dedicated pass rather than folding in here).
- `tenant_domains` schema lane (043/055/056/068/069/primary-invariant/
  domain-normalization/vercel-registration) reconfirmed intact — this
  round's fixes are entirely in `clients`/`recurring_schedules`, outside
  that table, no drift.
