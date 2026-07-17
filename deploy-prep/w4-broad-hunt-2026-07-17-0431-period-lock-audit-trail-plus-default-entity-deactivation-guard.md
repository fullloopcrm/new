# W4 broad hunt — 2026-07-17 04:31

## Queue (04:19 LEADER order)
1. Continue cross-archetype HR/payroll/finance depth.
2. Continue fresh-ground hunting.
3. Keep gap/fluidity current.

Both findings this round land squarely on both (1) and (2): both are inside
`lib/finance`/`app/api/finance`, and both are on route files that had never
had a fix commit this entire session (`periods/[id]` had 2 commits ever —
the original add + one unrelated touch; `entities/[id]` the same). Found by
sweeping every finance route with a low git-log commit count (a proxy for
"never actually audited") rather than re-walking already-hardened files.

## Finding 1: period lock/reopen — forgeable, always-blank audit trail

**Root cause.** `PATCH /api/finance/periods/[id]` is the monthly-close
control: locking a period blocks all `journal_entries` in that month for
the tenant (`trg_check_period_lock`, `035_close_audit.sql`) — a real
compliance gate. The route wrote a caller-supplied `body.actor_id` straight
into `locked_by`/`reopened_by` (plain `UUID` columns, **no FK constraint**)
whenever a period was locked or reopened. Any `finance.expenses` holder
(owner or admin role by default) could forge who performed the action via
a direct API call — no validation that the UUID corresponds to any real
user.

Worse: in real use, through the actual UI, those columns never held a
legitimate value *at all*. `dashboard/finance/close/page.tsx` never sends
`actor_id` in either PATCH call — so `locked_by`/`reopened_by` were
permanently `NULL` in practice, forged or not. And the caller's real,
trustworthy `userId` (from `getTenantForRequest()`) can be `'admin'` (PIN
admin) or a Clerk id — neither fits a `UUID` column, so no server-trusted
value could ever have been written there correctly in the first place.
Identical root cause to `hr_notes.author_id` / the already-open
`hr_documents_reviewed_by_name` gap from a prior round — same constraint,
different table.

On top of that, `accounting_periods` was never added to
`035_close_audit.sql`'s generic `audit_row_changes` trigger rollout list
(`invoices, bank_transactions, journal_entries, journal_lines, expenses,
recurring_expenses, chart_of_accounts, bank_accounts, entities, quotes,
documents, payments`) — so locking/reopening a period, the action that
gates an entire month's postings tenant-wide, produced **zero** rows in
the generic `audit_log` either. Net effect before this fix: nothing,
anywhere, records who locked or reopened a period.

**Fix.**
- `periods/[id]/route.ts`: dropped the `body.actor_id` trust entirely —
  `locked_by`/`reopened_by` are no longer written by the route.
- New PROPOSED migration
  (`2026_07_17_accounting_periods_audit_trigger_PROPOSED.sql`) attaches the
  existing `audit_row_changes` trigger to `accounting_periods`, so real
  attribution comes from the same `AsyncLocalStorage`-backed audit-context
  already resolving the actual authenticated actor
  (`pin_admin`/`tenant_member_pin`/`clerk_user`/`clerk_super_admin`) for
  every other financially-sensitive table. No new columns, no spoofable
  client input. File-only — Jeff applies the DDL.

**Verification.** New witness test
(`periods/[id]/route.witness.test.ts`, 2 tests): a forged `actor_id` in the
PATCH body for both the lock and reopen paths. RED without the fix
(`expect(row.locked_by).not.toBe(forgedUuid)` fails — the forged value
lands verbatim), GREEN with it (`git apply -R` / `git apply` round-trip,
same technique as every prior round).

## Finding 2: PATCH entities could deactivate the default entity DELETE blocks

**Root cause.** `DELETE /api/finance/entities/[id]` refuses to archive the
default entity: `"Cannot archive the default entity. Set another as
default first."` — because `getDefaultEntityId()` (`lib/entity.ts`) has
**no `active` filter**, and `invoices` (`api/invoices/route.ts:149`),
`finance/expenses` (`:63`), and `finance/bank-accounts` (`:53`) all fall
back to it via `body.entity_id || (await getDefaultEntityId(tenantId))`
whenever no explicit `entity_id` is supplied on create — the common path
for any tenant that hasn't set up multi-entity accounting.

`PATCH /api/finance/entities/[id]` accepts `active` as one of its
generically-whitelisted update fields with **no equivalent guard**, so
`{active: false}` on the default entity reaches the identical end state
DELETE exists specifically to prevent: `listEntities()`
(`.eq('active', true)`) makes the entity vanish from every entity-picker
dropdown across the app, while `getDefaultEntityId()` keeps silently
resolving to it — so every new invoice, expense, and bank account created
without an explicit `entity_id` after that point keeps flowing into an
entity that looks deleted to every user of the product. A tenant admin who
tries to "turn off" their default entity via the entity edit form (rather
than the archive/delete button) would trigger exactly this.

**Fix.** Mirrored DELETE's `is_default` check inside PATCH: if the update
would set `active: false` and the row is the default entity, reject with
400 and the same message DELETE already uses.

**Verification.** New witness test
(`entities/[id]/route.witness.test.ts`, 2 tests): `{active: false}` on the
default entity now 400s with the row untouched (RED without the fix: 200,
row deactivated); a control case confirms non-default entities still
deactivate normally. RED/GREEN round-tripped the same way.

## Verification (both fixes)

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched
  files.
- Full suite: 480/481 files passed, 1916/1919 tests passed (+4 net new
  tests / +2 files from this round), 1 pre-existing self-labeled "RED
  until fixed" placeholder (`cron/tenant-health/status-coverage-divergence.test.ts`,
  untouched), 1 skipped. Zero regressions.
- File-only, no push/deploy/DB writes. Commits `7dbd12d5`, `73c9efd9`.

## Gap/fluidity — 2 items closed, 0 new gaps opened, all carried items unchanged

- **CLOSED**: period lock/reopen forgeable/blank audit trail (commit
  `7dbd12d5`, migration pending Jeff's approval).
- **CLOSED**: PATCH-entities default-entity deactivation bypass (commit
  `73c9efd9`).
- All carried items unchanged from the 04:15 report: `fake-supabase.ts`
  has no support for PostgREST embedded-relation filters (blocks
  mutation-testing 3 ledger-report call sites); `admin/cleanup-test-bookings`
  hardcoded-name hard-delete flagged for Jeff, not fixed (product
  decision); partial-refund operational treatment; invoice-linked refund
  status/amount_paid_cents sync; live-DB second-payment ledger-gap audit;
  crews `setMembers()` status-check question; `activate-tenant.ts`
  fragmentation; 6 client-side dropdowns showing inactive employees;
  `hr_documents_reviewed_by_name` still `_PROPOSED.sql`; referrer
  atomic-bump RPCs still `_PROPOSED.sql`; payments dedup unique index
  unresolved; cancel-button hard-delete product call;
  `hr_document_reminders.document_id` CASCADE gap; `/api/client/recurring`'s
  dead `maxHoursClean`; `team_members.active`/`clients.active`
  drop-column migrations still `_PROPOSED.sql` pending Jeff's go;
  `journal_entries` dedup-constraint migration still `_PROPOSED.sql`.
- **New pending-DDL item added to the PROPOSED-migration backlog**:
  `2026_07_17_accounting_periods_audit_trigger_PROPOSED.sql` (this round).

Idle, awaiting next order.
