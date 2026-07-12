# RLS Enablement Rollout Plan — the safe ordered sequence to turn RLS on

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Runbook only — no DDL/DML run by W5, no prod changes.** The leader runs prod DDL after Jeff approves each gate._

## What this is

The single ordered runbook that consolidates the W5 RLS trilogy into the actual
sequence to enable Row-Level Security tenant isolation without silent data loss:

1. **`deploy-prep/rls-coverage-audit.md`** — the map: 132 `tenant_id` tables, **58 with
   no RLS at all**, exactly **1** enforceable tenant policy (`onboarding_tasks`, `SELECT`-only).
2. **`deploy-prep/null-tenant-backfill.sql`** (+ `-audit.md`, `-verify.sql`) — the hard
   precondition: every row RLS will scope must have a non-NULL `tenant_id` first.
3. **`deploy-prep/rls-gap-closure.sql`** (+ `-verify.sql`) — the enable step: `ENABLE ROW
   LEVEL SECURITY` + a `tenant_isolation` `FOR ALL` policy on all 58 no-RLS tables,
   ordered highest-risk tier first, behind a precondition guard.

This plan is the ordering and gating that ties those three together. It changes no schema
on its own; it says **in what order the leader applies the existing files, and which verify
gate must pass before advancing.**

## The one fact that governs the whole sequence (ADR 0005)

**Tenant isolation today is 100% application-level.** Every route uses the Supabase
`service_role` client (`supabaseAdmin`), and **`service_role` bypasses RLS entirely.** The
live tenant gate is each query remembering `.eq('tenant_id', …)` (IDOR sweep in
`SECURITY-AUDIT-VERIFIED-2026-06-29.md` came back clean).

Consequence for rollout: **enabling RLS is provably inert at deploy time.** A
`tenant_isolation` policy has zero runtime effect until that table's call sites move off
`service_role` onto a scoped (JWT `tenant_id` claim) client. That is what makes this rollout
safe to stage ahead of the app cutover — and it is also the dependency that decides when RLS
actually *starts enforcing*. The two are the same fact seen from both ends:

- **Before scoped-client cutover:** RLS on = backstop, no behavior change. Safe to enable broadly.
- **At/after scoped-client cutover (per table):** RLS becomes load-bearing. From that moment,
  a NULL-tenant_id row or a wrong policy predicate is a real, silent read regression.

So the null-backfill precondition is not paperwork — it is the thing that prevents Stage 3
from silently dropping rows the day a table's reads move to the scoped client.

## Prerequisites that gate the whole plan (ADR 0005 Stage 0)

None of the enforcing behavior can exist until these are true. They do **not** block Stage 1
(backfill) or Stage 2 (enable, inert) — they block only the point where RLS goes live:

- **`SUPABASE_JWT_SECRET` in prod env.** The policy predicate reads
  `auth.jwt() ->> 'tenant_id'`; minting that claim needs this secret. Not in prod yet.
  Until it is, no request carries the claim → authenticated access is default-denied and only
  `service_role` (bypass) works — the intended inert state.
- **A scoped client (`tenantClient`) path** that sets `role='authenticated'` and the
  `tenant_id` claim. Not in prod yet. Stages 1–2 are staged *ahead* of this on purpose.

## The ordered sequence

Each stage has: **action → who runs it → the verify gate that must pass before advancing.**
No stage advances on a failed or skipped gate.

### Stage 0 — Confirm live state matches the migration-derived map

**Why first:** the audit and backfill files are derived from migration files, **not a live
DB read.** A migration that enables RLS may not have applied; a table may be dropped/renamed;
prod may carry out-of-band RLS state. Confirm before acting.

- **Action:** run the three read-only queries at the bottom of `rls-coverage-audit.md`
  against prod (`pg_class.relrowsecurity`, `pg_policy`, `pg_policies`). Pure SELECTs.
- **Runner:** leader (read-only; safe).
- **Gate:** live output reconciles with the 132-table matrix. Any table where live RLS/policy
  state differs from the matrix is triaged (unapplied migration / renamed table / out-of-band
  SQL) **before** Stage 1. Cross-check anchor already known-good: `sms_conversations` = RLS off
  in both this audit and the prod-verified tenant-isolation plan.

### Stage 1 — NULL-tenant_id backfill (the hard precondition)

**Why before enable:** once a `tenant_id = <claim>` policy is enabled *and* a table's reads
are scoped, any NULL-tenant_id row matches no tenant and **silently vanishes** from every
scoped read. Fill NULLs while `service_role` still reads everything, so the fix is observable
and reversible.

- **Action 1 (census, read-only):** run `null-tenant-backfill-verify.sql` **Query A-EXEC**.
  Eyeball NULL counts per table.
- **Gate 1a (human attribution check — assumption-stacking guard):** the backfill assigns
  NULL → nycmaid (`00000000-0000-0000-0000-000000000001`) on the assumption every legacy NULL
  is nycmaid's (true for pre-tenant_id data). **If prod now has multiple live tenants and any
  table shows a non-trivial NULL count, a human decides attribution before applying. Do not
  apply blind.** Expected shape: near-zero NULLs, because 115 of 118 flagged tables declare
  `tenant_id NOT NULL` in migrations — for them the backfill is a no-op safety net.
- **Action 2 (backfill, DML):** run `null-tenant-backfill.sql`. It is idempotent
  (`WHERE tenant_id IS NULL` only — never touches existing non-NULL rows of nycmaid or any
  other tenant), guarded by table-exists + column-exists checks (skip-with-NOTICE otherwise).
  Review NOTICEs, then COMMIT. Targets the **116** tenant-scoped flagged tables; **excludes**
  `system_state` (global platform flags) and `prospects` (converted-tenant pointer) —
  backfilling either would wrongly scope a valid-NULL row.
- **Action 3 (optional lock):** uncomment the `client_referral_stats … SET NOT NULL` line to
  lock the one genuinely-nullable backfill target after it is clean.
- **Gate 1b (proof):** run **Query B** → must print **`PASS`** (0 NULLs across all targets).
  Only a `PASS` here makes Stage 2 safe. (Stage 2's own guard re-checks this independently.)

### Stage 2 — Enable RLS + tenant policy, highest-risk tier first (inert)

**Why safe now:** with `SUPABASE_JWT_SECRET` still absent and all reads on `service_role`,
enabling RLS has **zero runtime effect**. This stage stages the DB-level backstop ahead of
the app cutover. Order is highest-PII/financial first so the most sensitive tables gain the
backstop earliest.

- **Action:** run `rls-gap-closure.sql`. Its **precondition guard** aborts the entire
  transaction (before any RLS is enabled) if any of the 58 targets is missing, lacks a
  `tenant_id` column, or still has a NULL `tenant_id` — enforcing Stage 1, not just trusting
  it. Applies, per target: `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY tenant_isolation …
  FOR ALL TO authenticated USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid) WITH CHECK
  (same)`. Idempotent (`DROP POLICY IF EXISTS` + enable-is-no-op).
- **Runner:** leader, after Jeff approves and Gate 1b = PASS.

**Per-risk-tier enable order (58 tables, applied in this sequence within the one transaction):**

| Tier | Risk | Count | Tables |
|---|---|---:|---|
| **1** | CRITICAL PII / financial | 8 | `clients`, `bookings`, `invoices`, `bank_accounts`, `bank_transactions`, `documents`, `sms_conversations`, `sms_conversation_messages` |
| **2** | Finance / bookkeeping | 14 | `invoice_activity`, `quotes`, `quote_activity`, `quote_templates`, `journal_entries`, `journal_lines`, `chart_of_accounts`, `accounting_periods`, `entities`, `bank_import_batches`, `categorization_patterns`, `recurring_expenses`, `products`, `cpa_access_tokens` |
| **3** | Documents (e-sign) + jobs/projects | 7 | `document_signers`, `document_fields`, `document_activity`, `jobs`, `job_events`, `job_payments`, `projects` |
| **4** | Core client / ops | 14 | `booking_cleaners`, `booking_notes`, `cleaners`, `cleaner_payouts`, `crews`, `recurring_schedules`, `schedule_issues`, `routes`, `notifications`, `settings`, `tenant_settings`, `tenant_invites`, `member_pin_reset_codes`, `oauth_state_nonces` |
| **5** | Messaging + sales/apps + logs | 15 | `outreach_log`, `yinez_memory`, `yinez_skills`, `team_notifications`, `management_applications`, `management_application_drafts`, `sales_applications`, `team_applications`, `referrers`, `client_referral_stats`, `campaigns`, `reviews`, `google_reviews`, `audit_log`, `error_logs` |

> Note: the current file applies all 58 in one `BEGIN…COMMIT`. To roll out tier-by-tier
> (enable Tier 1, verify, then Tier 2…), split at the `-- TIER N` banners into separate
> transactions. The plan supports either; per-tier is the more conservative gate cadence and
> matches "verify gate after each step."

- **Gate 2a (coverage):** run `rls-gap-closure-verify.sql` — **Query A** returns 58 rows, every
  one `rls_enabled = t` and `policy_count >= 1`; **Query B** returns 0 rows; **Query C** shows
  each `tenant_isolation` policy as `cmd = ALL`, roles `{authenticated}`, predicate on `tenant_id`.
- **Gate 2b (inertness / no regression — the critical one):** as `service_role`, a plain
  `SELECT count(*) FROM clients;` (and a sample from each tier) **must still return ALL rows.**
  RLS is bypassed for `service_role`; if any count drops to 0 or errors, something other than
  these inert policies changed — **stop and investigate before any further stage.** This is the
  "no tenant-read regression" gate: at this point the app is still on `service_role`, so a
  correct rollout changes *nothing* observable.

### Stage 3 — Scoped-client cutover (RLS goes live, per table) — OUT OF SCOPE for this trilogy

This is where RLS stops being inert. It is **not** in the W5 trilogy and is **not** run by any
prep file here — it is the plan's Stages 2–3 (app work). Recorded so the ordering is complete:

- **Prereq:** `SUPABASE_JWT_SECRET` in prod + the `tenantClient` path minting `role=authenticated`
  and the `tenant_id` claim (Stage 0 prerequisites above).
- **Action:** migrate a table's call sites from `service_role` to the scoped client. From that
  moment RLS enforces for that table.
- **Verify gate after each table (no tenant-read regression):** as an authenticated request with
  a valid `tenant_id` claim, reads/writes return exactly that tenant's rows and nothing else;
  cross-tenant access returns zero rows; the tenant's own row counts match the pre-cutover
  `service_role` baseline (no rows silently dropped). Roll one table (or tier) at a time; a failed
  gate rolls that table's call sites back to `service_role` (RLS returns to inert) while the
  predicate/claim mismatch is fixed.

## Rollback posture per stage

| Stage | If the gate fails | Reversibility |
|---|---|---|
| 0 (confirm) | triage the diff; do not advance | read-only, nothing to undo |
| 1 (backfill) | Gate 1a: human attributes NULLs before applying. Gate 1b ≠ PASS: fix data, re-run (idempotent) | DML fills only NULLs; existing rows untouched |
| 2 (enable) | guard aborts the whole txn before any RLS enabled; or `DROP POLICY tenant_isolation` + `DISABLE ROW LEVEL SECURITY` per table | fully reversible; inert either way while on `service_role` |
| 3 (cutover) | revert call sites to `service_role` → RLS returns to inert | reversible per table |

## Method & limitation (inherited from the trilogy)

Every table/RLS/NULL/declaration claim in the source files is **derived from migration files**
(`platform/migrations/*.sql` + `platform/src/lib/migrations/*.sql`), **not a live DB read.**
That is exactly why **Stage 0 exists and every stage ends in a live verify gate.** The plan is
only as correct as those gates confirm; a migration that never applied, a renamed/dropped table,
or out-of-band prod RLS state all surface at Stage 0 or the per-stage verify — by design.

## One-line summary of the order

**Confirm live state → backfill NULLs to PASS → enable RLS tier-1-first (inert) & prove
service_role still reads all → (later, out of trilogy) cut each table to the scoped client &
prove no tenant-read regression.**
