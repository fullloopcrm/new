# RLS Pass-6 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 12:01: "continue
backlog 3-deep (FILE-ONLY, migrations authored-not-run). Next 3 RLS-gap
proposals + client tenantDb + verify fixes green."_

## What this is

Pass 5 (`rls-pass5-migration-proposal.md`) covered 46 of the 58 "no RLS at
all" tenant tables and was explicit that the remaining 12 have **no clean
pass-6 policy candidate** — every one is blocked on a schema prerequisite
(missing index, nullable `tenant_id`, or no tracked `CREATE TABLE` at all),
not on policy authoring. This pass is honest about that: it does the
schema-fix groundwork for the 3 of the 12 that are actually fixable without a
live prod `\d` or a data backfill, then adds their policies in the same
file.

**File:** `platform/src/lib/migrations/2026_07_13_rls_pass6_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## The 3 tables

| Table | Blocker | Fix in this migration |
|---|---|---|
| `job_events` | `tenant_id NOT NULL` but no index covers it | Step A: `CREATE INDEX idx_job_events_tenant` |
| `team_notifications` | same — `tenant_id NOT NULL`, no covering index | Step A: `CREATE INDEX idx_team_notifications_tenant` |
| `error_logs` | `tenant_id` intentionally **nullable** (platform-wide errors) | Different policy shape: `tenant_id IS NULL OR tenant_id = current_setting(...)` instead of a plain equality check |

`job_events` and `team_notifications` both had their `tenant_id NOT NULL`
constraint verified against `CREATE TABLE` (not assumed) — file/line
citations are in the migration header. Both are high-write tables (job
timeline events, team notification inserts), so I flagged in the migration
comment that prod may prefer `CREATE INDEX CONCURRENTLY` over the plain form
below to avoid lock contention — that's Jeff's call at run time, not
something I changed the file to force.

`error_logs` didn't need an index fix — `idx_error_logs_tenant(tenant_id,
created_at DESC)` already exists (006_error_resilience.sql:38). Its blocker
was purely semantic: a naive `tenant_id = current_setting(...)` policy would
silently wall off every platform-wide (NULL tenant_id) error row, hiding
exactly the errors an on-call engineer needs visibility into. The proposed
policy allows `tenant_id IS NULL` through unconditionally on both `USING`
and `WITH CHECK`.

Same critical caveat as passes 1-5 applies: **service_role bypasses RLS
unconditionally**, so this migration is provably inert on every current
request path — defense-in-depth only, prerequisite groundwork for a future
scoped-JWT client.

## What Jeff needs to do to run this (nothing has been executed)

1. Decide the JWT-claims shape (same open question carried from passes 1-5).
2. Run **Step A only** (the two `CREATE INDEX` statements) on sandbox first;
   consider `CONCURRENTLY` in prod given write volume on these two tables.
3. Run **Step B** (the policies) once Step A is confirmed.
4. Verify `service_role` routes still 200.
5. Promote to prod.

Rollback: `DROP INDEX idx_job_events_tenant` / `idx_team_notifications_tenant`
and `ALTER TABLE … DISABLE ROW LEVEL SECURITY` per table. No data risk either
direction — no rows are altered, only indexes and RLS policies.

**I did not run any of this.** No DDL was executed in any environment.

## Remaining scope not covered

46 (passes 1-5) + 3 (this pass) = 49/58. 9 remain, still blocked:

- **`client_referral_stats`** — `tenant_id` also nullable, but I did NOT
  reuse the `error_logs` nullable-policy shape here without checking what a
  NULL `tenant_id` row on that table actually means first — `error_logs`'
  platform-wide-error semantics are well-documented (severity/route/user_id
  columns with no tenant scope by design); `client_referral_stats` needs that
  same review before assuming the same shape applies. Next actionable step,
  not done this pass.
- **`projects`** — no `CREATE TABLE` found anywhere in the repo; needs a live
  `\d projects` against the real DB before it can get an index or a policy.
- **`settings`, `document_fields`, `document_activity`** — pass 2/3 findings,
  still unresolved.
- **`booking_cleaners`, `cleaners`, `cleaner_payouts`,
  `member_pin_reset_codes`** — still no tracked schema (same "exists in prod
  via ad-hoc SQL" situation as `projects`).

Full list in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md`. The next
actionable pass-7 step is either a live prod schema read (`projects` +
the no-tracked-schema cluster) or a semantic review of
`client_referral_stats`' NULL case — not another mechanical index/policy
pass like this one.
