# RLS Pass-4 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 11:39: "continue
backlog 3-deep (FILE-ONLY, migrations authored-not-run). Next 3: RLS-gap
policy proposals / client tenantDb conversions / verify prior fixes green."_

## What this is

Passes 1-3 (`rls-top10-migration-proposal.md`, `rls-next10-migration-proposal.md`,
`rls-pass3-migration-proposal.md`, all same day) covered 30 of the 58 "no RLS
at all" tenant tables found by W5's `rls-coverage-audit.md`
(`flwork-p1-w5/deploy-prep/`). This is **pass 4** — 10 of the remaining 28.

**File:** `platform/src/lib/migrations/2026_07_13_rls_pass4_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## The 10 tables

| Table | Category | Why included |
|---|---|---|
| `management_applications` | hiring | management/virtual-ops job applications, PII (name/email/phone/resume/video) |
| `management_application_drafts` | hiring | in-progress draft of the above, keyed by IP |
| `sales_applications` | hiring | sales-role applications, PII + video |
| `team_applications` | hiring | cleaner/team-member applications, PII |
| `campaigns` | marketing | email/SMS marketing campaign definitions |
| `referrers` | marketing | referral-program participants + payout details (Zelle/Venmo) |
| `google_reviews` | reputation | synced Google Business reviews |
| `reviews` | reputation | internal review-request/collection records |
| `outreach_log` | marketing | per-client outreach-moment dedup log |
| `jobs` | core ops | contracted job records w/ `total_cents` money snapshot |

All 10 verified against their `CREATE TABLE`/`CREATE INDEX` statements (not
assumed) to satisfy the plan's Stage 0 prerequisite: `tenant_id UUID NOT NULL`
with an index that includes it (leading column, not necessarily sole column —
`management_application_drafts` and `outreach_log` satisfy this via a
`UNIQUE (tenant_id, ...)` constraint rather than a plain `CREATE INDEX`, same
as accepted in prior passes). File citations are in the migration's own
header comment.

## Five tables excluded — flagging, not silently dropping

- **`client_referral_stats`** — `tenant_id uuid` is nullable, not `NOT NULL`.
  Fails Stage-0 outright; needs a backfill + `NOT NULL` constraint first.
- **`error_logs`** — `tenant_id uuid REFERENCES tenants(id) ON DELETE SET
  NULL`, explicitly nullable because platform-wide errors with no tenant
  context are a real, intended case. A tenant policy here needs a different
  shape (`tenant_id IS NULL OR tenant_id = ...`) than the rest of this
  series — deferred, needs its own design decision from Jeff.
- **`job_events`** — `tenant_id UUID NOT NULL` but its only index
  (`idx_job_events_job`) covers `job_id`, not `tenant_id` — same Stage-0
  index failure mode passes 2 and 3 flagged for `document_fields` and
  `document_activity`. Needs `CREATE INDEX ... ON job_events(tenant_id)` first.
- **`team_notifications`** — same index failure mode: `tenant_id NOT NULL`
  but only indexed via `team_member_id`.
- **`projects`** — referenced throughout app code but has **no `CREATE
  TABLE`** for that exact name anywhere in `migrations/`,
  `src/lib/migrations/`, or `supabase/`. Same "exists in prod via ad-hoc SQL"
  situation flagged for `booking_cleaners`/`cleaners`/`cleaner_payouts`/
  `member_pin_reset_codes` in pass 3. Needs a live `\d projects` against the
  real DB to confirm schema before it can get a policy.

Same critical caveat as passes 1-3 applies to all 10 here: **service_role
bypasses RLS unconditionally**, so this migration is provably inert on every
current request path — defense-in-depth only, prerequisite groundwork for a
future scoped-JWT client.

## What Jeff needs to do to run this (nothing has been executed)

Same four steps as passes 1-3 (decide JWT-claims shape / accept
`current_setting` as-is → run on sandbox first → verify `service_role` routes
still 200 → promote to prod). Rollback is
`ALTER TABLE … DISABLE ROW LEVEL SECURITY;` per table, no data risk.

**I did not run any of this.** No DDL was executed in any environment.

## Remaining scope not covered

40 of the 58 gap tables are now addressed across the four passes
(10+10+10+10). 18 remain: the 5 flagged above, plus 6 verified-clean
candidates good for **pass 5** — `products`, `quote_templates`,
`recurring_schedules`, `schedule_issues`, `yinez_memory`, `yinez_skills` (all
confirmed `NOT NULL` + tenant_id-covering index during this pass's research)
— and 7 tables not yet individually re-verified this session: `settings`,
`document_fields`, `document_activity` (pass 2/3 findings, still unresolved),
and `booking_cleaners`, `cleaners`, `cleaner_payouts`,
`member_pin_reset_codes` (still no tracked schema). Full list in
`flwork-p1-w5/deploy-prep/rls-coverage-audit.md`.
