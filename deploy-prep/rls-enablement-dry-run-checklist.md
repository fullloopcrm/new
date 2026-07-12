# RLS enablement dry-run checklist — the pre-flight to run BEFORE enabling RLS

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Checklist only — W5 runs no DDL/DML.** The
leader runs each item against prod after Jeff approves; every mutating step is gated below._

## What this is

The concrete pre-flight for `rls-gap-closure.sql` (enable RLS + `tenant_isolation` policy on the
58 no-RLS tables). It is the checklist form of `rls-enablement-rollout-plan.md` Stages 0–2, plus
one thing that plan describes but doesn't script: **an actual dry run** — apply the enable
transaction and `ROLLBACK` to prove the precondition guard passes and nothing errors, without
committing. Nothing here changes prod state that outlives a `ROLLBACK`, except the two backfill
items which are gated separately.

**Run every section in order. A section with a failed/blank gate blocks the next.** This is a
gate list, not a to-do list.

## Section 0 — Live-state reconciliation (read-only)

The trilogy is **migration-derived, not a live read** — confirm prod matches before touching it.

- [ ] **0.1** Run the three read-only queries at the bottom of `rls-coverage-audit.md`
      (`pg_class.relrowsecurity`, `pg_policy`, `pg_policies`) against prod.
- [ ] **0.2** Reconcile output with the 132-table matrix. Any table whose live RLS/policy state
      differs from the matrix is triaged (unapplied migration / renamed / dropped / out-of-band
      SQL) **before** proceeding.
- [ ] **0.3** Anchor check: `sms_conversations` shows RLS **off** in prod (matches both the audit
      and the prod-verified isolation plan). If it's already on, stop — prod carries out-of-band
      state the trilogy doesn't model.
- **GATE 0:** live state reconciles with the matrix, or every diff is explained. ▢ PASS ▢ FAIL

## Section 1 — Schema-drift resolved for the target tier (read-only)

RLS predicates and the precondition guard assume the columns they name exist. A drifted or
prod-only column breaks the guard or the policy silently.

- [ ] **1.1** Confirm every target table in the tier being enabled has a **non-nullable-capable**
      `tenant_id` column present in prod (`\d <table>`), not just in migrations.
- [ ] **1.2** Cross-check `schema-drift-register.md`: no target field in this tier is **PHANTOM**
      or unresolved **PROD-ONLY**. Specifically confirm live schema for `cleaner_payouts` and
      `cleaners` (Tier 4) — they have **no in-repo `CREATE TABLE`**; `\d public.cleaner_payouts`
      and `\d public.cleaners` before they enter any RLS-dependent path.
- **GATE 1:** every column an RLS predicate or the guard references is confirmed present in prod.
  ▢ PASS ▢ FAIL

## Section 2 — NULL-tenant_id backfill proven (the hard precondition)

Once RLS is on **and** a table's reads are scoped, any NULL-`tenant_id` row matches no tenant and
silently vanishes. Prove there are none before enabling. (Runs while `service_role` still reads
everything, so it's observable and reversible.)

- [ ] **2.1 (census, read-only)** Run `null-tenant-backfill-verify.sql` **Query A-EXEC**;
      eyeball NULL counts per table.
- [ ] **2.2 (attribution gate — assumption guard)** If prod has multiple live tenants **and** any
      table shows a non-trivial NULL count, a **human** attributes those NULLs before applying
      the backfill. Do **not** apply the NULL→nycmaid default blind. Expected shape: near-zero
      NULLs (115 of 118 flagged tables declare `tenant_id NOT NULL` in migrations).
- [ ] **2.3 (backfill, DML — gated)** Only after 2.2: run `null-tenant-backfill.sql` (idempotent,
      `WHERE tenant_id IS NULL` only; excludes `system_state`, `prospects`). Review NOTICEs, then
      COMMIT. **← Jeff-gated prod DML.**
- [ ] **2.4 (proof)** Run `null-tenant-backfill-verify.sql` **Query B** → must print **`PASS`**
      (0 NULLs across all targets).
- **GATE 2:** Query B = `PASS`. Only a PASS makes enable safe (the enable script re-checks this
  independently). ▢ PASS ▢ FAIL

## Section 3 — Scoped-client dependency status (informational, does NOT block enable)

Enabling RLS is **inert** while these are absent — that's why enable is safe to stage ahead of
them. Record status so it's explicit *when* RLS will actually start enforcing (rollout-plan
Stage 3), and so nobody enables under the false belief it's already load-bearing.

- [ ] **3.1** `SUPABASE_JWT_SECRET` present in prod env? (Currently **absent** — 0 refs in
      `platform/src`.) ▢ present ▢ absent
- [ ] **3.2** Scoped-client (`tenantClient`) path deployed that sets `role=authenticated` + the
      `tenant_id` claim? (Currently **does not exist** — see
      `service-role-to-scoped-client-map.md`.) ▢ deployed ▢ not deployed
- **NOTE:** If **both absent** (expected today) → enabling RLS changes nothing observable; proceed
  to Section 4 as an inert backstop. If **either present** → RLS may become load-bearing on
  cutover; do not enable a tier whose scoped-client cutover isn't itself gated per
  `service-role-to-scoped-client-map.md`.

## Section 4 — The dry run (transaction + ROLLBACK, no commit)

Prove `rls-gap-closure.sql` runs clean and its precondition guard passes, **without** committing.

- [ ] **4.1** Wrap the enable script in an explicit transaction and **`ROLLBACK`** instead of
      `COMMIT`:
      ```
      BEGIN;
      \i rls-gap-closure.sql        -- includes its own precondition guard
      -- observe: guard did NOT abort; all 58 ENABLE + CREATE POLICY statements ran
      ROLLBACK;                      -- discard — this is a dry run only
      ```
- [ ] **4.2** Confirm the script's **precondition guard did not abort** the transaction (it aborts
      before enabling anything if any of the 58 targets is missing, lacks `tenant_id`, or still
      has a NULL `tenant_id`). A clean run to `ROLLBACK` = Sections 1–2 are genuinely satisfied.
- [ ] **4.3** Confirm **no errors** on any `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY`
      statement (e.g. a renamed table, a missing column) — these would surface here, harmlessly,
      inside the rolled-back transaction.
- [ ] **4.4** After `ROLLBACK`, re-run Section 0.1 queries → prod RLS state is **unchanged**
      (proves the dry run left nothing behind).
- **GATE 4:** guard passed, zero statement errors, post-rollback state unchanged. ▢ PASS ▢ FAIL

## Section 5 — Per-tier commit decision (the real enable)

Only reached when Gates 0, 1, 2, 4 all PASS and Jeff approves.

- [ ] **5.1** Decide cadence: all 58 in one `BEGIN…COMMIT`, **or** tier-by-tier by splitting at
      the `-- TIER N` banners (the more conservative gate cadence — recommended). Tier order is
      highest-risk first per `rls-enablement-rollout-plan.md` / `rls-tier-rollout-order.md`.
- [ ] **5.2 (enable, DDL — gated)** Run `rls-gap-closure.sql` for the chosen tier(s). **← Jeff-gated prod DDL, run by the leader.**
- [ ] **5.3 (coverage gate)** Run `rls-gap-closure-verify.sql`: Query A → all target rows
      `rls_enabled = t`, `policy_count >= 1`; Query B → 0 rows; Query C → each `tenant_isolation`
      policy `cmd = ALL`, roles `{authenticated}`, predicate on `tenant_id`.
- [ ] **5.4 (inertness / no-regression gate — the critical one)** As `service_role`,
      `SELECT count(*) FROM clients;` (+ a sample per enabled tier) **must still return ALL rows.**
      If any count drops to 0 or errors while the app is still on `service_role`, something other
      than these inert policies changed — **stop and investigate.**
- **GATE 5:** coverage verified **and** service_role still reads everything. ▢ PASS ▢ FAIL

## One-line gate summary

**Reconcile live (0) → drift resolved (1) → NULLs = PASS (2) → note scoped-client is still
absent so enable is inert (3) → dry-run to ROLLBACK proves guard passes clean (4) → enable
tier-first and prove service_role still reads all (5).** Any FAIL stops the line.

## Method & limitation

This checklist is only as correct as its live gates. It is **derived from the trilogy + migration
files**, not from a prod read; that is exactly why Sections 0, 1, 4, and 5 each end in a live
verify against prod. The dry run (Section 4) is the cheapest place to discover a migration that
never applied, a renamed/dropped target, or an unresolved drift — it surfaces there harmlessly
inside a rolled-back transaction, before any Jeff-gated commit.
