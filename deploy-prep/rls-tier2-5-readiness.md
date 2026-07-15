# RLS Tier 2–5 Readiness — fresh live NULL-`tenant_id` census (W2, read-only)

_Author: worker W2, branch `p1-w2`, 2026-07-15 14:30 ET. **Read-only only — no DDL/DML run,
nothing enabled, no prod write.** Scope: the 50 tables in Tier 2–5 of
`deploy-prep/rls-gap-closure.sql` (authored by W5 on `p1-w5`; Tier 1's 8 tables are already
covered by `rls-cutover-prep-summary-w2.md`, not repeated here)._

## Method

Two independent live reads, both read-only `SELECT`s against prod (`cetnrttgtoajzjacfbhe`,
confirmed as the FullLoopCRM prod Supabase project per multiple prior worker reports in
`LEADER-CHANNEL.md`):

1. A PostgREST head-count pass (`platform/scripts/rls-tier2-5-null-census.mjs`, service-role
   key from `platform/.env.local`) — `count=exact` on total rows and on `tenant_id IS NULL`.
2. A direct SQL probe via the Supabase Management API (`/v1/projects/{ref}/database/query`,
   `SUPABASE_ACCESS_TOKEN_FULLLOOP`, pattern documented in
   `platform/docs/runbooks/migration-runbook.md`) that **replicates the guard's own logic
   verbatim** — `to_regclass('public.<t>')` for existence, `information_schema.columns` for the
   `tenant_id` column, `count(*) FILTER (WHERE tenant_id IS NULL)` for the NULL count — all
   inside a temp table, `SELECT`-only, nothing persisted past the session.

Pass 2 is the authoritative one (it's the guard's exact code path, run directly against
Postgres, not through PostgREST's schema cache). Pass 1 surfaced the anomaly; pass 2 confirmed
it. Both agree on every row count. No table/index was touched; no lock beyond a normal read.

## Headline: 3 outcomes across the 50 tables

| Outcome | Count | Tables |
|---|---:|---|
| **Clean — guard would PASS** | 43 | see full table below |
| **BLOCKS THE ENTIRE GUARD — table doesn't exist in prod** | 5 | `booking_cleaners`, `cleaners`, `cleaner_payouts`, `settings`, `member_pin_reset_codes` (all Tier 4) |
| **Would FAIL the NULL check — needs backfill first** | 2 | `audit_log` (Tier 5, 905/47,725 NULL), `error_logs` (Tier 5, 2,515/2,547 NULL — 98.7%) |

## Finding 1 (new, higher severity than the NULL case) — 5 Tier 4 tables don't exist in prod at all

This is a **different failure mode than `sms_conversation_messages`'s Tier 1 trap** (that one
existed but had unstamped/mis-stamped `tenant_id`). These 5 don't exist as tables in prod at
all — `to_regclass('public.<t>')` returns NULL for all five, confirmed twice (PostgREST 404
`PGRST205 "Could not find the table … in the schema cache"`, and the direct-SQL probe).

**This matters more than any single NULL count**: `rls-gap-closure.sql`'s precondition guard
checks **one array of all 58 Tier 1–5 targets in a single `DO` block** and aborts the whole
transaction (`RAISE EXCEPTION`) if *any* target is missing — before a single `ALTER TABLE` runs,
including Tier 1. **As currently written, this script cannot succeed against prod even once
Tier 1's `sms_conversation_messages` issue and the `audit_log`/`error_logs` NULLs below are all
resolved** — the missing-table branch fires first and aborts everything, every time, until the
target list itself is fixed.

| Target name in `rls-gap-closure.sql` | Live status | PostgREST's fuzzy "did you mean" (unverified hint, not a confirmed equivalence) |
|---|---|---|
| `booking_cleaners` | does not exist | `booking_assignees` |
| `cleaners` | does not exist | `leads` |
| `cleaner_payouts` | does not exist | `team_member_payouts` |
| `settings` | does not exist | `ratings` |
| `member_pin_reset_codes` | does not exist | `verification_codes` |

**Cross-reference — this appears to correct an existing doc.** W5's
`schema-drift-register.md` (on `p1-w5`) classifies `cleaners` and `cleaner_payouts` as
**"PROD-ONLY (no in-repo `CREATE TABLE`) — confirm live"**, i.e. it assumed these tables exist
in prod but were never tracked in a migration, and recommended someone run `\d public.cleaners`
to confirm. I ran the live-DB equivalent of that confirmation just now — both direct SQL
`to_regclass` and PostgREST agree neither table exists. That doc's live-state assumption looks
wrong (or prod has drifted since it was written); flagging for W5/leader to reconcile, not
editing that file myself (it's on `p1-w5`, out of my lane). Also worth noting: this repo has NO
in-repo `CREATE TABLE` for any of these 5 names, so this isn't a code-vs-prod migration gap —
the target names in the gap-closure script's array may simply not be current live table names
(possibly renamed, e.g. `booking_cleaners` → `booking_assignees`, one of 3 competing
cleaner-assignment join tables per an earlier W2 leader-channel note), or the feature was never
actually shipped to this schema.

**What this needs before Tier 2–5 can run:** someone (leader/Jeff) needs to decide, per table,
whether to (a) drop it from the guard's target array and the corresponding `ALTER
TABLE`/`CREATE POLICY` block if the feature doesn't exist, or (b) fix the name to match the
actual live table. I did not touch `rls-gap-closure.sql` (it's on `p1-w5`) or draft a fix — this
is a naming/scope decision, not a mechanical one.

## Finding 2 — `audit_log` and `error_logs` would fail the NULL check, same class as `sms_conversation_messages`

| Table | Total rows | NULL `tenant_id` | % NULL | Column declared |
|---|---:|---:|---:|---|
| `audit_log` | 47,725 | 905 | 1.9% | `tenant_id UUID NOT NULL` (migration `035_close_audit.sql`) |
| `error_logs` | 2,547 | 2,515 | **98.7%** | `tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL` (migration `006_error_resilience.sql`) — **nullable by design** |

Two very different situations under the same guard failure:

- **`audit_log` is a real backfill target.** Its column is declared `NOT NULL` in the migration
  that creates it — live prod having 905 NULL rows means either legacy rows predate that
  constraint (table pre-existed `035_close_audit.sql`'s `CREATE TABLE IF NOT EXISTS`, so the
  constraint was never retroactively applied — the `IF NOT EXISTS` guard doesn't backfill an
  existing table), or the constraint isn't actually live despite the migration file. Either way
  this is the same shape as `null-tenant-backfill-audit.md`'s core case: 905 real orphan rows
  that need attribution + backfill before Tier 5 can enable RLS on this table, exactly per ADR
  0005's hard precondition.

- **`error_logs` is a different, more consequential case — do not treat it as a plain backfill
  target without a product decision.** Its `tenant_id` column is declared nullable *by design*
  (`ON DELETE SET NULL`), and at 98.7% NULL, the overwhelming majority of rows are presumably
  system/global errors (webhook failures, cron jobs, unauthenticated-route errors, startup
  failures) that have no tenant to attribute to — the same semantic category as
  `null-tenant-backfill-audit.md`'s **excluded** `system_state`/`prospects` tables, not the
  "legacy orphan" category. Backfilling ~2,500 rows to a single tenant (e.g. nycmaid, the
  documented default) would misattribute nearly all of them. Applying the standard
  `tenant_isolation` policy here would also hide virtually the entire table from any
  scoped-client read once Stage D converts this table's call sites. **This table likely needs
  the same exclude-from-RLS treatment as `system_state`/`prospects`, not a backfill** — but
  that's a call for Jeff/leader, not something I'm deciding here.

## Finding 3 — the other 43 tables: clean

All exist, all have a `tenant_id` column, all show **0** NULL rows (both passes agree). Full
detail:

| Tier | Table | Total rows | NULL `tenant_id` |
|---|---|---:|---:|
| 2 | `invoice_activity` | 0 | 0 |
| 2 | `quotes` | 2 | 0 |
| 2 | `quote_activity` | 8 | 0 |
| 2 | `quote_templates` | 0 | 0 |
| 2 | `journal_entries` | 920 | 0 |
| 2 | `journal_lines` | 1,840 | 0 |
| 2 | `chart_of_accounts` | 288 | 0 |
| 2 | `accounting_periods` | 0 | 0 |
| 2 | `entities` | 7 | 0 |
| 2 | `bank_import_batches` | 0 | 0 |
| 2 | `categorization_patterns` | 0 | 0 |
| 2 | `recurring_expenses` | 0 | 0 |
| 2 | `products` | 0 | 0 |
| 2 | `cpa_access_tokens` | 0 | 0 |
| 3 | `document_signers` | 2 | 0 |
| 3 | `document_fields` | 4 | 0 |
| 3 | `document_activity` | 0 | 0 |
| 3 | `jobs` | 0 | 0 |
| 3 | `job_events` | 0 | 0 |
| 3 | `job_payments` | 0 | 0 |
| 3 | `projects` | 0 | 0 |
| 4 | `booking_notes` | 40 | 0 |
| 4 | `crews` | 0 | 0 |
| 4 | `recurring_schedules` | 40 | 0 |
| 4 | `schedule_issues` | 2,332 | 0 |
| 4 | `routes` | 0 | 0 |
| 4 | `notifications` | 27,055 | 0 |
| 4 | `tenant_settings` | 1 | 0 |
| 4 | `tenant_invites` | 0 | 0 |
| 4 | `oauth_state_nonces` | 0 | 0 |
| 5 | `outreach_log` | 331 | 0 |
| 5 | `yinez_memory` | 1,298 | 0 |
| 5 | `yinez_skills` | 2 | 0 |
| 5 | `team_notifications` | 0 | 0 |
| 5 | `management_applications` | 6 | 0 |
| 5 | `management_application_drafts` | 3 | 0 |
| 5 | `sales_applications` | 0 | 0 |
| 5 | `team_applications` | 208 | 0 |
| 5 | `referrers` | 14 | 0 |
| 5 | `client_referral_stats` | 0 | 0 |
| 5 | `campaigns` | 5 | 0 |
| 5 | `reviews` | 57 | 0 |
| 5 | `google_reviews` | 0 | 0 |

(43 rows — Tier 4's `booking_cleaners`/`cleaners`/`cleaner_payouts`/`settings`/
`member_pin_reset_codes` and Tier 5's `audit_log`/`error_logs` excluded here, covered above.)

## Bottom line for the leader

Nothing was enabled. Three things block Tier 2–5 from a clean guard pass today, in order of
what actually stops execution first:

1. **5 missing-table targets (Tier 4)** — abort the whole `DO` block immediately, before any
   NULL check even runs. Needs a naming/scope decision (drop vs. rename in the target array +
   corresponding policy block), not a backfill.
2. **`audit_log` (Tier 5)** — 905 NULL rows, straightforward backfill candidate once (1) is
   fixed.
3. **`error_logs` (Tier 5)** — 2,515 NULL rows (98.7%), but likely the wrong fix is backfill;
   probably belongs in the `system_state`/`prospects` RLS-exclude bucket instead. Needs a
   product call before either backfilling or excluding.

The other 43 of 50 Tier 2–5 targets are clean and guard-ready today, contingent on (1) and (2)/
(3) being resolved first since the guard evaluates all 58 Tier 1–5 targets as one atomic
precondition.
