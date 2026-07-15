# RLS Cutover Prep — Summary for Jeff/Leader (W2 read-only review)

_Author: worker W2, branch `p1-w2`, 2026-07-15. **Read-only summary — no DDL run, no prod
touched.** Source docs were authored by W5 on branch `p1-w5`, in worktree
`/Users/jefftucker/flwork-p1-w5/deploy-prep/` — **not** in this worktree
(`flwork-p1-w2`). The leader's job pointed at `/Users/jefftucker/fullloopcrm/flwork-p1-w2`,
which doesn't exist; I located the actual source docs by searching
`/Users/jefftucker` for `rls-cutover-master-plan.md` / `rls-coverage-audit.md`. If these
need to land on `main`, they still need to be merged in from `p1-w5` — this file only
summarizes what's there, it does not copy/move anything._

## 1. What's written but unrun

All of the following are **file-only artifacts** — SQL text and runbooks that exist on disk
in the `p1-w5` worktree, none of them applied to prod. Nothing in this list has been executed
by any worker.

| File | Covers | Status |
|---|---|---|
| `rls-gap-closure.sql` | The original 58 "no-RLS at all" tenant tables, Tier 1–5 (enable RLS + add `tenant_isolation` policy) | Written 07-12, unrun |
| `rls-gap-closure-verify.sql` | Post-apply verification (coverage + inertness gates) for the 58-table pass | Written 07-12, unrun |
| `rls-gap-closure-tier6-messaging.sql` | 10 of the 60 "RLS on, but zero policy" tables — messaging/Comhub/Connect text channels | Written 07-13, unrun |
| `rls-gap-closure-tier7-finance-hr.sql` | 10 more — payments/payroll/expenses + most of HR | Written 07-13, unrun |
| `rls-gap-closure-tier8-crm-audit.sql` | 10 more — CRM/deals + audit/AI-memory cluster + deferred HR table | Written 07-13, unrun |
| `rls-gap-closure-tier9-comms.sql` | 10 more — remaining chat/comms (Comhub voice/calling + broadcast/log tables) | Written 07-13, unrun |
| `rls-gap-closure-tier10-cleaner-booking-ops.sql` | 10 more — cleaner/booking-ops + half of marketing/imports | Written 07-13, unrun |
| `rls-gap-closure-tier11-marketing-misc.sql` | Final 10 of the 60 — remainder of marketing/imports + misc (completes the 60-table follow-up set) | Written 07-13, unrun |
| `rls-gap-closure-tenant-owner-messages.sql` | `tenant_owner_messages` — a table with **no migration file at all** in this repo (created out-of-band), found missing from the coverage audit entirely | Written 07-13, unrun, **stricter guard than the others** since its live state is unverified from source |
| `null-tenant-backfill.sql` / `-verify.sql` | NULL-`tenant_id` backfill for the 116 real backfill targets (of 118 flagged) | Written 07-12, unrun |

Every tier6–11 file's header explicitly says **"PREP FILE — DO NOT EXECUTE AS-IS. NOT RUN BY
W5. NOT IN THE APPLIED MIGRATION SEQUENCE."** Same language on the tier1–5 file and the
backfill SQL.

## 2. What tables/policies are covered, in total

Per `rls-coverage-audit.md` (migration-derived, not a live `pg_policies` read — see its own
caveat), of **132 tenant_id tables**:

- **58** have RLS off entirely → target of `rls-gap-closure.sql` (Tier 1–5)
- **60** have RLS on but zero policy (default-deny for non-service roles, no positive tenant
  rule) → target of the tier6–11 follow-up files
- **11** have RLS on with a deny-all stub (defense-in-depth, not tenant-scoped) → not targeted
- **2** are intentionally public-read (`territories`, `territory_claims`) → not targeted
- **1** (`onboarding_tasks`) already has a genuine tenant-scoped policy, but SELECT-only, no
  `WITH CHECK` — writes are unguarded at the DB layer even there
- **1 more found outside the audit** (`tenant_owner_messages`) — has `tenant_id`, live prod
  traffic, but no tracked migration and not in the 132-table matrix at all; unknown live state

So between the 58 + 60 + 1 blind-spot table, **119 tables** have a prepared-but-unrun policy
in the files above. The proposed policy shape throughout: `ENABLE ROW LEVEL SECURITY` +
`CREATE POLICY tenant_isolation FOR ALL TO authenticated USING (tenant_id =
(auth.jwt()->>'tenant_id')::uuid) WITH CHECK (same)`.

**Critical context that governs everything above:** all of this is currently **inert**.
Every server query today runs on `supabaseAdmin` (`service_role`), which bypasses RLS by
design. Enabling any of these policies changes nothing observable until a table's call sites
are converted to the new `tenantClient()` (scoped JWT client, built and tested but not wired
— see Stage A/B below). That's *why* it's judged safe to stage ahead of the app.

## 3. The 4-stage plan and what's safe to turn on first

`rls-cutover-master-plan.md` sequences everything into stages A→D. Only one is done, three are
gated prod actions:

- **Stage A — Adopt tenant-client: ✅ DONE, unwired.** `platform/src/lib/tenant-client.ts`
  exists, is unit-tested (17 passing tests incl. cross-tenant rejection and claim-injection
  resistance), and is committed. It mints a scoped JWT but **fails closed** without
  `SUPABASE_JWT_SECRET`, so nothing can use it yet. No prod action needed for this stage —
  it's already file-safe.
- **Stage B — Wire `SUPABASE_JWT_SECRET`: gated (env + deploy).** Requires pulling the
  **existing** Supabase JWT secret from the dashboard (not a new secret), setting it in
  Production/Preview/Development Vercel env as Sensitive, adding a startup presence check, and
  running a smoke test (scoped read returns owner's rows, cross-tenant read returns `[]`).
- **Stage C — Enable RLS per tier: gated (prod DDL), but provably inert.** This is the
  `rls-gap-closure*.sql` files above. Because `service_role` bypasses RLS, this stage is safe
  to run **before** Stage B — enabling policies changes nothing while the app is still on
  `service_role`.
- **Stage D — Cutover per table: gated, this is where enforcement starts.** Requires BOTH B
  done and the table's C done, plus converting call sites off `service_role`.

**What's safe to turn on first, per the master plan:** Stage C, Tier 1 of `rls-gap-closure.sql`
— the 8 highest-PII/financial tables (`clients`, `bookings`, `invoices`, `bank_accounts`,
`bank_transactions`, `documents`, `sms_conversations`, `sms_conversation_messages`) — **but
only after its hard precondition passes**:

1. `null-tenant-backfill-verify.sql` Query B prints `PASS` (0 NULLs across the 116 real backfill
   targets — the audit found only 3 nullable tables in the whole 118-table flagged set, 1 of
   which, `client_referral_stats`, is the actual backfill target).
2. `schema-drift-register.md` resolved for the tier (it flags e.g. `clients.status` as
   **PHANTOM** — that column doesn't exist; don't build a policy or query against it).
3. A transaction+ROLLBACK dry run (`rls-enablement-dry-run-checklist.md` §4) proving
   `rls-gap-closure.sql`'s own precondition guard aborts cleanly with zero NULL `tenant_id`
   rows left, before any real commit.

After Tier 1 commits, the two verify gates are: **2a coverage** (every target shows
`rls_enabled=t`, `policy_count≥1`) and **2b inertness** (as `service_role`, `SELECT count(*)`
still returns every row — if any count drops, something is wrong and the rollout stops). Only
then advance to Tier 2–5, then the tier6–11 follow-up set (lower urgency — those 60 tables
already have RLS on, just no policy, so they're not "wide open," just "toothless").

Rollback at any point is behavior-neutral: `DROP POLICY tenant_isolation ON <table>; ALTER
TABLE <table> DISABLE ROW LEVEL SECURITY;` — safe because everything is inert while
`service_role` is still in use.

## 4. Risk notes

- **`tenant_owner_messages` is a live-traffic blind spot.** It carries `tenant_id`, is read/
  written on nearly every request through `/api/admin/tenant-chats`, `/api/dashboard/messages`,
  and `src/lib/jefe/actions.ts`, but has **zero migration file** in this repo — it was created
  out-of-band. Its RLS/policy state cannot be verified from source at all. Its prep file has a
  stricter guard than tier6–11 for that reason, but even that guard "cannot substitute for
  reading `pg_policies`/`pg_tables` live first" per its own header. This is the single
  highest-uncertainty item in the whole set.
- **The audit is migration-derived, not a live read.** `rls-coverage-audit.md` says explicitly
  it is not authoritative for prod — a migration enabling RLS may not have been applied, a
  table may have been renamed/dropped, or prod may carry ad-hoc RLS state that never landed in
  a tracked migration (exactly the `tenant_owner_messages` case). The doc includes the
  `pg_policies`/`pg_class` verification SQL to run live before trusting any of this — that has
  not been run.
- **A prior "15 gap tables" reference could not be located.** W5's audit says it searched for a
  document naming "15 gap tables" (referenced in an earlier leader order) and found nothing —
  the closest matches are the 4-table deny-stub set and a 7-table prod sample in
  `tenant-isolation-rls-plan.md`. The audit treats its own 58-table full set as superseding
  that unlocated reference, but flags the discrepancy as unresolved.
- **`onboarding_tasks`, the one "working" policy, has no `WITH CHECK`.** Even the sole
  enforceable tenant policy in the whole codebase is SELECT-only — writes to that table are
  unguarded at the DB layer today.
- **`system_state` and `prospects` must NOT get a tenant policy** despite being flagged —
  their nullable `tenant_id` is semantically valid (global config / not-yet-converted pointer,
  respectively). Applying the standard policy to either would silently break legitimate
  cross-tenant or NULL-state rows. `rls-gap-closure.sql`'s precondition guard is what's
  supposed to catch this, but it's worth a manual double-check before Tier 5 / the tier10-11
  follow-up runs.
- **Runtime constraint on Stage D:** `tenant-client.ts` signs JWTs with Node's `crypto`
  module, not `jose`, so it is **Node-runtime only**. Any route running on the Edge runtime
  cannot be converted until that's swapped.
- **This entire file inherits W5's own caveat:** everything above is what the *files on disk*
  say, not a live prod check. Before Jeff approves Tier 1, the live verification SQL in
  `rls-coverage-audit.md` and the dry-run + ROLLBACK in `rls-enablement-dry-run-checklist.md`
  still need to actually be run against prod by the leader.
