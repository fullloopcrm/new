# RLS Next-10 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 11:15 part
(a): "if RLS proposals for the 10 high-risk tables are done, extend to the
next 10 highest-risk no-RLS tables from W5's audit."_

## What this is

The first pass (`rls-top10-migration-proposal.md`, same day) covered the 10
highest-risk of the 58 "no RLS at all" tenant tables found by W5's
`rls-coverage-audit.md`. This is the **next 10**, same shape, same caveats.

**File:** `platform/src/lib/migrations/2026_07_13_rls_next10_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## The 10 tables

| Table | Category | Why included |
|---|---|---|
| `quotes` | pre-sale finance | client-facing pricing, PII-adjacent |
| `quote_activity` | pre-sale finance | quote event/audit trail — same tier as `invoice_activity` in pass 1 |
| `journal_entries` | accounting core | the general ledger itself |
| `journal_lines` | accounting core | ledger line items |
| `bank_import_batches` | finance | sibling of `bank_accounts`/`bank_transactions` (pass 1) |
| `cpa_access_tokens` | finance / access control | contains a literal bearer `token TEXT UNIQUE NOT NULL` granting an external accountant read access — a credential table, not just data |
| `tenant_settings` | tenant config | business/admin email, `stripe_customer_id`, billing notes |
| `entities` | accounting | legal/tax entity records |
| `job_payments` | finance | payment records tied to jobs |
| `audit_log` | security | tenant-scoped audit trail |

All 10 independently verified against their `CREATE TABLE`/`CREATE INDEX`
statements (not assumed) to satisfy the plan's Stage 0 prerequisite:
`tenant_id UUID NOT NULL` with an index that includes it. File citations are
in the migration's own header comment.

## Two tables explicitly excluded — flagging, not silently dropping

- **`document_fields`** — has `tenant_id UUID NOT NULL`, but **no index
  covers `tenant_id` at all** (only `idx_document_fields_doc` on
  `document_id` and `idx_document_fields_signer` on `signer_id`, per
  `031_documents.sql`). Fails Stage 0. Needs a small
  `CREATE INDEX ... ON document_fields(tenant_id)` migration first before it
  can get a policy — that index migration is not included here since it's a
  distinct, narrower change than this pass's scope.
- **`settings`** (the bare name, distinct from `tenant_settings` /
  `platform_settings`) — W5's audit lists it as a gap table, but **no
  `CREATE TABLE settings` exists anywhere in `migrations/` or
  `src/lib/migrations/`**. The only related hit is a comment in
  `migrations/2026_05_19_remaining_tables.sql`: `"settings → tenants table
  jsonb columns"`. Yet application code does call `.from('settings')` (e.g.
  `src/app/site/nyc-mobile-salon/_lib/settings.ts`), so a real table almost
  certainly exists in prod via ad-hoc SQL that never landed in a tracked
  migration — exactly the audit's own documented limitation ("prod could
  carry RLS state set by ad-hoc SQL that never landed in a migration file").
  **I will not author DDL against a schema I can't verify from source.**
  Before this table can get an RLS policy, someone needs to run `\d settings`
  against the live DB to confirm its actual columns (does it even have
  `tenant_id`? what type?), then it can be added in a follow-up.

Same critical caveat as pass 1 applies to all 10 here: **service_role
bypasses RLS unconditionally**, so this migration is provably inert on every
current request path — defense-in-depth only, prerequisite groundwork for a
future scoped-JWT client.

## What Jeff needs to do to run this (nothing has been executed)

Same four steps as pass 1 (decide JWT-claims shape / accept `current_setting`
as-is → run on sandbox first → verify `service_role` routes still 200 →
promote to prod). Rollback is `ALTER TABLE … DISABLE ROW LEVEL SECURITY;`
per table, no data risk.

**I did not run any of this.** No DDL was executed in any environment. This
worker (W4) is READ-ONLY / FILE-ONLY per its lane assignment.

## Remaining scope not covered

20 of the 58 gap tables are now addressed across the two passes (10 + 10).
38 remain, including `document_fields` (needs the index fix above first) and
`settings` (needs live-schema confirmation first). The rest — core
client/ops (`booking_cleaners`, `cleaners`, `crews`, `routes`, `notifications`,
`tenant_invites`, …), messaging logs (`outreach_log`, `yinez_memory`,
`team_notifications`), remaining finance (`quote_templates`,
`chart_of_accounts`, `accounting_periods`, `categorization_patterns`,
`recurring_expenses`, `products`), jobs/projects (`jobs`, `job_events`,
`projects`), e-sign (`document_activity`), and sales/applications
(`management_applications`, `referrers`, `campaigns`, `reviews`,
`google_reviews`, …) — are lower-sensitivity or not yet prioritized. Full
list in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md`.
