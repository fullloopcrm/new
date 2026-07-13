# RLS Pass-7 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 12:12: "continue
backlog 3-deep (FILE-ONLY, migrations authored-not-run). Next 3 RLS-gap
proposals + client tenantDb + verify green."_

## What this is

Pass 6 closed 3 of its 12 remaining candidates and explicitly deferred
`client_referral_stats`, saying its nullable `tenant_id` "needs its own
review of what a NULL tenant_id row there actually means before copying
[error_logs'] shape." This pass does that review and closes it.

**File:** `platform/src/lib/migrations/2026_07_13_rls_pass7_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## The review

`client_referral_stats` (`010_nycmaid_parity_columns_2.sql:22-30`) has a
nullable `tenant_id` with no `NOT NULL`, no default, and **no index of any
kind**. Unlike `error_logs`, which has a real documented platform-wide-error
use case, I grepped `client_referral_stats` across `platform/src/**/*.ts`
(excluding tests and migration files) and got **zero hits** — no route
reads it, no route writes it, no cron populates it. The migration comment
that created it calls it a "missing stats table" for NYC Maid parity that
was apparently never wired up.

Conclusion: the nullable `tenant_id` is not a real semantic like
`error_logs`' platform-wide rows — it's a latent schema gap on a currently
dead table. Reusing `error_logs`' "`tenant_id IS NULL OR =`" policy shape
here would be actively wrong: it would silently permit some future buggy
insert to write an orphaned, tenant-less row that every tenant's RLS-scoped
client could then read. The correct fix mirrors `job_events`/
`team_notifications` from pass 6 — tighten the prerequisite, then use the
standard equality policy — except here the prerequisite is a `NOT NULL`
constraint (not just an index), and both the constraint and the index are
missing.

## What the migration does

1. **Step A:** `ALTER TABLE client_referral_stats ALTER COLUMN tenant_id SET
   NOT NULL` + `CREATE INDEX IF NOT EXISTS idx_client_referral_stats_tenant`.
   The `NOT NULL` will fail loudly (not silently corrupt data) if any NULL
   rows exist in prod today — fail-closed is correct here since I have not
   verified the live row count.
2. **Step B:** standard `tenant_isolation` equality policy, same shape as
   passes 1-5.

Same critical caveat as passes 1-6: **service_role bypasses RLS
unconditionally**, so this migration is provably inert on every current
request path — doubly so here since nothing calls this table at all today.

## What Jeff needs to do to run this (nothing has been executed)

1. Confirm on prod: `SELECT count(*) FROM client_referral_stats WHERE
   tenant_id IS NULL` — expected 0 given zero code references. If nonzero,
   decide backfill vs. delete before Step A can succeed.
2. Run Step A on sandbox first.
3. Run Step B once Step A is confirmed.
4. Verify service_role routes still 200 (trivially true — nothing calls this
   table).
5. Promote to prod, or fold into a future migration that actually wires this
   table up (out of scope here).

Rollback: `ALTER TABLE client_referral_stats ALTER COLUMN tenant_id DROP NOT
NULL`, `DROP INDEX idx_client_referral_stats_tenant`, `ALTER TABLE …
DISABLE ROW LEVEL SECURITY`. No data risk either direction — table is
unreferenced by any live code path.

**I did not run any of this. No DDL was executed in any environment.**

## Remaining scope not covered

46 (passes 1-5) + 3 (pass 6) + 1 (this pass) = 50/58. 8 remain, all blocked
on the same thing — a live prod schema read, not another in-repo audit:

- **`projects`** — no `CREATE TABLE` found anywhere in the repo.
- **`settings`, `document_fields`, `document_activity`** — pass 2/3
  findings, still unresolved.
- **`booking_cleaners`, `cleaners`, `cleaner_payouts`,
  `member_pin_reset_codes`** — still no tracked schema ("exists in prod via
  ad-hoc SQL" situation, same as `projects`).

Pass-8's actionable step is a `\d` against the real DB for these 8 (someone
with prod access), not another file-only pass — every angle available from
what's committed to the repo has now been exhausted across 7 passes.

Full list in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md`.
