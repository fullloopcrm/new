# RLS Tier Rollout Order — the exact per-table enable order by risk

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Runbook only — no DDL run by W5, no prod changes.** The leader runs prod DDL after Jeff approves each gate._

## What this is

The granular, per-table **enable order** for turning RLS on across the 58 no-RLS tenant tables —
the numbered expansion of the 5-tier summary in `deploy-prep/rls-enablement-rollout-plan.md`. That
plan says *which order the tiers go in and which gate must pass*; this doc is the **row-by-row
checklist** the leader can tick through, one table at a time, most-sensitive first.

- **Source of the 58-table set + tiering:** `deploy-prep/rls-coverage-audit.md` (the gap list) and
  `deploy-prep/rls-enablement-rollout-plan.md` (Stage 2 tier table). This doc does not introduce new
  tables or a new policy shape — it only orders and sequences the ones already agreed.
- **The DDL that does the work:** `deploy-prep/rls-gap-closure.sql` (applies, per target,
  `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY tenant_isolation FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid) WITH CHECK (same)`). This ordering matches
  the `-- TIER N` banners in that file.

## The governing fact (why this order is safe to run before app cutover)

**Tenant isolation is 100% application-level today; `service_role` bypasses RLS.** Enabling RLS is
therefore **provably inert** until a table's call sites move off `service_role` onto a JWT-scoped
client (`SUPABASE_JWT_SECRET` not in prod yet). So this whole ordered enable is a no-op at deploy
time — the order matters only so that, **when RLS does become load-bearing**, the most sensitive
tables have had their backstop in place (and their verify gate passed) the longest. Full rationale:
`rls-enablement-rollout-plan.md` §"The one fact that governs the whole sequence."

## Hard precondition (do not start Tier 1 until this is true)

**Stage 1 NULL-tenant backfill = PASS** (`null-tenant-backfill-verify.sql` Query B prints `PASS`).
A `tenant_id` policy on a table with NULL-tenant rows silently drops those rows the moment reads are
scoped. `rls-gap-closure.sql`'s own precondition guard re-checks this and aborts the whole
transaction if any target still has a NULL `tenant_id` — but confirm the PASS first anyway.

## How to run it (two cadences — pick one)

- **Conservative (recommended): tier-by-tier.** Split `rls-gap-closure.sql` at the `-- TIER N`
  banners into 5 transactions. After each tier: run the coverage + inertness gates (below), confirm
  green, then advance. This is the "verify gate after each step" cadence.
- **Single-shot:** run `rls-gap-closure.sql` as one `BEGIN…COMMIT` (all 58). Faster, but the verify
  gate then covers all 58 at once — a failure is harder to localize. Only if Tier-1 dry-run was clean.

Within a tier the row order below is the apply order; it is finest-risk-first so that if you abort
mid-tier, the highest-sensitivity rows are already done.

---

## The ordered checklist (58 tables)

Legend: **PII/Fin** = why it ranks; **DSK** = the data-subject the row exposes if isolation fails.
Check each box only after that table shows `rls_enabled = t` + `policy_count ≥ 1` in Gate 2a.

### TIER 1 — CRITICAL PII / financial (8) — enable first

| # | Table | Why it's Tier 1 |
|---:|---|---|
| 1 | `clients` | Root customer identity: name/email/phone/address. Everything in §1 of the data map fans out from here. |
| 2 | `bookings` | Service address + **GPS check-in** (`check_in_lat/lng`) + `worker_token` + payment fields. |
| 3 | `invoices` | Contact snapshot (email/phone/address) + money + **public pay token**. |
| 4 | `bank_accounts` | Institution + account mask + balances. |
| 5 | `bank_transactions` | Counterparty names + amounts + check numbers + external (Plaid/OFX) ids. |
| 6 | `documents` | E-sign docs: storage paths, SHA-256, consent text; parent of signer PII. |
| 7 | `sms_conversations` | Customer phone + name + conversation state. (Cross-check anchor: known RLS-off in prod.) |
| 8 | `sms_conversation_messages` | **Message bodies** (inbound/outbound). |

- [ ] Tier 1 applied · [ ] Gate 2a green (8 rows) · [ ] Gate 2b: `service_role` still reads all rows

### TIER 2 — Finance / bookkeeping (14)

| # | Table | Why |
|---:|---|---|
| 9 | `invoice_activity` | Invoice audit trail (client-linked). |
| 10 | `quotes` | Quote line items + contact. |
| 11 | `quote_activity` | Quote audit trail. |
| 12 | `quote_templates` | Tenant quote config (low PII, grouped with finance). |
| 13 | `journal_entries` | Ledger. |
| 14 | `journal_lines` | Ledger detail. |
| 15 | `chart_of_accounts` | Ledger config. |
| 16 | `accounting_periods` | Ledger config. |
| 17 | `entities` | Legal entities (parent of `cpa_access_tokens`). |
| 18 | `bank_import_batches` | Imported statement batches. |
| 19 | `categorization_patterns` | Categorization config. |
| 20 | `recurring_expenses` | Recurring finance. |
| 21 | `products` | Catalog/config. |
| 22 | `cpa_access_tokens` | **External CPA bearer tokens** + cpa name/email — secret + third-party PII. |

- [ ] Tier 2 applied · [ ] Gate 2a green (14 rows) · [ ] Gate 2b clean

### TIER 3 — Documents (e-sign) + jobs/projects (7)

| # | Table | Why |
|---:|---|---|
| 23 | `document_signers` | **Signature image + consent/signed IP (INET) + user-agent** — highest-sensitivity artifact; ranked first in-tier. |
| 24 | `document_fields` | Field values on signed docs. |
| 25 | `document_activity` | E-sign activity trail. |
| 26 | `jobs` | Job records. |
| 27 | `job_events` | Job event trail. |
| 28 | `job_payments` | Payment linkage per job. |
| 29 | `projects` | Project records. |

- [ ] Tier 3 applied · [ ] Gate 2a green (7 rows) · [ ] Gate 2b clean

### TIER 4 — Core client / ops (14)

| # | Table | Why |
|---:|---|---|
| 30 | `booking_cleaners` | Crew↔booking assignment. |
| 31 | `booking_notes` | Free-text notes on jobs. |
| 32 | `cleaners` | Worker identity/roster. |
| 33 | `cleaner_payouts` | Worker compensation. |
| 34 | `crews` | Crew roster. |
| 35 | `recurring_schedules` | Client recurring schedules. |
| 36 | `schedule_issues` | Schedule exceptions. |
| 37 | `routes` | Dispatch routes (addresses). |
| 38 | `notifications` | Notification bodies quote client name/phone. |
| 39 | `settings` | Tenant settings. |
| 40 | `tenant_settings` | Tenant settings. |
| 41 | `tenant_invites` | Pending member invites (emails). |
| 42 | `member_pin_reset_codes` | **Credential-reset material** — treat as secret; ranked high in-tier. |
| 43 | `oauth_state_nonces` | **Auth nonces** — secret. |

- [ ] Tier 4 applied · [ ] Gate 2a green (14 rows) · [ ] Gate 2b clean

### TIER 5 — Messaging + sales/apps + logs (15)

| # | Table | Why |
|---:|---|---|
| 44 | `outreach_log` | Marketing message text sent to clients. |
| 45 | `yinez_memory` | AI memory — may quote customer PII. |
| 46 | `yinez_skills` | AI skill config. |
| 47 | `team_notifications` | Internal notifications. |
| 48 | `management_applications` | Applicant PII (resume/photo/video/references). |
| 49 | `management_application_drafts` | Applicant draft PII. |
| 50 | `sales_applications` | Applicant PII. |
| 51 | `team_applications` | Applicant PII (name/email/phone/address). |
| 52 | `referrers` | Referrer identity. |
| 53 | `client_referral_stats` | Referral stats (the one genuinely-nullable backfill target — confirm backfilled). |
| 54 | `campaigns` | Marketing campaigns. |
| 55 | `reviews` | Review text. |
| 56 | `google_reviews` | Synced review text. |
| 57 | `audit_log` | Actor + action trail. |
| 58 | `error_logs` | Error payloads (can leak PII). |

- [ ] Tier 5 applied · [ ] Gate 2a green (15 rows) · [ ] Gate 2b clean

---

## Verify gates (per tier or once at the end — from `rls-gap-closure-verify.sql`)

- **Gate 2a — coverage:** Query A returns every applied table with `rls_enabled = t` and
  `policy_count ≥ 1`; Query B returns 0 rows (no target left uncovered); Query C shows each
  `tenant_isolation` policy as `cmd = ALL`, role `{authenticated}`, predicate on `tenant_id`.
- **Gate 2b — inertness / no regression (the critical one):** as `service_role`, a plain
  `SELECT count(*)` on a table from the just-applied tier **still returns ALL rows.** RLS is
  bypassed for `service_role`; if any count drops to 0 or errors, something other than these inert
  policies changed — **stop and investigate before advancing.** At this stage the app is still on
  `service_role`, so a correct rollout changes *nothing* observable.

## Rollback (per table / per tier)

`rls-gap-closure.sql` is idempotent (`DROP POLICY IF EXISTS` + enable-is-no-op). To undo a table:
`DROP POLICY tenant_isolation ON <table>; ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`. Because
everything is inert while on `service_role`, rollback is behavior-neutral. The precondition guard
aborts the entire transaction before enabling anything if any target is missing / lacks `tenant_id` /
still has a NULL `tenant_id`.

## What this order deliberately excludes

- The **60 "RLS on, no policy"** and **11 deny-all stub** tables — already RLS-enabled; adding a
  positive `tenant_isolation` policy to them is a separate follow-up, not this 58-table enable pass.
- **`onboarding_tasks`** — already the one enforceable tenant policy (SELECT-only).
- **Public-read** (`territories`, `territory_claims`) and **platform** tables — intentionally not
  tenant-scoped.
- **Stage 3 (scoped-client cutover)** — where RLS actually starts enforcing. Out of scope here; see
  `rls-enablement-rollout-plan.md` Stage 3.

## One-line summary

**Backfill = PASS → enable Tier 1→5 in the numbered order above (inert, `service_role` bypasses) →
after each tier prove coverage (2a) and that `service_role` still reads every row (2b).**
