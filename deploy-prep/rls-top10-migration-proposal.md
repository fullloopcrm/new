# RLS Top-10 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 11:12 (back to
backlog, file-only, migrations authored not run)._

## What this is

A proposed migration adding `ENABLE ROW LEVEL SECURITY` + a tenant-scoped
policy to the 10 highest-risk tables among the 58 "no RLS at all" tenant
tables found by W5's `rls-coverage-audit.md` (`flwork-p1-w5/deploy-prep/`).

**File:** `platform/src/lib/migrations/2026_07_13_rls_top10_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## The 10 tables (leader-specified categories, expanded to include their
sensitive child tables)

| Table | Category | Why included |
|---|---|---|
| `clients` | core client | direct PII (name, contact, address) |
| `bookings` | core ops | schedule + client linkage |
| `sms_conversations` | messaging | PII, RLS explicitly off in prior verified audit |
| `sms_conversation_messages` | messaging | actual message *content* — higher sensitivity than the parent thread row |
| `invoices` | finance | billing amounts, client linkage |
| `invoice_activity` | finance | invoice event/audit trail |
| `bank_accounts` | finance | bank account metadata |
| `bank_transactions` | finance | transaction-level financial detail |
| `documents` | e-sign | signed documents (leases, contracts, W-9s, etc.) |
| `document_signers` | e-sign | signer PII + signature status |

All 10 were independently confirmed to already have `tenant_id UUID NOT NULL`
with an existing index (Stage 0 prerequisite in
`platform/docs/tenant-isolation-rls-plan.md` already satisfied for all 10) —
verified against their `CREATE TABLE` statements, not assumed.

## Critical caveat — this is inert today

Per W5's audit and the prior verified `tenant-isolation-rls-plan.md`: **every
API route uses the `service_role` client (`supabaseAdmin`), which bypasses RLS
unconditionally.** This migration has **zero effect on any live request path**
if run today. It only matters as:
1. A defense-in-depth backstop if `service_role` were ever misconfigured or a
   raw `pg` connection bypassed the app layer.
2. Prerequisite groundwork for the plan's Stage 2/3 (a request-scoped JWT
   client), which does not exist yet in this codebase.

**The live tenant-isolation gate today is application-level only** — each
query's `.eq('tenant_id', …)` filter. That was independently IDOR-swept clean
per `SECURITY-AUDIT-VERIFIED-2026-06-29.md`. This migration does not change
that fact either way.

## Policy shape decision (flagging for Jeff)

Two JWT-claim shapes exist in the codebase:
- **Used here (and in the one already-deployed policy, `onboarding_tasks`,
  plus `2026_07_11_enable_rls_gap_tables.sql`):**
  `current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'`
  compared as text.
- **Used in the plan doc's aspirational Stage 1 spec:** `(auth.jwt()->>'tenant_id')::uuid`.

I matched the **already-deployed** form for consistency. Both are equally
inert today. **Before anyone builds the Stage 2 scoped-JWT client, confirm
which claim shape it will actually mint** — if it's `auth.jwt()`-compatible
(Supabase's standard helper) rather than `current_setting`, these 10 policies
(and the pre-existing 4) will need to be rewritten to match, or the new
client's JWT will need to carry claims in the `request.jwt.claims` GUC shape
instead.

## Also unlike the one existing enforceable policy

`onboarding_tasks`'s policy is `FOR SELECT` only, no `WITH CHECK` — writes are
unguarded there even at the DB layer. These 10 proposed policies are `FOR ALL`
with a matching `WITH CHECK`, so inserts/updates would also be covered once a
scoped client exists. Flagging in case Jeff wants `SELECT`-only parity with
the existing precedent instead.

## What Jeff needs to do to run this (nothing has been executed)

1. Decide the JWT-claims shape question above (or accept `current_setting` as
   good enough for now — it's what's already live).
2. Run the migration against a **branch/sandbox Supabase DB first**, per the
   plan's Stage 1 risk control. Verify with the query at the bottom of the
   migration file (`rls_enabled = true, policy_count = 1` for all 10).
3. Re-verify `service_role`-backed API routes for these 10 tables still
   return 200 (proves inertness) before promoting to prod.
4. Run against prod. Rollback is `ALTER TABLE … DISABLE ROW LEVEL SECURITY;`
   per table (documented at the bottom of the migration file), no data risk —
   this migration adds no columns, drops nothing, and RLS is inert under
   service_role regardless of on/off state.

**I did not run any of this.** No DDL was executed in any environment. This
worker (W4) is READ-ONLY / FILE-ONLY per its lane assignment.

## Remaining scope not covered

48 of the 58 gap tables from W5's audit are not addressed by this migration —
out of scope for this pass (leader specified the 10 highest-risk only). The
full 58-table list is in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md` if a
follow-up pass is wanted; `settings`, `tenant_settings`, `quotes`, and
`journal_entries` were also bolded as high-sensitivity there but not included
in the leader's named category list for this pass.
