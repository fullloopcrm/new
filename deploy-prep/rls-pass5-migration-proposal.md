# RLS Pass-5 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 11:54: "continue
backlog 3-deep (FILE-ONLY, migrations authored-not-run). Next 3: RLS-gap
policy proposals / client tenantDb conversions / verify prior fixes green."_

## What this is

Passes 1-4 (`rls-top10-migration-proposal.md`, `rls-next10-migration-proposal.md`,
`rls-pass3-migration-proposal.md`, `rls-pass4-migration-proposal.md`) covered
40 of the 58 "no RLS at all" tenant tables found by W5's
`rls-coverage-audit.md` (`flwork-p1-w5/deploy-prep/`). This is **pass 5** — the
6 tables pass 4 named as "verified-clean candidates for pass 5" but did not
itself cover or source.

**File:** `platform/src/lib/migrations/2026_07_13_rls_pass5_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## The 6 tables

| Table | Category | Why included |
|---|---|---|
| `products` | catalog | per-tenant goods/add-ons (2026-07-03 catalog fork) |
| `quote_templates` | sales | reusable quote line-item/pricing templates |
| `recurring_schedules` | scheduling | parent record for recurring booking series |
| `schedule_issues` | scheduling | conflict/gap alerts surfaced to the dashboard |
| `yinez_memory` | AI agent | Yinez's per-client/tenant long-term memory rows |
| `yinez_skills` | AI agent | tenant-authored custom skills for the Yinez agent |

All 6 re-verified against their `CREATE TABLE`/`CREATE INDEX` statements (not
assumed) to satisfy the plan's Stage 0 prerequisite: `tenant_id UUID NOT NULL`
with an index that includes it (leading column). Pass 4 only searched
`src/lib/migrations/` and `supabase/` when sourcing its "remaining scope"
list — `products` and both `yinez_*` tables actually live in the repo-root
`migrations/` directory, which is why pass 4 could name them as candidates
but not cite file/line. `yinez_skills` satisfies Stage 0 via `UNIQUE
(tenant_id, name)` (leading column tenant_id) rather than a plain `CREATE
INDEX`, same acceptance pattern used for `management_application_drafts` and
`outreach_log` in pass 4. File citations are in the migration's own header
comment.

Same critical caveat as passes 1-4 applies to all 6 here: **service_role
bypasses RLS unconditionally**, so this migration is provably inert on every
current request path — defense-in-depth only, prerequisite groundwork for a
future scoped-JWT client.

## What Jeff needs to do to run this (nothing has been executed)

Same four steps as passes 1-4 (decide JWT-claims shape / accept
`current_setting` as-is → run on sandbox first → verify `service_role` routes
still 200 → promote to prod). Rollback is
`ALTER TABLE … DISABLE ROW LEVEL SECURITY;` per table, no data risk.

**I did not run any of this.** No DDL was executed in any environment.

## Remaining scope not covered

46 of the 58 gap tables are now addressed across the five passes
(10+10+10+10+6). 12 remain, all still blocked on the same prerequisites pass 4
flagged — nothing new resolved this pass:

- **`client_referral_stats`** — `tenant_id` nullable, fails Stage-0.
- **`error_logs`** — intentionally nullable (platform-wide errors), needs a
  different policy shape (`tenant_id IS NULL OR tenant_id = ...`).
- **`job_events`**, **`team_notifications`** — `tenant_id NOT NULL` but no
  index covers it; need a new `CREATE INDEX` first.
- **`projects`** — no `CREATE TABLE` found anywhere in the repo; needs a live
  `\d projects` against the real DB before it can get a policy.
- **`settings`, `document_fields`, `document_activity`** — pass 2/3 findings,
  still unresolved.
- **`booking_cleaners`, `cleaners`, `cleaner_payouts`,
  `member_pin_reset_codes`** — still no tracked schema (same "exists in prod
  via ad-hoc SQL" situation as `projects`).

Full list in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md`. None of these
12 have a clean Stage-0 path yet, so there is no pass-6 candidate list from
this session's research — the next actionable step for any of them is a
schema/index fix (index add, NOT NULL backfill, or a live `\d` against prod),
not another policy-authoring pass.
